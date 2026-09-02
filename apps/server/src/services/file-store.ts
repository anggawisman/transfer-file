import fs from "node:fs";
import path from "node:path";
import { createWriteStream, createReadStream } from "node:fs";
import { randomUUID } from "node:crypto";
import type { FileMeta, SessionRole } from "@transfer-file/shared";
import { sanitizeFilename } from "../config.js";

export interface StoredFile extends FileMeta {
  diskPath: string;
}

export class FileStore {
  constructor(private readonly sessionDir: string) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  static forSession(dataDir: string, sessionId: string): FileStore {
    return new FileStore(path.join(dataDir, "sessions", sessionId));
  }

  createPending(
    name: string,
    size: number,
    uploadedBy: SessionRole,
    mimeType?: string,
  ): StoredFile {
    const id = randomUUID();
    const safeName = sanitizeFilename(name);
    const diskPath = path.join(this.sessionDir, `${id}_${safeName}`);
    const file: StoredFile = {
      id,
      name: safeName,
      size,
      mimeType,
      status: "pending",
      uploadedBytes: 0,
      uploadedBy,
      createdAt: new Date().toISOString(),
      diskPath,
    };
    return file;
  }

  async writeChunk(
    file: StoredFile,
    buffer: Buffer,
    offset: number,
  ): Promise<StoredFile> {
    const flags = offset === 0 ? "w" : "r+";
    if (offset === 0) {
      await fs.promises.writeFile(file.diskPath, buffer);
    } else {
      const handle = await fs.promises.open(file.diskPath, "r+");
      try {
        await handle.write(buffer, 0, buffer.length, offset);
      } finally {
        await handle.close();
      }
    }

    const uploadedBytes = offset + buffer.length;
    return {
      ...file,
      uploadedBytes,
      status: uploadedBytes >= file.size ? "ready" : "uploading",
    };
  }

  getReadStream(file: StoredFile) {
    return createReadStream(file.diskPath);
  }

  getWriteStream(file: StoredFile) {
    return createWriteStream(file.diskPath, { flags: "w" });
  }

  async fileExists(file: StoredFile): Promise<boolean> {
    try {
      await fs.promises.access(file.diskPath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileSize(file: StoredFile): Promise<number> {
    const stat = await fs.promises.stat(file.diskPath);
    return stat.size;
  }

  toMeta(file: StoredFile): FileMeta {
    const { diskPath: _diskPath, ...meta } = file;
    return meta;
  }

  static async wipeSessionDir(sessionDir: string): Promise<void> {
    await fs.promises.rm(sessionDir, { recursive: true, force: true });
  }
}
