import { CHUNK_SIZE_BYTES } from "@transfer-file/shared";
import type {
  CreateSessionResponse,
  FileListResponse,
  FileMeta,
  JoinSessionResponse,
  PrepareUploadResponse,
  SessionStorageResponse,
  WipeSessionStorageResponse,
  WsEvent,
} from "@transfer-file/shared";

const TOKEN_KEY = "transfer-file-token";
const ROLE_KEY = "transfer-file-role";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRole(): "host" | "receiver" | null {
  const role = localStorage.getItem(ROLE_KEY);
  if (role === "host" || role === "receiver") return role;
  return null;
}

export function storeSession(token: string, role: "host" | "receiver"): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

function handleAuthFailure(code: string | undefined): void {
  if (code === "SESSION_ENDED" || code === "BAD_TOKEN") {
    clearSession();
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
    };
    if (res.status === 401) {
      handleAuthFailure(err.code);
    }
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function createSession(): Promise<CreateSessionResponse> {
  const data = await apiFetch<CreateSessionResponse>("/api/session", {
    method: "POST",
  });
  storeSession(data.token, "host");
  return data;
}

export async function joinSession(pin: string): Promise<JoinSessionResponse> {
  const data = await apiFetch<JoinSessionResponse>("/api/session/join", {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
  storeSession(data.token, "receiver");
  return data;
}

export async function listFiles(): Promise<FileMeta[]> {
  const data = await apiFetch<FileListResponse>("/api/files");
  return data.files;
}

export async function endSession(): Promise<void> {
  await apiFetch("/api/session", { method: "DELETE" });
  clearSession();
}

export async function getSessionStorage(): Promise<SessionStorageResponse> {
  return apiFetch<SessionStorageResponse>("/api/sessions/storage");
}

export async function wipeAllSessionStorage(): Promise<WipeSessionStorageResponse> {
  const data = await apiFetch<WipeSessionStorageResponse>(
    "/api/sessions/storage",
    { method: "DELETE" },
  );
  clearSession();
  return data;
}

export async function uploadFile(
  file: File,
  onProgress: (uploaded: number, total: number) => void,
): Promise<FileMeta> {
  const prepared = await apiFetch<PrepareUploadResponse>("/api/upload/prepare", {
    method: "POST",
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      mimeType: file.type || undefined,
    }),
  });

  let offset = 0;
  const fileId = prepared.file.id;

  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_SIZE_BYTES, file.size);
    const chunk = file.slice(offset, end);

    const updated = await apiFetch<{ file: FileMeta }>(
      `/api/upload/${fileId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Range": `bytes ${offset}-${end - 1}/${file.size}`,
        },
        body: chunk,
      },
    );

    offset = end;
    onProgress(offset, file.size);

    if (updated.file.status === "ready") {
      return updated.file;
    }

    // Backpressure: yield to event loop between chunks
    await yieldToEventLoop();
  }

  const files = await listFiles();
  const done = files.find((f) => f.id === fileId);
  if (!done) throw new Error("Upload completed but file not found");
  return done;
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function downloadFile(
  file: FileMeta,
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  const token = getStoredToken();
  const res = await fetch(`/api/download/${file.id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
    };
    if (res.status === 401) {
      handleAuthFailure(err.code);
    }
    throw new Error(err.error ?? "Download failed");
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      onProgress?.(loaded, file.size);
    }
  }

  const blob = new Blob(chunks as BlobPart[], {
    type: file.mimeType ?? "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function connectWebSocket(onEvent: (event: WsEvent) => void): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onmessage = (msg) => {
    try {
      const event = JSON.parse(msg.data as string) as WsEvent;
      onEvent(event);
    } catch {
      // ignore malformed messages
    }
  };

  return ws;
}

export function isLocalhost(): boolean {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}
