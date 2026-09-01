import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";

interface FileDropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFiles, disabled }: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const files = [...e.dataTransfer.files];
      if (files.length > 0) onFiles(files);
    },
    [disabled, onFiles],
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={[
        "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-colors cursor-pointer",
        dragOver
          ? "border-sky-400 bg-sky-500/10"
          : "border-slate-600 bg-slate-800/50 hover:border-slate-500",
        disabled ? "opacity-50 pointer-events-none" : "",
      ].join(" ")}
    >
      <input
        type="file"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          if (files.length > 0) onFiles(files);
          e.target.value = "";
        }}
      />
      <div className="text-4xl">📁</div>
      <p className="text-lg font-medium text-slate-200">
        Drop files here or tap to browse
      </p>
      <p className="text-sm text-slate-400">Large files supported — streams over LAN</p>
    </label>
  );
}
