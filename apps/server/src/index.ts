import fs from "node:fs";
import https from "node:https";
import { getRequestListener } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { loadConfig, getLanIp, APP_NAME, APP_VERSION } from "./config.js";
import { ensureTlsCredentials } from "./tls.js";
import { AuthService } from "./services/auth.js";
import { SessionStore } from "./services/session-store.js";
import { createApp, serveStatic } from "./routes/app.js";
import { startDiscovery } from "./services/discovery.js";
import { wsHub } from "./services/ws-hub.js";

function loadEnvFile(): void {
  const candidates = [
    new URL("../../../.env", import.meta.url),
    new URL("../../.env", import.meta.url),
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
    break;
  }
}

async function main(): Promise<void> {
  loadEnvFile();

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET =
      "dev-secret-change-in-production-min-32-chars!!";
  }

  const config = loadConfig();
  fs.mkdirSync(config.dataDir, { recursive: true });

  const tls = ensureTlsCredentials(config);
  const auth = new AuthService(config.jwtSecret);
  const sessions = new SessionStore();

  const app = createApp({
    config,
    auth,
    sessions,
    tlsFingerprint: tls.fingerprint,
  });

  serveStatic(app, config.webDistDir);

  const handler = getRequestListener(app.fetch);
  const server = https.createServer(
    { key: tls.key, cert: tls.cert },
    handler,
  );

  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    const client = {
      send: (data: string) => socket.send(data),
    };
    wsHub.add(client);
    socket.on("close", () => wsHub.remove(client));
  });

  const discovery = startDiscovery(config);

  server.listen(config.port, config.host, () => {
    const lanIp = getLanIp();
    const url = `https://${lanIp}:${config.port}`;
    const joinUrl = `${url}/join`;

    console.log("");
    console.log(`  ${APP_NAME} v${APP_VERSION}`);
    console.log("  ─────────────────────────────────────");
    console.log(`  Host UI:     https://localhost:${config.port}`);
    console.log(`  LAN URL:     ${url}`);
    console.log(`  Join URL:    ${joinUrl}`);
    console.log(`  mDNS:        transfer-file.local:${config.port}`);
    console.log(`  TLS SHA256:  ${tls.fingerprint.slice(0, 16)}...`);
    console.log("");
    console.log("  Windows firewall (if prompted):");
    console.log(
      `    netsh advfirewall firewall add rule name="Transfer File" dir=in action=allow protocol=TCP localport=${config.port}`,
    );
    console.log("");
  });

  const shutdown = () => {
    discovery.stop();
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
