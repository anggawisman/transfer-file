import { randomInt } from "node:crypto";
import { randomUUID } from "node:crypto";
import type { FileMeta, SessionInfo, SessionRole } from "@transfer-file/shared";

export function receiverTokenId(sessionId: string): string {
  return `receiver-${sessionId}`;
}

export interface SessionState {
  info: SessionInfo;
  pin: string;
  hostTokenId: string;
  receiverConnected: boolean;
  files: Map<string, FileMeta & { diskPath: string }>;
  expiresAt: number;
}

export function generatePin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function createSession(ttlMs: number): SessionState {
  const now = Date.now();
  const id = randomUUID();
  const pin = generatePin();
  const expiresAt = now + ttlMs;

  return {
    info: {
      id,
      pin,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      receiverConnected: false,
    },
    pin,
    hostTokenId: randomUUID(),
    receiverConnected: false,
    files: new Map(),
    expiresAt,
  };
}

export class SessionStore {
  private session: SessionState | null = null;

  get(): SessionState | null {
    if (!this.session) return null;
    if (Date.now() > this.session.expiresAt) {
      this.session = null;
      return null;
    }
    return this.session;
  }

  create(ttlMs: number): SessionState {
    const session = createSession(ttlMs);
    this.session = session;
    return session;
  }

  end(): SessionState | null {
    const current = this.session;
    this.session = null;
    return current;
  }

  verifyPin(pin: string): boolean {
    const session = this.get();
    if (!session) return false;
    return session.pin === pin;
  }

  markReceiverJoined(): void {
    const session = this.get();
    if (!session) return;
    session.receiverConnected = true;
    session.info.receiverConnected = true;
  }

  isTokenValid(sessionId: string, role: SessionRole, tokenId: string): boolean {
    const session = this.get();
    if (!session) return false;
    if (session.info.id !== sessionId) return false;

    if (role === "host") {
      return tokenId === session.hostTokenId;
    }

    return (
      session.receiverConnected &&
      tokenId === receiverTokenId(session.info.id)
    );
  }
}
