# ADR-001: Hub Model over WebRTC P2P

## Status

Accepted

## Date

2026-09-01

## Context

Transfer File needs to move large files (up to 10 GB) from a PC to a phone over a local network. Requirements:

- No internet or mobile data usage
- Works in mobile browsers without installing an app
- Reliable for large files on Safari iOS and Chrome Android
- Simple setup for non-technical users

Two main architectures were considered:

1. **Hub model** — PC runs an HTTP server; phone connects as a client
2. **P2P model** — Browsers connect directly via WebRTC data channels

## Decision

Use a **PC-hosted HTTP hub** (inspired by [LocalSend](https://github.com/localsend/localsend)) where:

- The PC runs an HTTPS server with REST upload/download endpoints
- The phone opens a browser, enters a PIN, and downloads files
- All file bytes pass through the PC's disk (not peer-to-peer)

## Alternatives Considered

### WebRTC P2P (browser-to-browser)

- **Pros:** No intermediary storage; true peer-to-peer after signaling
- **Cons:** Complex signaling setup; Safari/mobile WebRTC quirks; `RTCDataChannel` buffer management for multi-GB files; harder to debug on LAN
- **Rejected:** Reliability and mobile browser compatibility concerns outweigh P2P benefits for v1

### Cloud relay (Snapdrop-style with fallback)

- **Pros:** Works across networks
- **Cons:** Uses internet bandwidth; violates zero-data requirement; privacy concerns
- **Rejected:** Conflicts with core product goal

### SMB/FTP native protocols

- **Pros:** OS-native, fast
- **Cons:** Requires app install or OS configuration on phone; poor mobile UX
- **Rejected:** Web-first requirement

## Consequences

- PC must be running and on the same network as the phone
- Files are temporarily stored on PC disk during transfer (ephemeral `data/sessions/`)
- Simpler debugging — standard HTTP tools work (curl, browser DevTools)
- Upload and download are separate steps with clear progress tracking
- WebRTC P2P remains a candidate for a future version if hub limitations become a problem
