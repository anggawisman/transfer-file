# Development Guide

This guide covers setting up a local development environment, running tests, and navigating the codebase.

## Prerequisites

- **Node.js 20+**
- **npm** (comes with Node.js)
- Git

Bun was considered in the original plan but the project uses **npm workspaces + Node.js**.

## Initial setup

```bash
git clone <repo-url>
cd TRANSFER_FILE
npm install
cp .env.example .env
```

Edit `.env` if needed. The default `JWT_SECRET` in `.env.example` works for local development.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Start server (tsx watch) + Vite dev UI concurrently |
| `npm run dev` | Server only on `https://localhost:8787` |
| `npm run dev:web` | Vite dev server on `http://localhost:5173` (proxies API to 8787) |
| `npm run build` | Build shared → web → server |
| `npm start` | Run production server (`node dist/index.js`) |
| `npm test` | Run all workspace tests |

### Development vs production

| Mode | Web UI | API | Use when |
|------|--------|-----|----------|
| `dev:all` | Vite HMR on :5173 | HTTPS on :8787 via proxy | Active UI development |
| `dev` | Built `apps/web/dist` or none | HTTPS on :8787 | API/server work only |
| `build` + `start` | Static from `apps/web/dist` | HTTPS on :8787 | Production-like testing |

## Environment variables

Defined in [`.env.example`](../.env.example) and loaded by [`apps/server/src/index.ts`](../apps/server/src/index.ts):

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | (required) | HMAC secret for JWT signing; min 32 chars |
| `PORT` | `8787` | HTTPS listen port |
| `HOST` | `0.0.0.0` | Bind address |
| `STRICT_LAN` | `true` | Reject non-private IPs on `/api/*` |
| `TRANSFER_DATA_DIR` | `./data` | Storage for certs and session files |
| `TRANSFER_WEB_DIST` | auto-detect | Path to built web UI |
| `SESSION_TTL_MS` | `86400000` (24h) | Session/token lifetime |
| `MAX_FILE_SIZE_BYTES` | `10737418240` (10 GB) | Max single file size |
| `MAX_FILES_PER_SESSION` | `100` | Max files per session |

## Project structure

```
apps/server/src/
├── index.ts              # Entry point: HTTPS + WebSocket + mDNS
├── config.ts             # Configuration, LAN IP, filename sanitization
├── tls.ts                # Self-signed certificate generation
├── routes/app.ts         # All REST routes (start here for API changes)
├── middleware/auth.ts    # JWT verification, LAN-only, role checks
└── services/
    ├── auth.ts           # JWT issue/verify
    ├── session-store.ts # In-memory session + PIN
    ├── file-store.ts     # Disk read/write for uploaded files
    ├── ws-hub.ts         # WebSocket broadcast
    └── discovery.ts      # mDNS advertisement

apps/web/src/
├── App.tsx               # Router: localhost → host, else → /join
├── pages/
│   ├── HostPage.tsx      # PC upload UI
│   └── ReceiverPage.tsx  # Phone download UI
├── components/           # QRDisplay, FileDropzone, FileList
├── hooks/useFiles.ts     # File list + upload queue
└── api/client.ts         # HTTP client, chunked upload/download

packages/shared/src/
└── schemas.ts            # Zod schemas, types, constants (CHUNK_SIZE_BYTES, etc.)
```

## Testing

```bash
npm test
```

Runs tests in all workspaces:

| Package | Tests | Coverage |
|---------|-------|----------|
| `@transfer-file/shared` | Zod schema validation | PIN, upload metadata, file meta |
| `@transfer-file/server` | Config, session store, file store, API integration | PIN verify, chunked upload, role enforcement |

**20 tests total** as of v0.1.0.

### Running server tests only

```bash
npm run test -w @transfer-file/server
```

## Adding a new API endpoint

1. **Define schema** in `packages/shared/src/schemas.ts` (request/response types)
2. **Add route** in `apps/server/src/routes/app.ts`
3. **Choose middleware**: `hostAuth`, `receiverAuth`, or `anyAuth`
4. **Add client method** in `apps/web/src/api/client.ts` if the UI needs it
5. **Write test** in `apps/server/src/routes/app.test.ts`
6. **Document** in `docs/api.md`

## Changing upload/download behavior

| Concern | File |
|---------|------|
| Chunk size | `packages/shared/src/schemas.ts` → `CHUNK_SIZE_BYTES` |
| Server disk writes | `apps/server/src/services/file-store.ts` |
| Client chunk loop | `apps/web/src/api/client.ts` → `uploadFile()` |
| Upload concurrency | `apps/web/src/hooks/useFiles.ts` → `maxConcurrent` |
| Max file size | `.env` → `MAX_FILE_SIZE_BYTES` or `config.ts` default |

## Building for production

```bash
npm run build
npm start
```

Build order: `shared` (TypeScript compile) → `web` (Vite bundle) → `server` (TypeScript compile).

The server auto-detects `apps/web/dist` for static file serving.

## Common development issues

| Issue | Fix |
|-------|-----|
| `JWT_SECRET env var required` | Create `.env` from `.env.example` |
| Certificate errors in browser | Expected for self-signed; accept the warning |
| Vite proxy fails | Ensure server is running on port 8787 first |
| `Cannot find module @transfer-file/shared` | Run `npm run build -w @transfer-file/shared` or `npm install` |
| Port 8787 in use | Change `PORT` in `.env` |

## Code conventions

See [CLAUDE.md](../CLAUDE.md) for project conventions:

- TypeScript strict mode, no `any`
- Zod validation at API boundaries
- Immutable state updates in React
- Host role: upload + session management
- Receiver role: download only

## Further reading

- [Architecture](architecture.md) — system design and data flows
- [API reference](api.md) — endpoint documentation
- [Security](security.md) — threat model and auth
- [ADRs](decisions/) — design decision rationale
