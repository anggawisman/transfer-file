import { useCallback, useEffect, useState } from "react";
import type { CreateSessionResponse, SessionStorageResponse } from "@transfer-file/shared";
import {
  createSession,
  getSessionStorage,
  wipeAllSessionStorage,
} from "../api/client";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface SessionPanelProps {
  onSessionReset?: (session: CreateSessionResponse) => void;
}

export function SessionPanel({ onSessionReset }: SessionPanelProps) {
  const [storage, setStorage] = useState<SessionStorageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wiping, setWiping] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await getSessionStorage();
      setStorage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleWipeAll = async () => {
    const confirmed = window.confirm(
      "This removes all uploaded files from disk and ends the current session. Continue?",
    );
    if (!confirmed) return;

    setWiping(true);
    setError(null);
    try {
      await wipeAllSessionStorage();
      const next = await createSession();
      onSessionReset?.(next);
      setStorage({
        activeSession: next.session,
        diskSessions: [
          {
            id: next.session.id,
            fileCount: 0,
            totalBytes: 0,
            isActive: true,
          },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete data");
    } finally {
      setWiping(false);
    }
  };

  const activeCount = storage?.activeSession ? 1 : 0;
  const diskCount = storage?.diskSessions.length ?? 0;
  const orphanCount =
    storage?.diskSessions.filter((s) => !s.isActive).length ?? 0;

  return (
    <aside className="rounded-2xl bg-slate-800/60 border border-slate-700 p-4 space-y-4 h-fit">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
          Sessions
        </h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-xs text-sky-400 hover:text-sky-300"
        >
          Refresh
        </button>
      </div>

      {loading && !storage && (
        <p className="text-sm text-slate-400">Loading...</p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {storage && (
        <>
          <div className="space-y-2">
            <p className="text-xs text-slate-400">Active in memory</p>
            <p className="text-2xl font-bold text-slate-100">{activeCount}</p>
            {storage.activeSession && (
              <div className="text-sm text-slate-300 space-y-1">
                <p>
                  PIN:{" "}
                  <span className="font-mono">
                    {showPin ? storage.activeSession.pin : "••••••"}
                  </span>{" "}
                  <button
                    type="button"
                    onClick={() => setShowPin((v) => !v)}
                    className="text-xs text-sky-400 hover:text-sky-300"
                  >
                    {showPin ? "Hide" : "Show"}
                  </button>
                </p>
                <p className="text-xs text-slate-400">
                  {storage.activeSession.receiverConnected
                    ? "Phone connected"
                    : "Waiting for phone"}
                </p>
                <p className="text-xs text-slate-500">
                  Expires{" "}
                  {new Date(storage.activeSession.expiresAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-700 pt-4 space-y-2">
            <p className="text-xs text-slate-400">Disk folders</p>
            <p className="text-lg font-semibold text-slate-100">
              {diskCount}{" "}
              <span className="text-sm font-normal text-slate-400">
                ({orphanCount} orphan{orphanCount === 1 ? "" : "s"})
              </span>
            </p>
            {storage.diskSessions.length > 0 ? (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {storage.diskSessions.map((session) => (
                  <li
                    key={session.id}
                    className="text-xs rounded-lg bg-slate-900/50 px-2 py-2 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-slate-400 truncate">
                        {session.id.slice(0, 8)}…
                      </span>
                      <span
                        className={
                          session.isActive
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }
                      >
                        {session.isActive ? "Active" : "Orphan"}
                      </span>
                    </div>
                    <p className="text-slate-500">
                      {session.fileCount} file
                      {session.fileCount === 1 ? "" : "s"} ·{" "}
                      {formatBytes(session.totalBytes)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No session data on disk</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleWipeAll()}
            disabled={wiping}
            className="w-full rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50 py-2 text-sm"
          >
            {wiping ? "Deleting..." : "Delete all session data"}
          </button>
        </>
      )}
    </aside>
  );
}
