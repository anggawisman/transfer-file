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
    const createRes = await app.request("/api/session", { method: "POST" });
    assert.equal(createRes.status, 200);
    const created = (await createRes.json()) as {
      token: string;
      session: { pin: string };
    };

    const wrongJoin = await app.request("/api/session/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "000000" }),
    });
    assert.equal(wrongJoin.status, 401);

    const joinRes = await app.request("/api/session/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: created.session.pin }),
    });
    assert.equal(joinRes.status, 200);
    const joined = (await joinRes.json()) as { token: string; role: string };
    assert.equal(joined.role, "receiver");

    const uploadAttempt = await app.request("/api/upload/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${joined.token}`,
      },
      body: JSON.stringify({ name: "test.txt", size: 5 }),
    });
    assert.equal(uploadAttempt.status, 403);
  });

  it("uploads file as host and lists files", async () => {
    const createRes = await app.request("/api/session", { method: "POST" });
    const { token } = (await createRes.json()) as { token: string };

    const prepareRes = await app.request("/api/upload/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: "hello.txt", size: 5 }),
    });
    assert.equal(prepareRes.status, 200);
    const { file } = (await prepareRes.json()) as { file: { id: string } };

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
});
