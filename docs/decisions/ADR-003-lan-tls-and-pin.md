# ADR-003: Self-Signed TLS and PIN Pairing on LAN

## Status

Accepted

## Date

2026-09-01

## Context

Transfer File runs on a local network without internet connectivity. We need:

- Encrypted transport (prevent casual LAN sniffing)
- A simple pairing mechanism so random devices cannot download files
- No dependency on external certificate authorities or cloud services

## Decision

Use **two complementary mechanisms**:

1. **Self-signed HTTPS** — auto-generated TLS certificate on first server start, stored in `data/certs/`
2. **6-digit PIN pairing** — displayed on PC host screen; phone must enter correct PIN to receive a receiver JWT

## Alternatives Considered

### HTTP only (no TLS)

- **Pros:** No certificate warnings; simpler setup
- **Cons:** Traffic visible on LAN in plaintext; modern browsers restrict mixed content and some APIs over HTTP
- **Rejected:** TLS is worth the one-time cert acceptance per device

### Let's Encrypt / public CA

- **Pros:** No browser warnings
- **Cons:** Requires a public domain name and internet access for validation; LAN IP addresses cannot get public certs
- **Rejected:** Incompatible with offline LAN-only operation

### QR code as sole auth (no PIN)

- **Pros:** One-step join via QR scan
- **Cons:** Anyone who scans the QR gets access; QR can be photographed from a distance
- **Rejected:** PIN adds a deliberate second factor visible only on the PC screen

### Cloud-based pairing (display code on both devices)

- **Pros:** Familiar UX (like YouTube TV pairing)
- **Cons:** Requires internet relay
- **Rejected:** Violates zero-data requirement

## Consequences

- Users must accept a self-signed certificate warning once per device per cert
- TLS fingerprint is printed at server startup and available via `/api/health`
- PIN is session-scoped and rotates when a new session is created
- No protection against a device already on the LAN that guesses the PIN (6 digits = 1M combinations; acceptable for trusted LAN)
- Certificate persists across sessions in `data/certs/` unless manually deleted
