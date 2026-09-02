# Transfer File — Documentation

Transfer File is a **PC ↔ phone LAN file transfer** tool. Run a small server on your PC; both devices exchange files over local Wi‑Fi — no cloud, no mobile data, no app install on the phone.

## Start here

| I want to… | Read this |
|------------|-----------|
| Transfer files between PC and phone | [User guide](user-guide.md) |
| Understand how the system is built | [Architecture](architecture.md) |
| Integrate with or extend the API | [API reference](api.md) |
| Review security assumptions | [Security](security.md) |
| Set up a dev environment | [Development](development.md) |
| Understand why we made certain choices | [Architecture Decision Records](decisions/) |

## Documentation index

| Document | Description |
|----------|-------------|
| [User guide](user-guide.md) | Step-by-step instructions for PC host and phone receiver |
| [Architecture](architecture.md) | Components, data flows, session lifecycle, file transfer |
| [API reference](api.md) | REST endpoints, WebSocket events, request/response shapes |
| [Security](security.md) | Threat model, authentication, TLS, limitations |
| [Development](development.md) | Local setup, commands, project layout, testing |
| [ADR-001: Hub model](decisions/ADR-001-hub-model.md) | Why PC-hosted HTTP hub instead of WebRTC P2P |
| [ADR-002: One-way transfer](decisions/ADR-002-one-way-pc-to-phone.md) | Superseded — was PC → phone only in v1 |
| [ADR-005: Bidirectional](decisions/ADR-005-bidirectional-transfer.md) | PC ↔ phone in one session |
| [ADR-003: TLS and PIN](decisions/ADR-003-lan-tls-and-pin.md) | Self-signed HTTPS + 6-digit PIN pairing |
| [ADR-004: Node monorepo](decisions/ADR-004-node-monorepo-stack.md) | Node.js + npm workspaces stack choice |

## Quick commands

```bash
npm install
npm run dev:all    # development (server + web UI)
npm test           # run tests
npm run build      # production build
npm start          # production server
```

See the root [README](../README.md) for a shorter quick-start summary.
