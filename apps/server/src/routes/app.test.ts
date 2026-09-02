import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createApp } from "../routes/app.js";
import { AuthService } from "../services/auth.js";
import { SessionStore } from "../services/session-store.js";
import type { AppConfig } from "../config.js";

function makeConfig(dataDir: string): AppConfig {
  return {
    port: 8787,
    host: "127.0.0.1",
    strictLan: false,
    dataDir,
    certDir: path.join(dataDir, "certs"),
    webDistDir: path.join(dataDir, "web"),
    jwtSecret: "test-secret-minimum-32-characters-long",
    sessionTtlMs: 60_000,
    maxFileSizeBytes: 50 * 1024 * 1024,
    maxFilesPerSession: 10,
  };
}

async function createHostSession(app: ReturnType<typeof createApp>) {
  const createRes = await app.request("/api/session", { method: "POST" });
  assert.equal(createRes.status, 200);
  return (await createRes.json()) as {
    token: string;
    session: { pin: string };
  };
}

async function joinAsReceiver(
  app: ReturnType<typeof createApp>,
  pin: string,
) {
  const joinRes = await app.request("/api/session/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  assert.equal(joinRes.status, 200);
  return (await joinRes.json()) as { token: string; role: string };
}

describe("API integration", () => {
  let tmpDir: string;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "transfer-api-"));
    const config = makeConfig(tmpDir);
    const auth = new AuthService(config.jwtSecret);
    const sessions = new SessionStore();
    app = createApp({
      config,
      auth,
      sessions,
      tlsFingerprint: "abc123",
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates host session and rejects wrong PIN", async () => {
    const created = await createHostSession(app);

    const wrongJoin = await app.request("/api/session/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "000000" }),
    });
    assert.equal(wrongJoin.status, 401);

    const joined = await joinAsReceiver(app, created.session.pin);
    assert.equal(joined.role, "receiver");
  });

  it("uploads file as host and lists files", async () => {
    const { token } = await createHostSession(app);

    const prepareRes = await app.request("/api/upload/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: "hello.txt", size: 5 }),
    });
    assert.equal(prepareRes.status, 200);
    const { file } = (await prepareRes.json()) as {
      file: { id: string; uploadedBy: string };
    };
    assert.equal(file.uploadedBy, "host");

    const uploadRes = await app.request(`/api/upload/${file.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "Content-Range": "bytes 0-4/5",
      },
      body: "hello",
    });
    assert.equal(uploadRes.status, 200);
    const uploaded = (await uploadRes.json()) as {
      file: { status: string; uploadedBytes: number };
    };
    assert.equal(uploaded.file.status, "ready");
    assert.equal(uploaded.file.uploadedBytes, 5);

    const listRes = await app.request("/api/files", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = (await listRes.json()) as { files: unknown[] };
    assert.equal(list.files.length, 1);
  });

  it("allows receiver to upload with uploadedBy receiver", async () => {
    const created = await createHostSession(app);
    const joined = await joinAsReceiver(app, created.session.pin);

    const prepareRes = await app.request("/api/upload/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${joined.token}`,
      },
      body: JSON.stringify({ name: "photo.jpg", size: 5 }),
    });
    assert.equal(prepareRes.status, 200);
    const { file } = (await prepareRes.json()) as {
      file: { id: string; uploadedBy: string };
    };
    assert.equal(file.uploadedBy, "receiver");

    const uploadRes = await app.request(`/api/upload/${file.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${joined.token}`,
        "Content-Type": "application/octet-stream",
        "Content-Range": "bytes 0-4/5",
      },
      body: "photo",
    });
    assert.equal(uploadRes.status, 200);
  });

  it("allows host to download receiver-uploaded file", async () => {
    const created = await createHostSession(app);
    const joined = await joinAsReceiver(app, created.session.pin);

    const prepareRes = await app.request("/api/upload/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${joined.token}`,
      },
      body: JSON.stringify({ name: "from-phone.txt", size: 5 }),
    });
    const { file } = (await prepareRes.json()) as { file: { id: string } };

    await app.request(`/api/upload/${file.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${joined.token}`,
        "Content-Type": "application/octet-stream",
        "Content-Range": "bytes 0-4/5",
      },
      body: "phone",
    });

    const downloadRes = await app.request(`/api/download/${file.id}`, {
      headers: { Authorization: `Bearer ${created.token}` },
    });
    assert.equal(downloadRes.status, 200);
    const body = await downloadRes.text();
    assert.equal(body, "phone");
  });

  it("invalidates receiver JWT after session end", async () => {
    const created = await createHostSession(app);
    const joined = await joinAsReceiver(app, created.session.pin);

    const endRes = await app.request("/api/session", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${created.token}` },
    });
    assert.equal(endRes.status, 200);

    const listRes = await app.request("/api/files", {
      headers: { Authorization: `Bearer ${joined.token}` },
    });
    assert.equal(listRes.status, 401);
    const err = (await listRes.json()) as { code: string };
    assert.equal(err.code, "SESSION_ENDED");
  });

  it("invalidates old receiver JWT after new session created", async () => {
    const created = await createHostSession(app);
    const joined = await joinAsReceiver(app, created.session.pin);

    await app.request("/api/session", { method: "POST" });

    const listRes = await app.request("/api/files", {
      headers: { Authorization: `Bearer ${joined.token}` },
    });
    assert.equal(listRes.status, 401);
    const err = (await listRes.json()) as { code: string };
    assert.equal(err.code, "SESSION_ENDED");
  });

  it("returns session storage summary for host", async () => {
    const created = await createHostSession(app);

    await app.request("/api/upload/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${created.token}`,
      },
      body: JSON.stringify({ name: "disk-test.txt", size: 4 }),
    });

    const storageRes = await app.request("/api/sessions/storage", {
      headers: { Authorization: `Bearer ${created.token}` },
    });
    assert.equal(storageRes.status, 200);
    const storage = (await storageRes.json()) as {
      activeSession: { id: string } | null;
      diskSessions: Array<{ isActive: boolean }>;
    };
    assert.ok(storage.activeSession);
    assert.equal(storage.diskSessions.length, 1);
    assert.equal(storage.diskSessions[0]?.isActive, true);
  });

  it("wipes all session storage and invalidates tokens", async () => {
    const created = await createHostSession(app);
    const joined = await joinAsReceiver(app, created.session.pin);

    const wipeRes = await app.request("/api/sessions/storage", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${created.token}` },
    });
    assert.equal(wipeRes.status, 200);
    const wiped = (await wipeRes.json()) as { ok: boolean; removedCount: number };
    assert.equal(wiped.ok, true);

    const listRes = await app.request("/api/files", {
      headers: { Authorization: `Bearer ${joined.token}` },
    });
    assert.equal(listRes.status, 401);

    const storageRes = await app.request("/api/sessions/storage", {
      headers: { Authorization: `Bearer ${created.token}` },
    });
    assert.equal(storageRes.status, 401);
  });
});
