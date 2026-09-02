# API Reference

Base URL: `https://<host>:8787` (default port 8787).

All API routes under `/api/*` are subject to LAN-only middleware when `STRICT_LAN=true` (default). Requests from non-private IP addresses receive `403 LAN_ONLY`.

## Authentication

Protected endpoints require a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are issued with role claims:

| Role | Issued by | Used for |
|------|-----------|----------|
| `host` | `POST /api/session` | Upload, download receiver files, session management |
| `receiver` | `POST /api/session/join` | Upload, download host files, list files |

## Error responses

All errors return JSON:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_CODE"
}
```

Common codes: `NO_TOKEN`, `BAD_TOKEN`, `SESSION_ENDED`, `WRONG_ROLE`, `NO_SESSION`, `WRONG_PIN`, `NOT_FOUND`, `NOT_READY`, `FILE_TOO_LARGE`, `FILE_LIMIT`, `LAN_ONLY`.

JWTs are bound to the **active in-memory session**. Tokens are rejected with `401 SESSION_ENDED` when:
- The session has ended
- A new session was created (different `sessionId` or `tokenId`)
- A receiver token is used before PIN join completes

---

## REST Endpoints

### `GET /api/health`

Liveness check. No authentication required.

**Response `200`:**

```json
{
  "ok": true,
  "name": "Transfer File",
  "version": "0.1.0",
  "lanIp": "192.168.1.10",
  "port": 8787,
  "fingerprint": "aa8a30dca420e1d6..."
}
```

`fingerprint` is the SHA-256 hash of the TLS certificate (first 16 chars shown in CLI).

---

### `POST /api/session`

Create a new transfer session. If a session already exists, it is ended and its files are deleted.

No authentication required. Returns a **host** token.

**Response `200`:**

```json
{
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "pin": "482910",
    "createdAt": "2026-09-01T10:00:00.000Z",
    "expiresAt": "2026-09-02T10:00:00.000Z",
    "receiverConnected": false
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "lanUrl": "https://192.168.1.10:8787",
  "joinUrl": "https://192.168.1.10:8787/join"
}
```

---

### `GET /api/session`

Get current session info. Requires **host** token.

**Response `200`:**

```json
{
  "session": { /* SessionInfo — same shape as above */ }
}
```

**Response `404`:** `{ "error": "No active session", "code": "NO_SESSION" }`

---

### `POST /api/session/join`

Join an active session with a PIN. Returns a **receiver** token.

**Request body:**

```json
{
  "pin": "482910"
}
```

PIN must be exactly 6 digits.

**Response `200`:**

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "role": "receiver"
}
```

**Response `400`:** `{ "error": "Invalid PIN format", "code": "INVALID_PIN" }`

**Response `401`:** `{ "error": "Wrong PIN", "code": "WRONG_PIN" }`

**Response `404`:** `{ "error": "No active session", "code": "NO_SESSION" }`

Broadcasts `receiver_joined` WebSocket event on success.

---

### `DELETE /api/session`

End the current session and delete all uploaded files. Requires **host** token.

**Response `200`:**

```json
{ "ok": true }
```

Broadcasts `session_ended` WebSocket event.

---

### `GET /api/sessions/storage`

Storage summary for the host session panel. Requires **host** token.

**Response `200`:**

```json
{
  "activeSession": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "pin": "482910",
    "createdAt": "2026-09-01T10:00:00.000Z",
    "expiresAt": "2026-09-02T10:00:00.000Z",
    "receiverConnected": true
  },
  "diskSessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "fileCount": 3,
      "totalBytes": 1048576,
      "isActive": true
    }
  ]
}
```

`diskSessions` includes all folders under `data/sessions/`. `isActive` is `true` when the folder matches the in-memory session.

---

### `DELETE /api/sessions/storage`

End the current session (if any), wipe **all** folders under `data/sessions/`, and broadcast `session_ended`. Requires **host** token.

**Response `200`:**

```json
{
  "ok": true,
  "removedCount": 2
}
```

All previously issued JWTs for the ended session become invalid (`401 SESSION_ENDED`).

---

### `GET /api/files`

List all files in the current session. Requires **host** or **receiver** token.

**Response `200`:**

```json
{
  "files": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "video.mp4",
      "size": 1073741824,
      "mimeType": "video/mp4",
      "status": "ready",
      "uploadedBytes": 1073741824,
      "uploadedBy": "host",
      "createdAt": "2026-09-01T10:05:00.000Z"
    }
  ]
}
```

**File status values:** `pending`, `uploading`, `ready`, `failed`

**`uploadedBy`:** `"host"` (PC) or `"receiver"` (phone) — set from JWT role at prepare time.

---

### `POST /api/upload/prepare`

Register file metadata before uploading chunks. Requires **host** or **receiver** token.

`uploadedBy` is set server-side from the JWT role.

**Request body:**

```json
{
  "name": "video.mp4",
  "size": 1073741824,
  "mimeType": "video/mp4",
  "sha256": "optional-64-char-hex-hash"
}
```

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | yes | 1–255 characters; sanitized server-side |
| `size` | yes | Positive integer; max 10 GB default |
| `mimeType` | no | Max 127 characters |
| `sha256` | no | Exactly 64 hex characters |

**Response `200`:**

```json
{
  "file": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "video.mp4",
    "size": 1073741824,
    "mimeType": "video/mp4",
    "status": "pending",
    "uploadedBytes": 0,
    "uploadedBy": "host",
    "createdAt": "2026-09-01T10:05:00.000Z"
  }
}
```

**Response `400`:** `FILE_LIMIT` (max 100 files) or `FILE_TOO_LARGE`

Broadcasts `file_added` WebSocket event.

---

### `PUT /api/upload/:fileId`

Upload a file chunk. Requires **host** or **receiver** token.

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | yes | `application/octet-stream` |
| `Content-Range` | no | `bytes <start>-<end>/<total>` for resume |

**Body:** Raw binary chunk data.

**Content-Range example** (2 MiB chunk starting at byte 0 of a 5 MB file):

```
Content-Range: bytes 0-2097151/5242880
```

If `Content-Range` is omitted, the server appends at `uploadedBytes` (sequential upload).

**Response `200`:**

```json
{
  "file": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "video.mp4",
    "size": 5242880,
    "status": "uploading",
    "uploadedBytes": 2097152,
    "createdAt": "2026-09-01T10:05:00.000Z"
  }
}
```

When `uploadedBytes >= size`, status becomes `ready` and `file_ready` is broadcast.

**Response `400`:** `BAD_RANGE`, `SIZE_MISMATCH`

**Response `404`:** `NOT_FOUND`

---

### `GET /api/download/:fileId`

Stream a file. Requires **host** or **receiver** token. File must have `status: "ready"`.

**Response `200`:** Binary stream with headers:

```
Content-Type: video/mp4
Content-Length: 1073741824
Content-Disposition: attachment; filename="video.mp4"
```

**Response `404`:** `NOT_FOUND` or `NOT_READY`

---

## WebSocket

**Endpoint:** `wss://<host>:8787/ws`

No authentication required to connect. All connected clients receive broadcast events.

### Event types

Events are JSON messages with a `type` discriminator. Schemas defined in `packages/shared/src/schemas.ts`.

#### `file_added`

File metadata registered, upload not yet started or in progress.

```json
{
  "type": "file_added",
  "file": { /* FileMeta */ }
}
```

#### `file_progress`

Chunk upload progress.

```json
{
  "type": "file_progress",
  "fileId": "660e8400-e29b-41d4-a716-446655440001",
  "uploadedBytes": 4194304,
  "totalBytes": 1073741824
}
```

#### `file_ready`

Upload complete, file available for download.

```json
{
  "type": "file_ready",
  "file": { /* FileMeta with status: "ready" */ }
}
```

#### `file_failed`

Upload failed (schema defined; not yet emitted by server in all failure paths).

```json
{
  "type": "file_failed",
  "fileId": "660e8400-e29b-41d4-a716-446655440001",
  "error": "Disk write failed"
}
```

#### `receiver_joined`

Phone successfully entered PIN.

```json
{
  "type": "receiver_joined",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### `session_ended`

Host ended the session.

```json
{
  "type": "session_ended",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Client upload example

Chunked upload from the web client (`apps/web/src/api/client.ts`):

```typescript
// 1. Prepare
const { file } = await POST("/api/upload/prepare", {
  name: file.name,
  size: file.size,
  mimeType: file.type,
});

// 2. Upload chunks (2 MiB each)
let offset = 0;
while (offset < file.size) {
  const end = Math.min(offset + 2 * 1024 * 1024, file.size);
  const chunk = file.slice(offset, end);

  await PUT(`/api/upload/${file.id}`, chunk, {
    "Content-Type": "application/octet-stream",
    "Content-Range": `bytes ${offset}-${end - 1}/${file.size}`,
  });

  offset = end;
}
```

## Schema source of truth

All request/response types are validated with Zod in [`packages/shared/src/schemas.ts`](../packages/shared/src/schemas.ts). When in doubt, refer to the schema definitions there.
