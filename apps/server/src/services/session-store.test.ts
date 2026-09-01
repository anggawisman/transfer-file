import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { SessionStore } from "./session-store.js";

describe("SessionStore", () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore();
  });

  it("creates session with 6-digit PIN", () => {
    const session = store.create(60_000);
    assert.match(session.pin, /^\d{6}$/);
    assert.equal(session.info.pin, session.pin);
  });

  it("verifies correct PIN", () => {
    const session = store.create(60_000);
    assert.equal(store.verifyPin(session.pin), true);
  });

  it("rejects wrong PIN", () => {
    store.create(60_000);
    assert.equal(store.verifyPin("000000"), false);
  });

  it("marks receiver joined", () => {
    store.create(60_000);
    store.markReceiverJoined();
    const session = store.get();
    assert.equal(session?.receiverConnected, true);
    assert.equal(session?.info.receiverConnected, true);
  });

  it("ends session", () => {
    const created = store.create(60_000);
    const ended = store.end();
    assert.equal(ended?.info.id, created.info.id);
    assert.equal(store.get(), null);
  });
});
