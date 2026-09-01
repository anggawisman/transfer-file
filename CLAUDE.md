# Transfer File

PC-to-phone LAN file transfer. Node.js + Hono server, React + Vite web UI.

## Architecture summary

```
apps/server   HTTPS API + WebSocket + mDNS (PC runs this)
apps/web      React UI — HostPage (PC) + ReceiverPage (phone /join)
packages/shared  Zod schemas, types, constants (CHUNK_SIZE_BYTES = 2 MiB)
```

**Flow:** PC creates session → uploads files → phone joins with PIN → phone downloads.

**Roles:** `host` (upload, manage session) | `receiver` (download only)

Full design: [docs/architecture.md](docs/architecture.md)

## Commands

- `npm run dev:all` — server + web dev
- `npm run build` — production build
- `npm test` — run tests
- `npm start` — production server

## Documentation

| Doc | Path |
|-----|------|
| Doc hub | [docs/README.md](docs/README.md) |
| User guide | [docs/user-guide.md](docs/user-guide.md) |
| Architecture | [docs/architecture.md](docs/architecture.md) |
| API reference | [docs/api.md](docs/api.md) |
| Security | [docs/security.md](docs/security.md) |
| Development | [docs/development.md](docs/development.md) |
| ADRs | [docs/decisions/](docs/decisions/) |

## Conventions

- TypeScript strict mode, no `any`
- Zod validation at API boundaries (`packages/shared/src/schemas.ts`)
- Immutable state updates in React
- Chunked uploads: 2 MiB (`CHUNK_SIZE_BYTES`)
- Host role: upload + session management
- Receiver role: download only

## Key files

| Change | File |
|--------|------|
| API routes | `apps/server/src/routes/app.ts` |
| Auth / roles | `apps/server/src/middleware/auth.ts` |
| File storage | `apps/server/src/services/file-store.ts` |
| Upload client | `apps/web/src/api/client.ts` |
| Schemas | `packages/shared/src/schemas.ts` |

## Boundaries

- Never commit `.env`
- JWT_SECRET required (min 32 chars)
- Files stored in `data/sessions/` — ephemeral, deleted on session end
- Rate limiting not yet implemented (see docs/security.md)
