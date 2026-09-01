import { useState } from "react";
import type { FileMeta } from "@transfer-file/shared";
import { joinSession, getStoredToken } from "../api/client";
import { downloadFile } from "../api/client";
import { FileList } from "../components/FileList";
import { useFileList } from "../hooks/useFiles";

export function ReceiverPage() {
  const [pin, setPin] = useState("");
  const [joined, setJoined] = useState(!!getStoredToken());
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const { files } = useFileList();
  const [downloadProgress, setDownloadProgress] = useState<
    Map<string, { loaded: number; total: number }>
  >(new Map());

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true);
    setError(null);
    try {
      await joinSession(pin);
      setJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setJoining(false);
    }
  };

  const handleDownload = async (file: FileMeta) => {
    setDownloadProgress((prev) =>
      new Map(prev).set(file.id, { loaded: 0, total: file.size }),
    );
    try {
      await downloadFile(file, (loaded, total) => {
        setDownloadProgress((prev) =>
          new Map(prev).set(file.id, { loaded, total }),
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadProgress((prev) => {
        const next = new Map(prev);
        next.delete(file.id);
        return next;
      });
    }
  };

  if (!joined) {
    return (
      <div className="max-w-sm mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-100">Join transfer</h2>
          <p className="text-slate-400 mt-2">
            Enter the 6-digit PIN shown on the PC
          </p>
        </div>

        <form onSubmit={(e) => void handleJoin(e)} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="w-full text-center text-3xl font-mono tracking-[0.5em] rounded-xl bg-slate-800 border border-slate-600 px-4 py-4 text-slate-100 focus:outline-none focus:border-sky-500"
            autoComplete="one-time-code"
          />
          <button
            type="submit"
            disabled={pin.length !== 6 || joining}
            className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 py-4 text-lg font-semibold text-slate-900 min-h-[52px]"
          >
            {joining ? "Joining..." : "Join"}
          </button>
        </form>

        {error && (
          <p className="text-center text-red-400 text-sm">{error}</p>
        )}

        <p className="text-xs text-slate-500 text-center">
          Keep screen awake during large downloads
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-emerald-300 text-sm">
        Connected — download files sent from the PC
      </div>

      {error && (
        <p className="text-center text-red-400 text-sm">{error}</p>
      )}

      <FileList
        files={files}
        mode="receiver"
        onDownload={(f) => void handleDownload(f)}
        downloadProgress={downloadProgress}
      />

      <p className="text-xs text-slate-500 text-center">
        Downloads use Wi‑Fi only — no mobile data
      </p>
    </div>
  );
}
