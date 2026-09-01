import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export const APP_NAME = "Transfer File";
export const APP_VERSION = "0.1.0";
export const DEFAULT_PORT = 8787;

export interface AppConfig {
  port: number;
  host: string;
  strictLan: boolean;
  dataDir: string;
  certDir: string;
  webDistDir: string;
  jwtSecret: string;
  sessionTtlMs: number;
  maxFileSizeBytes: number;
  maxFilesPerSession: number;
}

function resolveDataDir(): string {
  const env = process.env.TRANSFER_DATA_DIR;
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), "data");
}

function resolveWebDistDir(): string {
  const env = process.env.TRANSFER_WEB_DIST;
  if (env) return path.resolve(env);

  const candidates = [
    path.resolve(moduleDir, "../../web/dist"),
    path.resolve(process.cwd(), "apps/web/dist"),
    path.resolve(process.cwd(), "../web/dist"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), "apps/web/dist");
}

export function loadConfig(): AppConfig {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      "JWT_SECRET env var required (min 32 chars). Set in .env or environment.",
    );
  }

  const dataDir = resolveDataDir();
  const certDir = path.join(dataDir, "certs");

  return {
    port: Number(process.env.PORT ?? DEFAULT_PORT),
    host: process.env.HOST ?? "0.0.0.0",
    strictLan: process.env.STRICT_LAN !== "false",
    dataDir,
    certDir,
    webDistDir: resolveWebDistDir(),
    jwtSecret,
    sessionTtlMs: Number(process.env.SESSION_TTL_MS ?? 24 * 60 * 60 * 1000),
    maxFileSizeBytes: Number(
      process.env.MAX_FILE_SIZE_BYTES ?? 10 * 1024 * 1024 * 1024,
    ),
    maxFilesPerSession: Number(process.env.MAX_FILES_PER_SESSION ?? 100),
  };
}

export function getLanIp(): string {
  const interfaces = os.networkInterfaces();
  const candidates: string[] = [];

  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (entry.address.startsWith("169.254.")) continue;
      candidates.push(entry.address);
    }
  }

  const preferred = candidates.find(
    (ip) =>
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(ip),
  );

  return preferred ?? candidates[0] ?? "127.0.0.1";
}

export function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (ip.startsWith("fe80:") || ip.startsWith("169.254.")) return true;
  return false;
}

export function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[<>:"|?*\x00-\x1f]/g, "_");
  return base.length > 0 ? base.slice(0, 255) : "file";
}
