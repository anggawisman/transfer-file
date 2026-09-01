# ADR-002: One-Way PC to Phone Transfer

## Status

Accepted

## Date

2026-09-01

## Context

The initial plan considered bidirectional transfer (PC ↔ phone). The user's confirmed scope for v1 is **PC → phone only**: the PC uploads files, the phone downloads them.

This affects authentication, UI complexity, and API design.

## Decision

Implement **one-way transfer only** in v1:

- **Host role (PC):** create session, upload files, end session
- **Receiver role (phone):** join with PIN, list files, download files

The phone UI has no file picker or upload controls. Upload API routes reject receiver tokens with 403.

## Alternatives Considered

### Bidirectional (PC ↔ phone)

- **Pros:** Phone can send photos back to PC; more flexible
- **Cons:** More complex UI on phone; both roles need upload/download; LocalSend-style approval flow
- **Deferred:** Can be added in v2 by allowing receiver upload with host approval

### Phone as server host

- **Pros:** No PC required for phone-to-phone
- **Cons:** Phones cannot easily run a Node.js CLI server; background process limitations on iOS/Android
- **Rejected:** Out of scope for web-first LAN tool

## Consequences

- JWT tokens carry a `role` claim (`host` | `receiver`) enforced by middleware
- Simpler phone UI — PIN entry + download list only
- API has clear role boundaries: upload = host, download = receiver
- Adding bidirectional transfer later requires new routes and UI but not a full architecture change
