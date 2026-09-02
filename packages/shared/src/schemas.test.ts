import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  JoinSessionRequestSchema,
  PrepareUploadRequestSchema,
  FileMetaSchema,
  SessionStorageResponseSchema,
} from "./schemas.js";

describe("JoinSessionRequestSchema", () => {
  it("accepts valid 6-digit PIN", () => {
    const result = JoinSessionRequestSchema.safeParse({ pin: "123456" });
    assert.equal(result.success, true);
  });

  it("rejects non-numeric PIN", () => {
    const result = JoinSessionRequestSchema.safeParse({ pin: "12ab56" });
    assert.equal(result.success, false);
  });

  it("rejects short PIN", () => {
    const result = JoinSessionRequestSchema.safeParse({ pin: "12345" });
    assert.equal(result.success, false);
  });
});

describe("PrepareUploadRequestSchema", () => {
  it("accepts valid upload metadata", () => {
    const result = PrepareUploadRequestSchema.safeParse({
      name: "video.mp4",
      size: 1024,
      mimeType: "video/mp4",
    });
    assert.equal(result.success, true);
  });

  it("rejects zero size", () => {
    const result = PrepareUploadRequestSchema.safeParse({
      name: "empty.txt",
      size: 0,
    });
    assert.equal(result.success, false);
  });
});

describe("FileMetaSchema", () => {
  it("accepts valid file meta", () => {
    const result = FileMetaSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "test.bin",
      size: 100,
      status: "ready",
      uploadedBytes: 100,
      uploadedBy: "host",
      createdAt: new Date().toISOString(),
    });
    assert.equal(result.success, true);
  });
});

describe("SessionStorageResponseSchema", () => {
  it("accepts valid session storage response", () => {
    const result = SessionStorageResponseSchema.safeParse({
      activeSession: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        pin: "123456",
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        receiverConnected: false,
      },
      diskSessions: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          fileCount: 2,
          totalBytes: 1024,
          isActive: true,
        },
      ],
    });
    assert.equal(result.success, true);
  });
});
