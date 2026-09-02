# ADR-005: Bidirectional PC ↔ Phone Transfer

## Status

Accepted

## Date

2026-09-01

## Context

v1 implemented one-way PC → phone transfer ([ADR-002](ADR-002-one-way-pc-to-phone.md)). Users need to send photos and files from phone to PC as well, without changing the hub architecture (PC still runs the server).

Requirements:
- Keep existing PC → phone flow
- Add phone → PC in the same PIN session
- Auto-accept phone uploads (no per-file host approval)
- Track who uploaded each file

## Decision

Enable **bidirectional transfer** within a single session:

| Direction | Uploader role | Downloader role |
|-----------|---------------|-----------------|
| PC → phone | `host` | `receiver` |
| Phone → PC | `receiver` | `host` |

Changes:
- `uploadedBy: "host" | "receiver"` on `FileMeta`
- Upload routes (`prepare`, `put`) use `anyAuth` (both roles)
- Download route uses `anyAuth` (both roles)
- UI shows Download only for files from the other party

## Alternatives Considered

### Host approval per phone upload (LocalSend-style)

- **Pros:** Host controls what enters the session
- **Cons:** Extra UI and WebSocket flow; friction for photo transfers
- **Rejected:** User chose auto-accept after PIN join

### Separate phone-to-PC-only mode

- **Pros:** Simpler mental model per session
- **Cons:** Two modes to document and test; users want both directions in one session
- **Rejected**

## Consequences

- [ADR-002](ADR-002-one-way-pc-to-phone.md) is superseded
- Receiver UI gains file picker and upload zone
- Host UI gains download for phone-uploaded files
- Security: anyone with PIN can upload to the session (same trust model as before, now bidirectional)
- Server-side download is not restricted by uploader (UI filters only); acceptable for trusted LAN
