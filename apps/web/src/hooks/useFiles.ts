import { useCallback, useEffect, useRef, useState } from "react";
import type { FileMeta, WsEvent } from "@transfer-file/shared";
import {
  connectWebSocket,
  listFiles,
  uploadFile,
} from "../api/client";

export function useFileList() {
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await listFiles();
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const ws = connectWebSocket((event: WsEvent) => {
      if (event.type === "file_added" || event.type === "file_ready") {
        setFiles((prev) => {
          const others = prev.filter((f) => f.id !== event.file.id);
          return [...others, event.file];
        });
      }
      if (event.type === "file_progress") {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === event.fileId
              ? {
                  ...f,
                  uploadedBytes: event.uploadedBytes,
                  status:
                    event.uploadedBytes >= event.totalBytes
                      ? "ready"
                      : "uploading",
                }
              : f,
          ),
        );
      }
      if (event.type === "session_ended") {
        setFiles([]);
      }
    });

    return () => ws.close();
  }, []);

  return { files, loading, error, refresh };
}

export function useUploadQueue() {
  const [uploads, setUploads] = useState<
    Map<string, { name: string; progress: number; total: number }>
  >(new Map());
  const queueRef = useRef<File[]>([]);
  const activeRef = useRef(0);
  const maxConcurrent = 2;

  const processQueue = useCallback(async () => {
    while (activeRef.current < maxConcurrent && queueRef.current.length > 0) {
      const file = queueRef.current.shift();
      if (!file) break;

      activeRef.current += 1;
      const key = `${file.name}-${file.size}-${Date.now()}`;

      setUploads((prev) =>
        new Map(prev).set(key, { name: file.name, progress: 0, total: file.size }),
      );

      try {
        await uploadFile(file, (uploaded, total) => {
          setUploads((prev) =>
            new Map(prev).set(key, { name: file.name, progress: uploaded, total }),
          );
        });
      } finally {
        activeRef.current -= 1;
        setUploads((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
        void processQueue();
      }
    }
  }, []);

  const enqueue = useCallback(
    (files: File[]) => {
      queueRef.current.push(...files);
      void processQueue();
    },
    [processQueue],
  );

  return { uploads: [...uploads.values()], enqueue };
}
