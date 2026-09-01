import { SignJWT, jwtVerify } from "jose";
import type { SessionRole } from "@transfer-file/shared";

export interface TokenPayload {
  sessionId: string;
  role: SessionRole;
  tokenId: string;
}

export class AuthService {
  private readonly secret: Uint8Array;

  constructor(jwtSecret: string) {
    this.secret = new TextEncoder().encode(jwtSecret);
  }

  async issueToken(
    sessionId: string,
    role: SessionRole,
    tokenId: string,
    ttlMs: number,
  ): Promise<string> {
    return new SignJWT({ sessionId, role, tokenId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(Math.floor((Date.now() + ttlMs) / 1000))
      .sign(this.secret);
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      const sessionId = payload.sessionId;
      const role = payload.role;
      const tokenId = payload.tokenId;

      if (
        typeof sessionId !== "string" ||
        (role !== "host" && role !== "receiver") ||
        typeof tokenId !== "string"
      ) {
        return null;
      }

      return { sessionId, role, tokenId };
    } catch {
      return null;
    }
  }
}
