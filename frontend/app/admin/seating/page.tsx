"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminToken } from "@/lib/admin-context";
import {
  assignGuest,
  createTable,
  deleteTable,
  getGuests,
  getTables,
  unassignGuest,
} from "@/lib/admin-api";
import type { GuestAdminRead, TableAdminRead } from "@/lib/admin-types";
import {
  ConfirmDialog,
  Field,
  Modal,
  PageHeader,
  PrimaryBtn,
  Spinner,
  StatusBadge,
} from "@/components/admin/ui";

export default function SeatingPage() {
  const token = useAdminToken();
  const [guests, setGuests] = useState<GuestAdminRead[]>([]);
  const [tables, setTables] = useState<TableAdminRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Assign flow
  const [assigningGuest, setAssigningGuest] = useState<GuestAdminRead | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | "">("");
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState("");

  // Unassign
  const [unassignTarget, setUnassignTarget] = useState<{ guest: GuestAdminRead } | null>(null);

  // Create table modal
  const [createOpen, setCreateOpen] = useState(false);
  const [tableName, setTableName] = useState("");
  const [tableSeats, setTableSeats] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  // Delete table confirm
  const [deleteTableTarget, setDeleteTableTarget] = useState<TableAdminRead | null>(null);
  const [deleteTableSaving, setDeleteTableSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [gs, ts] = await Promise.all([getGuests(token), getTables(token)]);
      setGuests(gs);
      setTables(ts);
    } catch {
      setError("Не удалось загрузить данные.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const unassigned = guests.filter((g) => g.table_id === null);

  // ── Assign guest to table ──────────────────────────────────────────────────
  async function handleAssign() {
    if (!assigningGuest || !selectedTableId) return;
    setAssignSaving(true);
    setAssignError("");
    try {
      const updated = await assignGuest(token, assigningGuest.id, Number(selectedTableId));
      // Optimistic: update guest list + table list locally
      setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setTables((prev) =>
        prev.map((t) =>
          t.id === Number(selectedTableId)
            ? { ...t, guests: [...t.guests.filter((g) => g.id !== updated.id), updated], guest_count: t.guest_count + 1 }
            : t
        )
      );
      setAssigningGuest(null);
      setSelectedTableId("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setAssignError(msg.includes("full") ? `Стол заполнен.` : "Ошибка назначения. Попробуйте снова.");
    } finally {
      setAssignSaving(false);
    }
  }

  // ── Unassign guest from table ──────────────────────────────────────────────
  async function handleUnassign() {
    if (!unassignTarget) return;
    const { guest } = unassignTarget;
    try {
      const updated = await unassignGuest(token, guest.id);
      setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setTables((prev) =>
        prev.map((t) =>
          t.id === guest.table_id
            ? { ...t, guests: t.guests.filter((g) => g.id !== guest.id), guest_count: Math.max(0, t.guest_count - 1) }
            : t
        )
      );
    } catch {
      // Reload to ensure consistency
      loadData();
    } finally {
      setUnassignTarget(null);
    }
  }

  // ── Create table ───────────────────────────────────────────────────────────
  async function handleCreateTable(e: React.FormEvent) {
    e.preventDefault();
    if (!tableName.trim() || !tableSeats) return;
    setCreateSaving(true);
    setCreateError("");
    try {
      await createTable(token, { table_name: tableName.trim(), max_seats: Number(tableSeats) });
      setCreateOpen(false);
      setTableName("");
      setTableSeats("");
      loadData(); // Refresh to get TableAdminRead with guests array
    } catch {
      setCreateError("Не удалось создать стол.");
    } finally {
      setCreateSaving(false);
    }
  }

  // ── Delete table ───────────────────────────────────────────────────────────
  async function handleDeleteTable() {
    if (!deleteTableTarget) return;
    setDeleteTableSaving(true);
    try {
      await deleteTable(token, deleteTableTarget.id);
      setTables((prev) => prev.filter((t) => t.id !== deleteTableTarget.id));
      setDeleteTableTarget(null);
    } catch {
      setDeleteTableTarget(null);
    } finally {
      setDeleteTableSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-16 text-[#7A6E60]">
        <Spinner size="md" />
        <span className="font-sans text-sm">Загрузка…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 font-sans text-sm">
        {error}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Рассадка гостей"
        subtitle={`Не назначено: ${unassigned.length} · Столов: ${tables.length}`}
        action={<PrimaryBtn onClick={() => setCreateOpen(true)}>+ Создать стол</PrimaryBtn>}
      />

      <div className="flex gap-6 items-start">
        {/* ── Left: Unassigned guests ─────────────────────────────────────── */}
        <div className="w-72 shrink-0">
          <div className="bg-white rounded-2xl border border-[#E8E4DC] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#F2EBE0] bg-[#FAF7F2]">
              <p className="font-sans text-xs text-[#7A6E60] uppercase tracking-wider font-medium">
                Без стола ({unassigned.length})
              </p>
            </div>
            <div className="divide-y divide-[#F7F5F2] max-h-[60vh] overflow-y-auto">
              {unassigned.length === 0 && (
                <p className="px-4 py-6 font-sans text-sm text-[#7A6E60] text-center">
                  Все гости распределены 🎉
                </p>
              )}
              {unassigned.map((g) => (
                <div key={g.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-sans text-sm text-[#2C2418] font-medium truncate">
                        {g.first_name} {g.last_name}
                      </p>
                      <div className="mt-0.5">
                        <StatusBadge status={g.status} />
                      </div>
                    </div>
                    <button
                      onClick={() => { setAssigningGuest(g); setSelectedTableId(""); setAssignError(""); }}
                      className="shrink-0 px-2.5 py-1 rounded-lg border border-[#C4A35A] text-[#C4A35A] font-sans text-xs hover:bg-[#C4A35A] hover:text-white transition cursor-pointer"
                    >
                      Назначить →
                    </button>
                  </div>

                  {/* Inline assign panel */}
                  {assigningGuest?.id === g.id && (
                    <div className="mt-3 p-3 bg-[#FAF7F2] rounded-xl border border-[#E0D8CC]">
                      <p className="font-sans text-xs text-[#7A6E60] mb-2">Выберите стол:</p>
                      <select
                        value={selectedTableId}
                        onChange={(e) => setSelectedTableId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full font-sans text-sm border border-[#E0D8CC] rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#C4A35A] mb-2 cursor-pointer"
                      >
                        <option value="">— Выберите —</option>
                        {tables.map((t) => (
                          <option
                            key={t.id}
                            value={t.id}
                            disabled={t.guest_count >= t.max_seats}
                          >
                            {t.table_name} ({t.guest_count}/{t.max_seats}){t.guest_count >= t.max_seats ? " — Полный" : ""}
                          </option>
                        ))}
                      </select>
                      {assignError && <p className="font-sans text-xs text-rose-600 mb-2">{assignError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={handleAssign}
                          disabled={!selectedTableId || assignSaving}
                          className="flex-1 py-1.5 rounded-lg bg-[#C4A35A] text-white font-sans text-xs hover:bg-[#B39248] transition disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          {assignSaving ? <Spinner /> : "Подтвердить"}
                        </button>
                        <button
                          onClick={() => setAssigningGuest(null)}
                          className="px-3 py-1.5 rounded-lg border border-[#E0D8CC] font-sans text-xs text-[#7A6E60] hover:bg-white transition cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Table cards ──────────────────────────────────────────── */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
          {tables.length === 0 && (
            <div className="col-span-full text-center py-16">
              <p className="font-sans text-4xl mb-3">🪑</p>
              <p className="font-sans text-sm text-[#7A6E60]">Столов нет. Создайте первый!</p>
            </div>
          )}

          {tables.map((t) => {
            const isFull = t.guest_count >= t.max_seats;
            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-[#E8E4DC] shadow-sm overflow-hidden"
              >
                {/* Card header */}
                <div className="px-4 py-3 border-b border-[#F2EBE0] flex items-center justify-between">
                  <div>
                    <p className="font-sans text-sm font-semibold text-[#2C2418]">{t.table_name}</p>
                    <p className="font-sans text-xs text-[#7A6E60]">
                      {t.guest_count} / {t.max_seats} мест
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFull && (
                      <span className="font-sans text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 border border-rose-200">
                        Полный
                      </span>
                    )}
                    {t.guest_count === 0 && (
                      <button
                        onClick={() => setDeleteTableTarget(t)}
                        className="text-[#C0B8B0] hover:text-rose-500 transition text-lg leading-none cursor-pointer"
                        title="Удалить стол"
                        aria-label="Удалить стол"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>

                {/* Seat fill bar */}
                <div className="px-4 pt-3 pb-0">
                  <div className="h-1.5 bg-[#F2EBE0] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isFull ? "bg-rose-400" : "bg-[#C4A35A]"}`}
                      style={{ width: `${Math.min((t.guest_count / t.max_seats) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Guest list */}
                <div className="px-4 pb-4 pt-3 space-y-2 min-h-[60px]">
                  {t.guests.length === 0 && (
                    <p className="font-sans text-xs text-[#C0B8B0] italic">Пусто</p>
                  )}
                  {t.guests.map((g) => (
                    <div key={g.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusBadge status={g.status} />
                        <span className="font-sans text-sm text-[#2C2418] truncate">
                          {g.first_name} {g.last_name}
                        </span>
                      </div>
                      <button
                        onClick={() => setUnassignTarget({ guest: g })}
                        className="shrink-0 text-[#C0B8B0] hover:text-rose-500 transition font-sans text-xs cursor-pointer"
                        title="Убрать со стола"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Create table modal ──────────────────────────────────────────────── */}
      {createOpen && (
        <Modal title="Создать стол" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreateTable} className="space-y-4">
            <Field
              label="Название стола"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Стол №1"
              required
            />
            <Field
              label="Количество мест"
              type="number"
              min={1}
              max={50}
              value={tableSeats}
              onChange={(e) => setTableSeats(e.target.value)}
              placeholder="8"
              required
            />
            {createError && <p className="font-sans text-sm text-rose-600">{createError}</p>}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#E0D8CC] font-sans text-sm text-[#7A6E60] hover:bg-[#F7F5F2] transition cursor-pointer"
              >
                Отмена
              </button>
              <PrimaryBtn type="submit" loading={createSaving} className="flex-1 justify-center">
                Создать
              </PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Unassign confirm ─────────────────────────────────────────────────── */}
      {unassignTarget && (
        <ConfirmDialog
          message={`Убрать «${unassignTarget.guest.first_name} ${unassignTarget.guest.last_name}» со стола?`}
          confirmLabel="Убрать"
          danger={false}
          onConfirm={handleUnassign}
          onCancel={() => setUnassignTarget(null)}
        />
      )}

      {/* ── Delete table confirm ─────────────────────────────────────────────── */}
      {deleteTableTarget && (
        <ConfirmDialog
          message={`Удалить стол «${deleteTableTarget.table_name}»? Это действие нельзя отменить.`}
          onConfirm={handleDeleteTable}
          onCancel={() => setDeleteTableTarget(null)}
        />
      )}
    </div>
  );
}
