import { Hono } from "hono";
import { cors } from "hono/cors";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { AppConfig } from "../config.js";
import { APP_NAME, APP_VERSION, getLanIp } from "../config.js";
import type { AuthService } from "../services/auth.js";
import { SessionStore } from "../services/session-store.js";
import { FileStore } from "../services/file-store.js";
import { wsHub } from "../services/ws-hub.js";
import { lanOnlyMiddleware, createAuthMiddleware } from "../middleware/auth.js";
import {
  JoinSessionRequestSchema,
  PrepareUploadRequestSchema,
} from "@transfer-file/shared";

export interface AppDeps {
  config: AppConfig;
  auth: AuthService;
  sessions: SessionStore;
  tlsFingerprint: string;
}

export function createApp(deps: AppDeps) {
  const { config, auth, sessions, tlsFingerprint } = deps;
  const app = new Hono();

  app.use("*", cors({ origin: "*", credentials: true }));
  app.use("/api/*", lanOnlyMiddleware(config));

  const hostAuth = createAuthMiddleware(auth, "host");
  const anyAuth = createAuthMiddleware(auth);
  const receiverAuth = createAuthMiddleware(auth, "receiver");

  app.get("/api/health", (c) => {
    return c.json({
      ok: true as const,
      name: APP_NAME,
      version: APP_VERSION,
      lanIp: getLanIp(),
      port: config.port,
      fingerprint: tlsFingerprint,
    });
  });

  app.post("/api/session", async (c) => {
    const existing = sessions.get();
    if (existing) {
      const sessionDir = path.join(
        config.dataDir,
        "sessions",
        existing.info.id,
      );
      await FileStore.wipeSessionDir(sessionDir);
      sessions.end();
    }

    const session = sessions.create(config.sessionTtlMs);
    const lanIp = getLanIp();
    const baseUrl = `https://${lanIp}:${config.port}`;
    const token = await auth.issueToken(
      session.info.id,
      "host",
      session.hostTokenId,
      config.sessionTtlMs,
    );

    return c.json({
      session: session.info,
      token,
      lanUrl: baseUrl,
      joinUrl: `${baseUrl}/join`,
    });
  });

  app.get("/api/session", hostAuth, (c) => {
    const session = sessions.get();
    if (!session) {
      return c.json({ error: "No active session", code: "NO_SESSION" }, 404);
    }
    return c.json({ session: session.info });
  });

  app.post("/api/session/join", async (c) => {
    const body = await c.req.json();
    const parsed = JoinSessionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid PIN format", code: "INVALID_PIN" }, 400);
    }

    const session = sessions.get();
    if (!session) {
      return c.json({ error: "No active session", code: "NO_SESSION" }, 404);
    }

    if (!sessions.verifyPin(parsed.data.pin)) {
      return c.json({ error: "Wrong PIN", code: "WRONG_PIN" }, 401);
    }

    sessions.markReceiverJoined();
    const token = await auth.issueToken(
      session.info.id,
      "receiver",
      `receiver-${session.info.id}`,
      config.sessionTtlMs,
    );

    wsHub.broadcast({
      type: "receiver_joined",
      sessionId: session.info.id,
    });

    return c.json({
      sessionId: session.info.id,
      token,
      role: "receiver" as const,
    });
  });

  app.delete("/api/session", hostAuth, async (c) => {
    const session = sessions.end();
    if (session) {
      const sessionDir = path.join(
        config.dataDir,
        "sessions",
        session.info.id,
      );
      await FileStore.wipeSessionDir(sessionDir);
      wsHub.broadcast({
        type: "session_ended",
        sessionId: session.info.id,
      });
    }
    return c.json({ ok: true });
  });

  app.get("/api/files", anyAuth, (c) => {
    const session = sessions.get();
    if (!session) {
      return c.json({ error: "No active session", code: "NO_SESSION" }, 404);
    }

    const files = [...session.files.values()].map((f) => {
      const { diskPath: _d, ...meta } = f;
      return meta;
    });

    return c.json({ files });
  });

  app.post("/api/upload/prepare", hostAuth, async (c) => {
    const session = sessions.get();
    if (!session) {
      return c.json({ error: "No active session", code: "NO_SESSION" }, 404);
    }

    if (session.files.size >= config.maxFilesPerSession) {
      return c.json({ error: "File limit reached", code: "FILE_LIMIT" }, 400);
    }

    const body = await c.req.json();
    const parsed = PrepareUploadRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid upload metadata", code: "INVALID_META" }, 400);
    }

    if (parsed.data.size > config.maxFileSizeBytes) {
      return c.json({ error: "File too large", code: "FILE_TOO_LARGE" }, 400);
    }

    const store = FileStore.forSession(config.dataDir, session.info.id);
    const stored = store.createPending(
      parsed.data.name,
      parsed.data.size,
      parsed.data.mimeType,
    );
    session.files.set(stored.id, stored);

    const meta = store.toMeta(stored);
    wsHub.broadcast({ type: "file_added", file: meta });

    return c.json({ file: meta });
  });

  app.put("/api/upload/:fileId", hostAuth, async (c) => {
    const session = sessions.get();
    if (!session) {
      return c.json({ error: "No active session", code: "NO_SESSION" }, 404);
    }

    const fileId = c.req.param("fileId");
    if (!fileId) {
      return c.json({ error: "Missing fileId", code: "BAD_REQUEST" }, 400);
    }
    const file = session.files.get(fileId);
    if (!file) {
      return c.json({ error: "File not found", code: "NOT_FOUND" }, 404);
    }

    const contentRange = c.req.header("content-range");
    let offset = file.uploadedBytes;

    if (contentRange) {
      const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange);
      if (!match) {
        return c.json({ error: "Invalid Content-Range", code: "BAD_RANGE" }, 400);
      }
      offset = Number(match[1]);
      const total = Number(match[3]);
      if (total !== file.size) {
        return c.json({ error: "Size mismatch", code: "SIZE_MISMATCH" }, 400);
      }
    }

    const body = await c.req.arrayBuffer();
    const buffer = Buffer.from(body);

    const store = FileStore.forSession(config.dataDir, session.info.id);
    const updated = await store.writeChunk(file, buffer, offset);
    session.files.set(fileId, updated);

    wsHub.broadcast({
      type: "file_progress",
      fileId: updated.id,
      uploadedBytes: updated.uploadedBytes,
      totalBytes: updated.size,
    });

    if (updated.status === "ready") {
      wsHub.broadcast({ type: "file_ready", file: store.toMeta(updated) });
    }

    return c.json({ file: store.toMeta(updated) });
  });

  app.get("/api/download/:fileId", receiverAuth, async (c) => {
    const session = sessions.get();
    if (!session) {
      return c.json({ error: "No active session", code: "NO_SESSION" }, 404);
    }

    const fileId = c.req.param("fileId");
    if (!fileId) {
      return c.json({ error: "Missing fileId", code: "BAD_REQUEST" }, 400);
    }
    const file = session.files.get(fileId);
    if (!file || file.status !== "ready") {
      return c.json({ error: "File not ready", code: "NOT_READY" }, 404);
    }

    const store = FileStore.forSession(config.dataDir, session.info.id);
    const nodeStream = store.getReadStream(file);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new Response(webStream, {
      headers: {
        "Content-Type": file.mimeType ?? "application/octet-stream",
        "Content-Length": String(file.size),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
      },
    });
  });

  return app;
}

export function serveStatic(app: Hono, webDistDir: string): void {
  if (!fs.existsSync(webDistDir)) return;

  app.get("*", async (c) => {
    const url = new URL(c.req.url);
    let filePath = path.join(webDistDir, url.pathname);

    if (url.pathname === "/" || !path.extname(url.pathname)) {
      filePath = path.join(webDistDir, "index.html");
    }

    if (!fs.existsSync(filePath)) {
      filePath = path.join(webDistDir, "index.html");
    }

    const content = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath);
    const types: Record<string, string> = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".ico": "image/x-icon",
    };

    return new Response(content, {
      headers: { "Content-Type": types[ext] ?? "application/octet-stream" },
    });
  });
}
