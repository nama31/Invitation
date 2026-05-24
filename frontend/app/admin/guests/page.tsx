"use client";

import { useEffect, useState, useMemo } from "react";
import { useAdminToken } from "@/lib/admin-context";
import {
  createGuest,
  deleteGuest,
  getGuests,
  updateGuest,
} from "@/lib/admin-api";
import type { GuestAdminRead, GuestAdminUpdate } from "@/lib/admin-types";
import type { GuestStatus } from "@/lib/types";
import {
  ConfirmDialog,
  Field,
  Modal,
  PageHeader,
  PrimaryBtn,
  SkeletonRow,
  Spinner,
  StatusBadge,
} from "@/components/admin/ui";

const STATUS_OPTIONS: GuestStatus[] = ["pending", "confirmed", "declined"];
const STATUS_LABELS: Record<GuestStatus, string> = {
  pending: "Ожидает",
  confirmed: "Придёт",
  declined: "Не придёт",
};

export default function GuestsPage() {
  const token = useAdminToken();
  const [guests, setGuests] = useState<GuestAdminRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Add guest modal
  const [addOpen, setAddOpen] = useState(false);
  const [addFirst, setAddFirst] = useState("");
  const [addLast, setAddLast] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // Inline edit
  const [editId, setEditId] = useState<number | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editStatus, setEditStatus] = useState<GuestStatus>("pending");
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<GuestAdminRead | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    getGuests(token)
      .then(setGuests)
      .catch(() => setError("Не удалось загрузить список гостей."))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return guests;
    return guests.filter(
      (g) =>
        g.first_name.toLowerCase().includes(q) ||
        g.last_name.toLowerCase().includes(q) ||
        g.table?.table_name?.toLowerCase().includes(q)
    );
  }, [guests, search]);

  // ── Add guest ──────────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addFirst.trim() || !addLast.trim()) return;
    setAddSaving(true);
    setAddError("");
    try {
      const g = await createGuest(token, { first_name: addFirst.trim(), last_name: addLast.trim() });
      setGuests((prev) => [g, ...prev]);
      setAddOpen(false);
      setAddFirst("");
      setAddLast("");
    } catch {
      setAddError("Не удалось добавить гостя.");
    } finally {
      setAddSaving(false);
    }
  }

  // ── Start inline edit ──────────────────────────────────────────────────────
  function startEdit(g: GuestAdminRead) {
    setEditId(g.id);
    setEditFirst(g.first_name);
    setEditLast(g.last_name);
    setEditStatus(g.status);
  }

  // ── Save inline edit ───────────────────────────────────────────────────────
  async function saveEdit(id: number) {
    setEditSaving(true);
    const payload: GuestAdminUpdate = {
      first_name: editFirst.trim(),
      last_name: editLast.trim(),
      status: editStatus,
    };
    try {
      const updated = await updateGuest(token, id, payload);
      setGuests((prev) => prev.map((g) => (g.id === id ? updated : g)));
      setEditId(null);
    } catch {
      // Keep editing state so user can retry
    } finally {
      setEditSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await deleteGuest(token, deleteTarget.id);
      setGuests((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // Silently keep dialog open so user sees it
    } finally {
      setDeleteSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Гости"
        subtitle={`Всего: ${guests.length}`}
        action={
          <PrimaryBtn onClick={() => setAddOpen(true)}>
            + Добавить гостя
          </PrimaryBtn>
        }
      />

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени или столу…"
          className="w-full sm:w-80 font-sans text-sm border border-[#E0D8CC] rounded-xl px-4 py-2.5 bg-white text-[#2C2418] focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/30 focus:border-[#C4A35A] transition"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 font-sans text-sm mb-6">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E8E4DC] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#F2EBE0] bg-[#FAF7F2]">
                {["Имя", "Статус", "Стол", "Действия"].map((h) => (
                  <th key={h} className="px-4 py-3 font-sans text-xs text-[#7A6E60] uppercase tracking-wider font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F7F5F2]">
              {loading &&
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center font-sans text-sm text-[#7A6E60]">
                    {search ? "Гостей не найдено" : "Список пуст — добавьте первого гостя"}
                  </td>
                </tr>
              )}

              {filtered.map((g) =>
                editId === g.id ? (
                  // ── Editing row ──────────────────────────────────────────
                  <tr key={g.id} className="bg-[#FAF7F2]">
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <input
                          value={editFirst}
                          onChange={(e) => setEditFirst(e.target.value)}
                          className="w-28 font-sans text-sm border border-[#C4A35A] rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                          placeholder="Имя"
                        />
                        <input
                          value={editLast}
                          onChange={(e) => setEditLast(e.target.value)}
                          className="w-28 font-sans text-sm border border-[#C4A35A] rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                          placeholder="Фамилия"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as GuestStatus)}
                        className="font-sans text-xs border border-[#E0D8CC] rounded-lg px-2 py-1.5 bg-white focus:outline-none cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 font-sans text-sm text-[#7A6E60]">
                      {g.table?.table_name ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveEdit(g.id)}
                          disabled={editSaving}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#C4A35A] text-white font-sans text-xs hover:bg-[#B39248] transition disabled:opacity-60 cursor-pointer"
                        >
                          {editSaving ? <Spinner /> : "✓ Сохранить"}
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="px-3 py-1.5 rounded-lg border border-[#E0D8CC] font-sans text-xs text-[#7A6E60] hover:bg-[#F7F5F2] transition cursor-pointer"
                        >
                          Отмена
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // ── Display row ──────────────────────────────────────────
                  <tr key={g.id} className="hover:bg-[#FAF7F2] transition-colors">
                    <td className="px-4 py-3 font-sans text-sm text-[#2C2418] font-medium">
                      {g.first_name} {g.last_name}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={g.status} />
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-[#7A6E60]">
                      {g.table?.table_name ?? <span className="text-[#C0B8B0] italic">Не назначен</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(g)}
                          className="px-3 py-1.5 rounded-lg border border-[#E0D8CC] font-sans text-xs text-[#7A6E60] hover:border-[#C4A35A] hover:text-[#C4A35A] transition cursor-pointer"
                        >
                          Изменить
                        </button>
                        <button
                          onClick={() => setDeleteTarget(g)}
                          className="px-3 py-1.5 rounded-lg border border-[#E0D8CC] font-sans text-xs text-[#7A6E60] hover:border-rose-300 hover:text-rose-500 transition cursor-pointer"
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Guest modal ─────────────────────────────────────────────────── */}
      {addOpen && (
        <Modal title="Добавить гостя" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Field label="Имя" value={addFirst} onChange={(e) => setAddFirst(e.target.value)} placeholder="Анна" required />
            <Field label="Фамилия" value={addLast} onChange={(e) => setAddLast(e.target.value)} placeholder="Иванова" required />
            {addError && <p className="font-sans text-sm text-rose-600">{addError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setAddOpen(false)} className="flex-1 py-2.5 rounded-xl border border-[#E0D8CC] font-sans text-sm text-[#7A6E60] hover:bg-[#F7F5F2] transition cursor-pointer">
                Отмена
              </button>
              <PrimaryBtn type="submit" loading={addSaving} className="flex-1 justify-center">
                Добавить
              </PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete confirm dialog ───────────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Удалить гостя «${deleteTarget.first_name} ${deleteTarget.last_name}»? Это действие нельзя отменить.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
