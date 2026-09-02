import fs from "node:fs";
import path from "node:path";

export interface DiskSessionInfo {
  id: string;
  fileCount: number;
  totalBytes: number;
  isActive: boolean;
}

export async function scanDiskSessions(
  dataDir: string,
  activeSessionId: string | null,
): Promise<DiskSessionInfo[]> {
  const sessionsDir = path.join(dataDir, "sessions");
  if (!fs.existsSync(sessionsDir)) {
    return [];
  }

  const entries = await fs.promises.readdir(sessionsDir, { withFileTypes: true });
  const results: DiskSessionInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const sessionPath = path.join(sessionsDir, entry.name);
    let fileCount = 0;
    let totalBytes = 0;

    const files = await fs.promises.readdir(sessionPath, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile()) continue;
      const stat = await fs.promises.stat(path.join(sessionPath, file.name));
      fileCount += 1;
      totalBytes += stat.size;
    }

    results.push({
      id: entry.name,
      fileCount,
      totalBytes,
      isActive: activeSessionId === entry.name,
    });
  }

  return results.sort((a, b) => a.id.localeCompare(b.id));
}

export async function wipeAllSessionDirs(dataDir: string): Promise<number> {
  const sessionsDir = path.join(dataDir, "sessions");
  if (!fs.existsSync(sessionsDir)) {
    await fs.promises.mkdir(sessionsDir, { recursive: true });
    return 0;
  }

  const entries = await fs.promises.readdir(sessionsDir, { withFileTypes: true });
  const dirCount = entries.filter((e) => e.isDirectory()).length;

  await fs.promises.rm(sessionsDir, { recursive: true, force: true });
  await fs.promises.mkdir(sessionsDir, { recursive: true });

  return dirCount;
}
