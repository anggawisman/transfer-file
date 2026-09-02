import type { Context, Next } from "hono";
import { isPrivateIp } from "../config.js";
import type { AppConfig } from "../config.js";
import type { AuthService } from "../services/auth.js";
import type { SessionStore } from "../services/session-store.js";
import type { SessionRole } from "@transfer-file/shared";

export function lanOnlyMiddleware(config: AppConfig) {
  return async (c: Context, next: Next) => {
    if (!config.strictLan) {
      await next();
      return;
    }

    const forwarded = c.req.header("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "127.0.0.1";

    if (!isPrivateIp(ip)) {
      return c.json({ error: "LAN access only", code: "LAN_ONLY" }, 403);
    }

    await next();
  };
}

export function createAuthMiddleware(
  auth: AuthService,
  sessions: SessionStore,
  requiredRole?: SessionRole,
) {
  return async (c: Context, next: Next) => {
    const header = c.req.header("authorization");
    const token = header?.startsWith("Bearer ")
      ? header.slice(7)
      : c.req.header("x-session-token");

    if (!token) {
      return c.json({ error: "Unauthorized", code: "NO_TOKEN" }, 401);
    }

    const payload = await auth.verifyToken(token);
    if (!payload) {
      return c.json({ error: "Invalid or expired token", code: "BAD_TOKEN" }, 401);
    }

    if (!sessions.isTokenValid(payload.sessionId, payload.role, payload.tokenId)) {
      return c.json({ error: "Session ended", code: "SESSION_ENDED" }, 401);
    }

    if (requiredRole && payload.role !== requiredRole) {
      return c.json({ error: "Forbidden", code: "WRONG_ROLE" }, 403);
    }

    c.set("auth", payload);
    await next();
  };
}

export function getAuth(c: Context) {
  return c.get("auth") as import("../services/auth.js").TokenPayload;
}
