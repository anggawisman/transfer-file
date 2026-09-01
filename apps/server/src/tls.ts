import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import selfsigned from "selfsigned";
import type { AppConfig } from "./config.js";

export interface TlsCredentials {
  key: string;
  cert: string;
  fingerprint: string;
}

function computeFingerprint(certPem: string): string {
  const certBody = certPem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s/g, "");
  const der = Buffer.from(certBody, "base64");
  return crypto.createHash("sha256").update(der).digest("hex");
}

export function ensureTlsCredentials(config: AppConfig): TlsCredentials {
  fs.mkdirSync(config.certDir, { recursive: true });

  const keyPath = path.join(config.certDir, "key.pem");
  const certPath = path.join(config.certDir, "cert.pem");

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    const key = fs.readFileSync(keyPath, "utf8");
    const cert = fs.readFileSync(certPath, "utf8");
    return { key, cert, fingerprint: computeFingerprint(cert) };
  }

  const attrs = [{ name: "commonName", value: "transfer-file.local" }];
  const pems = selfsigned.generate(attrs, {
    keySize: 2048,
    days: 3650,
    algorithm: "sha256",
  });

  fs.writeFileSync(keyPath, pems.private, "utf8");
  fs.writeFileSync(certPath, pems.cert, "utf8");

  return {
    key: pems.private,
    cert: pems.cert,
    fingerprint: computeFingerprint(pems.cert),
  };
}
