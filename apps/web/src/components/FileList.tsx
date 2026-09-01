import type { FileMeta } from "@transfer-file/shared";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface FileListProps {
  files: FileMeta[];
  mode: "host" | "receiver";
  onDownload?: (file: FileMeta) => void;
  downloadProgress?: Map<string, { loaded: number; total: number }>;
}

export function FileList({
  files,
  mode,
  onDownload,
  downloadProgress,
}: FileListProps) {
  if (files.length === 0) {
    return (
      <p className="text-center text-slate-400 py-8">
        {mode === "host"
          ? "No files yet — upload from your PC above."
          : "No files available yet — wait for the PC to upload."}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {files.map((file) => {
        const progress = downloadProgress?.get(file.id);
        const uploadPct =
          file.size > 0
            ? Math.round((file.uploadedBytes / file.size) * 100)
            : 0;

        return (
          <li
            key={file.id}
            className="rounded-xl bg-slate-800/80 border border-slate-700 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-100 truncate">{file.name}</p>
                <p className="text-sm text-slate-400">{formatBytes(file.size)}</p>
              </div>
              {mode === "receiver" && file.status === "ready" && onDownload && (
                <button
                  type="button"
                  onClick={() => onDownload(file)}
                  disabled={!!progress}
                  className="shrink-0 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 px-5 py-3 text-base font-semibold text-slate-900 transition-colors min-h-[48px] min-w-[120px]"
                >
                  {progress ? "..." : "Download"}
                </button>
              )}
            </div>

            {file.status === "uploading" && (
              <div className="mt-3">
                <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Uploading {uploadPct}% ({formatBytes(file.uploadedBytes)} /{" "}
                  {formatBytes(file.size)})
                </p>
              </div>
            )}

            {progress && (
              <div className="mt-3">
                <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.round((progress.loaded / progress.total) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Downloading{" "}
                  {Math.round((progress.loaded / progress.total) * 100)}%
                </p>
              </div>
            )}

            {file.status === "ready" && mode === "host" && (
              <p className="text-xs text-emerald-400 mt-2">Ready for phone download</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
