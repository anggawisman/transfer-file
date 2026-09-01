import { useEffect, useState } from "react";
import type { CreateSessionResponse } from "@transfer-file/shared";
import { createSession, endSession, connectWebSocket } from "../api/client";
import { QRDisplay } from "../components/QRDisplay";
import { FileDropzone } from "../components/FileDropzone";
import { FileList } from "../components/FileList";
import { useFileList, useUploadQueue } from "../hooks/useFiles";

export function HostPage() {
  const [session, setSession] = useState<CreateSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const { files } = useFileList();
  const { uploads, enqueue } = useUploadQueue();

  useEffect(() => {
    void createSession()
      .then(setSession)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to start session"),
      );
  }, []);

  useEffect(() => {
    if (!session) return;
    const ws = connectWebSocket((event) => {
      if (event.type === "receiver_joined") {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                session: { ...prev.session, receiverConnected: true },
              }
            : prev,
        );
      }
    });
    return () => ws.close();
  }, [session?.session.id]);

  const handleEndSession = async () => {
    setEnding(true);
    try {
      await endSession();
      const next = await createSession();
      setSession(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end session");
    } finally {
      setEnding(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-red-300">
        {error}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center text-slate-400 py-12">Starting session...</div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-slate-800/60 border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">
          Phone pairing
        </h2>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <QRDisplay url={session.joinUrl} />
          <div className="space-y-3 text-center md:text-left">
            <div>
              <p className="text-sm text-slate-400">PIN code</p>
              <p className="text-4xl font-mono font-bold tracking-[0.3em] text-sky-400">
                {session.session.pin}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Join URL</p>
              <p className="text-sm font-mono text-slate-300 break-all">
                {session.joinUrl}
              </p>
            </div>
            {session.session.receiverConnected && (
              <p className="text-emerald-400 text-sm">Phone connected</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">
          Upload files (PC → phone)
        </h2>
        <FileDropzone onFiles={enqueue} />
        {uploads.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploads.map((u) => (
              <div key={u.name} className="text-sm text-slate-400">
                Uploading {u.name}:{" "}
                {Math.round((u.progress / u.total) * 100)}%
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200">Files</h2>
          <button
            type="button"
            onClick={() => void handleEndSession()}
            disabled={ending}
            className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            End session
          </button>
        </div>
        <FileList files={files} mode="host" />
      </section>
    </div>
  );
}
