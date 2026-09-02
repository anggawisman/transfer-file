# Security

This document describes the security model, assumptions, and limitations of Transfer File.

## Threat model

Transfer File is designed for **trusted local networks** (home Wi‑Fi, office LAN, PC hotspot). It is **not** intended to be exposed to the public internet.

| Assumption | Implication |
|------------|-------------|
| LAN is semi-trusted | Anyone on the same network can reach the server port |
| Physical proximity | User can read the PIN from the PC screen |
| Short-lived sessions | Files are ephemeral; deleted on session end |
| No internet relay | No third-party can intercept traffic via cloud |

**Not protected against:**

- A malicious device already on your LAN scanning for open ports
- Someone shoulder-surfing the PIN
- A compromised device on the same network with network sniffing tools
- Port forwarding that exposes the server to the internet

## Authentication

### PIN pairing

- A random **6-digit PIN** is generated when the host creates a session
- The phone must enter this PIN to receive a receiver token
- Wrong PIN returns `401 WRONG_PIN`
- PIN is visible on the PC screen and encoded in no other channel

### JWT tokens

Tokens are HS256-signed JWTs issued by [`AuthService`](../apps/server/src/services/auth.ts):

| Claim | Description |
|-------|-------------|
| `sessionId` | UUID of the active session |
| `role` | `host` or `receiver` |
| `tokenId` | Unique token identifier |
| `exp` | Expiration (default: 24 hours) |

Tokens are stored in browser `localStorage` on the client.

**Session binding:** After JWT signature verification, the server checks that the token's `sessionId` and `tokenId` match the active in-memory session. When the host ends a session or wipes storage, all tokens from that session are immediately invalid (`401 SESSION_ENDED`), even if the JWT has not expired.

### Role enforcement

Middleware in [`apps/server/src/middleware/auth.ts`](../apps/server/src/middleware/auth.ts) enforces roles:

| Route | Required role |
|-------|---------------|
| `POST /api/upload/prepare` | `host` or `receiver` |
| `PUT /api/upload/:fileId` | `host` or `receiver` |
| `GET /api/download/:fileId` | `host` or `receiver` |
| `DELETE /api/session` | `host` |
| `GET /api/sessions/storage` | `host` |
| `DELETE /api/sessions/storage` | `host` |
| `GET /api/files` | `host` or `receiver` |

Both roles can upload and download. Anyone with a valid token for the session can access any ready file via the API. The web UI only offers Download for files uploaded by the other party.

## Transport security (TLS)

- Server uses **HTTPS** with an auto-generated **self-signed certificate**
- Certificate is created on first run and stored in `data/certs/`
- SHA-256 fingerprint is printed at startup and returned in `/api/health`
- Browsers show a certificate warning on first visit — user must accept once per device

**Why self-signed?** No public CA can issue certs for LAN IP addresses. Self-signed TLS still encrypts traffic on the wire within your network.

## LAN-only access

When `STRICT_LAN=true` (default), the server rejects API requests from non-private IP addresses:

- Allowed: `127.0.0.1`, `10.x.x.x`, `192.168.x.x`, `172.16–31.x.x`, link-local
- Rejected: public IPs → `403 LAN_ONLY`

Set `STRICT_LAN=false` in `.env` only for development behind a reverse proxy where you understand the implications.

## Input validation

All JSON request bodies are validated with **Zod** schemas from `packages/shared`:

- PIN format: exactly 6 digits
- Filename: sanitized via `sanitizeFilename()` — strips path components and illegal characters
- File size: positive integer, capped at `MAX_FILE_SIZE_BYTES` (10 GB default)
- File count: capped at `MAX_FILES_PER_SESSION` (100 default)

## Data handling

| Data | Storage | Lifetime |
|------|---------|----------|
| Uploaded files | `data/sessions/<sessionId>/` | Until session end or new session created |
| TLS certificate | `data/certs/` | Persistent across sessions |
| JWT secret | `.env` / environment | Persistent; never committed to git |
| Session state | In-memory (`SessionStore`) | Until server restart or session end |

Files are **not encrypted at rest**. They exist as plain files on the PC disk until deleted.

## What is not implemented (honest gaps)

| Feature | Status |
|---------|--------|
| Rate limiting on auth/upload endpoints | **Not implemented** — planned for future release |
| SHA-256 upload verification | Schema supports it; server does not verify yet |
| Token revocation before expiry | **Implemented** — tokens invalidated when session ends or storage is wiped |
| Audit logging | Console output only |
| mTLS / client certificates | Not used |

## Recommendations for users

1. **Do not port-forward** port 8787 to the internet
2. **Use on trusted networks** — avoid public Wi‑Fi for sensitive files
3. **End sessions** when done — click "End session" to delete files from disk
4. **Change `JWT_SECRET`** from the dev default before any non-local use
5. **Accept the cert warning** only when you trust the network you are on

## Recommendations for developers

1. Never commit `.env` or `data/` to version control
2. Set `JWT_SECRET` to a random string of at least 32 characters
3. Keep `STRICT_LAN=true` in production-like deployments
4. Review [ADR-003](decisions/ADR-003-lan-tls-and-pin.md) for TLS + PIN design rationale
