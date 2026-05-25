"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminToken } from "@/lib/admin-context";
import {
  getAdminPhotos,
  hidePhoto,
  showPhoto,
  deletePhoto,
} from "@/lib/admin-api";
import type { AdminPhotoRead } from "@/lib/admin-api";
import { ConfirmDialog, PageHeader, Spinner } from "@/components/admin/ui";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Filter = "all" | "visible" | "hidden";

// ── Photo card ────────────────────────────────────────────────────────────────
interface CardProps {
  photo: AdminPhotoRead;
  onHide: () => void;
  onShow: () => void;
  onDeleteRequest: () => void;
  busy: boolean;
}

function PhotoCard({ photo, onHide, onShow, onDeleteRequest, busy }: CardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DC] shadow-sm overflow-hidden flex flex-col">
      {/* Thumbnail 4:3 */}
      <div className="relative w-full" style={{ paddingBottom: "75%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.public_url}
          alt={photo.original_filename}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Status badge over image */}
        <span
          className={`absolute top-2 right-2 font-sans text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            photo.is_approved
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-600"
          }`}
        >
          {photo.is_approved ? "Visible" : "Hidden"}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <p className="font-sans text-sm font-medium text-[#2C2418] truncate">
            {photo.uploader_name ?? (
              <span className="italic text-[#C0B8B0]">Anonymous</span>
            )}
          </p>
          <p className="font-sans text-xs text-[#7A6E60] mt-0.5">
            {formatDate(photo.uploaded_at)}
          </p>
          <p className="font-sans text-xs text-[#C0B8B0] mt-0.5">
            {formatSize(photo.file_size_bytes)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          {photo.is_approved ? (
            <button
              onClick={onHide}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[#E0D8CC] font-sans text-xs text-[#7A6E60] hover:border-amber-300 hover:text-amber-600 transition disabled:opacity-50 cursor-pointer"
            >
              {busy ? <Spinner /> : "Hide"}
            </button>
          ) : (
            <button
              onClick={onShow}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[#E0D8CC] font-sans text-xs text-[#7A6E60] hover:border-emerald-300 hover:text-emerald-600 transition disabled:opacity-50 cursor-pointer"
            >
              {busy ? <Spinner /> : "Show"}
            </button>
          )}
          <button
            onClick={onDeleteRequest}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[#E0D8CC] font-sans text-xs text-[#7A6E60] hover:border-rose-300 hover:text-rose-500 transition disabled:opacity-50 cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminPhotosPage() {
  const token = useAdminToken();
  const [photos, setPhotos] = useState<AdminPhotoRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Per-photo busy state for optimistic hide/show
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AdminPhotoRead | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    getAdminPhotos(token)
      .then(setPhotos)
      .catch(() => setError("Could not load photos."))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Derived counts ──────────────────────────────────────────────────────────
  const counts = useMemo(
    () => ({
      all: photos.length,
      visible: photos.filter((p) => p.is_approved).length,
      hidden: photos.filter((p) => !p.is_approved).length,
    }),
    [photos]
  );

  const filtered = useMemo(() => {
    if (filter === "visible") return photos.filter((p) => p.is_approved);
    if (filter === "hidden") return photos.filter((p) => !p.is_approved);
    return photos;
  }, [photos, filter]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function setBusy(id: number, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      busy ? next.add(id) : next.delete(id);
      return next;
    });
  }

  // ── Hide (optimistic) ───────────────────────────────────────────────────────
  async function handleHide(photo: AdminPhotoRead) {
    setBusy(photo.id, true);
    // Optimistic update
    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, is_approved: false } : p))
    );
    try {
      const updated = await hidePhoto(token, photo.id);
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? updated : p)));
    } catch {
      // Revert on error
      setPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, is_approved: true } : p))
      );
    } finally {
      setBusy(photo.id, false);
    }
  }

  // ── Show (optimistic) ───────────────────────────────────────────────────────
  async function handleShow(photo: AdminPhotoRead) {
    setBusy(photo.id, true);
    // Optimistic update
    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, is_approved: true } : p))
    );
    try {
      const updated = await showPhoto(token, photo.id);
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? updated : p)));
    } catch {
      // Revert on error
      setPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, is_approved: false } : p))
      );
    } finally {
      setBusy(photo.id, false);
    }
  }

  // ── Delete (NOT optimistic — wait for server) ───────────────────────────────
  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await deletePhoto(token, deleteTarget.id);
      setPhotos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // Keep dialog open so user sees the failure
    } finally {
      setDeleteSaving(false);
    }
  }

  // ── Filter tabs ─────────────────────────────────────────────────────────────
  const TABS: { key: Filter; label: string }[] = [
    { key: "all",     label: `All (${counts.all})` },
    { key: "visible", label: `Visible (${counts.visible})` },
    { key: "hidden",  label: `Hidden (${counts.hidden})` },
  ];

  return (
    <div>
      <PageHeader
        title="Photos"
        subtitle={`${photos.length} total`}
      />

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 font-sans text-sm mb-6">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-[#F7F5F2] rounded-xl p-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`font-sans text-xs px-4 py-2 rounded-lg transition-all cursor-pointer ${
              filter === key
                ? "bg-white shadow-sm text-[#2C2418] font-medium"
                : "text-[#7A6E60] hover:text-[#2C2418]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[#E8E4DC] overflow-hidden animate-pulse"
            >
              <div className="w-full bg-[#E8E4DC]" style={{ paddingBottom: "75%" }} />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-[#F2EBE0] rounded w-1/2" />
                <div className="h-3 bg-[#F2EBE0] rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 font-sans text-sm text-[#7A6E60] italic">
          {filter === "all"
            ? "No photos uploaded yet."
            : filter === "visible"
            ? "No visible photos."
            : "No hidden photos."}
        </div>
      )}

      {/* Photo grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              busy={busyIds.has(photo.id)}
              onHide={() => handleHide(photo)}
              onShow={() => handleShow(photo)}
              onDeleteRequest={() => setDeleteTarget(photo)}
            />
          ))}
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <ConfirmDialog
          message="Delete this photo permanently? This cannot be undone."
          confirmLabel={deleteSaving ? "Deleting…" : "Delete"}
          danger={true}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
