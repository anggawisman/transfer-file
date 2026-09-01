# ADR-004: Node.js Monorepo Stack

## Status

Accepted

## Date

2026-09-01

## Context

The original project plan specified **Bun** as the runtime (fast startup, native streaming I/O, single toolchain). During implementation, Bun was not available in the target development environment.

We needed a runtime and package manager that:

- Supports TypeScript execution in development
- Works with Hono, React, Vite, and Zod
- Runs on Windows without additional setup
- Supports npm workspaces for the monorepo layout

## Decision

Use **Node.js 20+** with **npm workspaces** and **tsx** for development:

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Package manager | npm workspaces |
| Dev execution | tsx (watch mode for server) |
| Server | Hono + @hono/node-server + ws |
| Web | React 19 + Vite 6 + Tailwind CSS 4 |
| Validation | Zod |
| Auth | jose (JWT) |

Monorepo structure:

```
apps/server    @transfer-file/server
apps/web       @transfer-file/web
packages/shared @transfer-file/shared
```

## Alternatives Considered

### Bun (original plan)

- **Pros:** Faster install/startup; native TypeScript; built-in test runner
- **Cons:** Not installed in target environment; global install was blocked
- **Deferred:** Can migrate later; Hono and most dependencies are Bun-compatible

### pnpm workspaces

- **Pros:** Efficient disk usage; strict dependency resolution
- **Cons:** Additional tool requirement; npm workspaces sufficient for 3 packages
- **Rejected:** npm is universally available with Node.js

### Single package (no monorepo)

- **Pros:** Simpler structure
- **Cons:** Shared Zod schemas would be duplicated or awkwardly imported
- **Rejected:** Monorepo keeps API contracts in one place

## Consequences

- README and docs use `npm` commands, not `bun`
- `packages/shared` must be compiled (`tsc`) before production `npm start` because Node cannot import `.ts` files directly
- Development uses `tsx watch` for hot reload on the server
- Build order: shared → web → server
- Migration to Bun later would mainly change scripts and remove the shared package compile step
