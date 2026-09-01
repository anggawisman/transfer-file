import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { FileStore } from "./file-store.js";

describe("FileStore", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "transfer-file-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes chunks and marks file ready", async () => {
    const store = new FileStore(tmpDir);
    const file = store.createPending("test.txt", 10);
    const chunk = Buffer.from("hello worl");
    const updated = await store.writeChunk(file, chunk, 0);

    assert.equal(updated.uploadedBytes, 10);
    assert.equal(updated.status, "ready");

    const size = await store.getFileSize(updated);
    assert.equal(size, 10);
  });

  it("resumes at offset", async () => {
    const store = new FileStore(tmpDir);
    const file = store.createPending("resume.bin", 20);
    await store.writeChunk(file, Buffer.from("aaaa"), 0);
    const updated = await store.writeChunk(
      file,
      Buffer.from("bbbbbbbbbbbbbbbb"),
      4,
    );

    assert.equal(updated.uploadedBytes, 20);
    assert.equal(updated.status, "ready");
  });
});
