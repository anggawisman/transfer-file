import { z } from "zod";

export const SessionRoleSchema = z.enum(["host", "receiver"]);
export type SessionRole = z.infer<typeof SessionRoleSchema>;

export const FileStatusSchema = z.enum([
  "pending",
  "uploading",
  "ready",
  "failed",
]);
export type FileStatus = z.infer<typeof FileStatusSchema>;

export const FileMetaSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
  mimeType: z.string().max(127).optional(),
  status: FileStatusSchema,
  uploadedBytes: z.number().int().nonnegative(),
  uploadedBy: SessionRoleSchema,
  sha256: z.string().length(64).optional(),
  createdAt: z.string().datetime(),
});
export type FileMeta = z.infer<typeof FileMetaSchema>;

export const SessionInfoSchema = z.object({
  id: z.string().uuid(),
  pin: z.string().length(6),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  receiverConnected: z.boolean(),
});
export type SessionInfo = z.infer<typeof SessionInfoSchema>;

export const CreateSessionResponseSchema = z.object({
  session: SessionInfoSchema,
  token: z.string(),
  lanUrl: z.string().url(),
  joinUrl: z.string().url(),
});
export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;

export const JoinSessionRequestSchema = z.object({
  pin: z.string().length(6).regex(/^\d{6}$/),
});
export type JoinSessionRequest = z.infer<typeof JoinSessionRequestSchema>;

export const JoinSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  token: z.string(),
  role: z.literal("receiver"),
});
export type JoinSessionResponse = z.infer<typeof JoinSessionResponseSchema>;

export const PrepareUploadRequestSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().positive(),
  mimeType: z.string().max(127).optional(),
  sha256: z.string().length(64).optional(),
});
export type PrepareUploadRequest = z.infer<typeof PrepareUploadRequestSchema>;

export const PrepareUploadResponseSchema = z.object({
  file: FileMetaSchema,
});
export type PrepareUploadResponse = z.infer<typeof PrepareUploadResponseSchema>;

export const FileListResponseSchema = z.object({
  files: z.array(FileMetaSchema),
});
export type FileListResponse = z.infer<typeof FileListResponseSchema>;

export const DiskSessionInfoSchema = z.object({
  id: z.string().uuid(),
  fileCount: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
  isActive: z.boolean(),
});
export type DiskSessionInfo = z.infer<typeof DiskSessionInfoSchema>;

export const SessionStorageResponseSchema = z.object({
  activeSession: SessionInfoSchema.nullable(),
  diskSessions: z.array(DiskSessionInfoSchema),
});
export type SessionStorageResponse = z.infer<typeof SessionStorageResponseSchema>;

export const WipeSessionStorageResponseSchema = z.object({
  ok: z.literal(true),
  removedCount: z.number().int().nonnegative(),
});
export type WipeSessionStorageResponse = z.infer<
  typeof WipeSessionStorageResponseSchema
>;

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  name: z.string(),
  version: z.string(),
  lanIp: z.string(),
  port: z.number().int(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const WsEventTypeSchema = z.enum([
  "file_added",
  "file_progress",
  "file_ready",
  "file_failed",
  "receiver_joined",
  "session_ended",
]);
export type WsEventType = z.infer<typeof WsEventTypeSchema>;

export const WsEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("file_added"),
    file: FileMetaSchema,
  }),
  z.object({
    type: z.literal("file_progress"),
    fileId: z.string().uuid(),
    uploadedBytes: z.number().int().nonnegative(),
    totalBytes: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("file_ready"),
    file: FileMetaSchema,
  }),
  z.object({
    type: z.literal("file_failed"),
    fileId: z.string().uuid(),
    error: z.string(),
  }),
  z.object({
    type: z.literal("receiver_joined"),
    sessionId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("session_ended"),
    sessionId: z.string().uuid(),
  }),
]);
export type WsEvent = z.infer<typeof WsEventSchema>;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
export const MAX_FILES_PER_SESSION = 100;
export const CHUNK_SIZE_BYTES = 2 * 1024 * 1024; // 2 MiB
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
