import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPrivateIp, sanitizeFilename } from "./config.js";

describe("isPrivateIp", () => {
  it("accepts localhost", () => {
    assert.equal(isPrivateIp("127.0.0.1"), true);
  });

  it("accepts 192.168.x.x", () => {
    assert.equal(isPrivateIp("192.168.1.10"), true);
  });

  it("rejects public IP", () => {
    assert.equal(isPrivateIp("8.8.8.8"), false);
  });
});

describe("sanitizeFilename", () => {
  it("strips path components", () => {
    assert.equal(sanitizeFilename("../../etc/passwd"), "passwd");
  });

  it("replaces illegal chars", () => {
    assert.equal(sanitizeFilename('file<>:"|?*.txt'), "file_______.txt");
  });
});
