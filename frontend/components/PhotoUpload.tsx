"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { presignPhoto, confirmPhoto } from "@/lib/api";
import type { PhotoRead } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type FileStatus = "pending" | "compressing" | "uploading" | "done" | "error";

interface FileEntry {
  id: string; // stable local key
  file: File;
  status: FileStatus;
  progress: number;
  errorMsg?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (photo: PhotoRead) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusIcon(entry: FileEntry) {
  switch (entry.status) {
    case "pending":
      return "⏳";
    case "compressing":
      return "🔄";
    case "uploading":
      return `↑ ${entry.progress}%`;
    case "done":
      return "✅";
    case "error":
      return "❌";
  }
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

// ── Upload pipeline for a single file ─────────────────────────────────────────
async function uploadFile(
  entry: FileEntry,
  uploaderName: string,
  updateEntry: (id: string, patch: Partial<FileEntry>) => void,
  onUploaded: (photo: PhotoRead) => void
): Promise<void> {
  const { id, file } = entry;

  try {
    // 1. Compress
    updateEntry(id, { status: "compressing", progress: 0 });
    const compressed = await imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 2000,
      useWebWorker: true,
    });

    // 2. Presign
    updateEntry(id, { status: "uploading", progress: 0 });
    let presign;
    try {
      presign = await presignPhoto(compressed.type || file.type, compressed.size);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Presign failed, please retry";
      updateEntry(id, { status: "error", errorMsg: msg });
      return;
    }

    // 3. PUT directly to R2 via XHR (for progress events)
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presign.upload_url);
      xhr.setRequestHeader("Content-Type", compressed.type || file.type);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          updateEntry(id, {
            progress: Math.round((e.loaded / e.total) * 100),
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`R2 upload failed (HTTP ${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error("Upload failed, please retry"));
      xhr.send(compressed);
    }).catch((err: Error) => {
      updateEntry(id, { status: "error", errorMsg: err.message });
      throw err; // stop pipeline
    });

    // 4. Confirm
    const confirmed = await confirmPhoto({
      storage_key: presign.storage_key,
      uploader_name: uploaderName.trim() || undefined,
      original_filename: file.name,
      file_size_bytes: compressed.size,
      mime_type: compressed.type || file.type,
    });

    // 5. Done
    updateEntry(id, { status: "done", progress: 100 });
    onUploaded(confirmed);
  } catch {
    // Already handled above; no double-error
    if (entry.status !== "error") {
      updateEntry(id, { status: "error", errorMsg: "Upload failed, please retry" });
    }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PhotoUpload({ isOpen, onClose, onUploaded }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploaderName, setUploaderName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Trap focus & close on Escape
  useEffect(() => {
    if (!isOpen) return;
    firstFocusRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const updateEntry = useCallback(
    (id: string, patch: Partial<FileEntry>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
      );
    },
    []
  );

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const newEntries: FileEntry[] = Array.from(incoming).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: "pending",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newEntries]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const retryFile = (entry: FileEntry) => {
    updateEntry(entry.id, { status: "pending", progress: 0, errorMsg: undefined });
  };

  const handleUploadAll = () => {
    const pending = files.filter((f) => f.status === "pending");
    Promise.all(
      pending.map((entry) =>
        uploadFile(entry, uploaderName, updateEntry, onUploaded)
      )
    );
  };

  const allDoneOrError = files.length > 0 && files.every(
    (f) => f.status === "done" || f.status === "error"
  );
  const hasPending = files.some((f) => f.status === "pending");
  const isUploading = files.some(
    (f) => f.status === "compressing" || f.status === "uploading"
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet — slides up from bottom */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Upload your photos"
        className={[
          "fixed z-50 bg-white shadow-2xl",
          // Mobile: bottom sheet
          "bottom-0 left-0 right-0 rounded-t-2xl",
          // Desktop: centered modal
          "sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-lg sm:rounded-2xl",
          "max-h-[90dvh] flex flex-col",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#F2EBE0] flex-shrink-0">
          <h2 className="font-serif italic text-xl text-[#2C2418]">
            Загрузите ваши фото 📸
          </h2>
          <button
            ref={firstFocusRef}
            onClick={onClose}
            className="text-[#7A6E60] hover:text-[#2C2418] transition p-1 rounded"
            aria-label="Close"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="16" y2="16" /><line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name input */}
          <input
            type="text"
            placeholder="Ваше имя (необязательно)"
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            className="w-full font-sans text-sm border border-[#E0D8CC] rounded-xl px-4 py-2.5 text-[#2C2418] placeholder:text-[#C0B8B0] focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/30 focus:border-[#C4A35A] transition"
          />

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-[#E0D8CC] rounded-xl p-8 text-center cursor-pointer hover:border-[#C4A35A] hover:bg-[#FAF7F2] transition"
          >
            <p className="font-sans text-sm text-[#7A6E60]">
              Перетащите фото сюда или <span className="text-[#C4A35A] font-medium">нажмите для выбора</span>
            </p>
            <p className="font-sans text-xs text-[#C0B8B0] mt-1">
              JPEG · PNG · WebP · HEIC · макс. 20 МБ файл
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />

          {/* File list */}
          {files.length > 0 && (
            <ul className="space-y-3">
              {files.map((entry) => {
                const thumb = entry.status !== "compressing"
                  ? URL.createObjectURL(entry.file)
                  : null;

                return (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 bg-[#FAF7F2] rounded-xl p-3"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#E8E4DC]">
                      {thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="w-full h-full object-cover"
                          onLoad={() => URL.revokeObjectURL(thumb)}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-xs text-[#2C2418] truncate">
                        {entry.file.name}
                      </p>
                      {/* Progress bar */}
                      {(entry.status === "uploading" || entry.status === "compressing") && (
                        <div className="mt-1.5 h-1.5 rounded-full bg-[#E8E4DC] overflow-hidden">
                          <div
                            className="h-full bg-[#C4A35A] rounded-full transition-all"
                            style={{ width: `${entry.progress}%` }}
                          />
                        </div>
                      )}
                      {entry.status === "error" && (
                        <p className="font-sans text-xs text-red-500 mt-0.5">
                          {entry.errorMsg ?? "Upload failed"}
                        </p>
                      )}
                    </div>

                    {/* Status / retry */}
                    <div className="flex-shrink-0 text-sm">
                      {entry.status === "error" ? (
                        <button
                          onClick={() => retryFile(entry)}
                          className="font-sans text-xs text-[#C4A35A] hover:underline"
                        >
                          Retry
                        </button>
                      ) : (
                        <span>{statusIcon(entry)}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-5 pt-3 border-t border-[#F2EBE0] flex-shrink-0 flex gap-3">
          {allDoneOrError ? (
            <button
              onClick={onClose}
              className="flex-1 bg-[#2C2418] text-white font-sans text-sm py-3 rounded-xl hover:bg-[#3D3020] transition"
            >
              Готово
            </button>
          ) : (
            <button
              onClick={handleUploadAll}
              disabled={!hasPending || isUploading}
              className="flex-1 bg-[#C4A35A] text-white font-sans text-sm py-3 rounded-xl hover:bg-[#B8934A] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "Загрузка…" : "Загрузить все"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
