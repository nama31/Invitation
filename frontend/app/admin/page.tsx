"use client";

import { useEffect, useState } from "react";
import { useAdminToken } from "@/lib/admin-context";
import { getStats } from "@/lib/admin-api";
import type { AdminStats } from "@/lib/admin-types";
import { PageHeader, Spinner } from "@/components/admin/ui";

const STAT_CARDS = [
  { key: "total" as const,        label: "Всего гостей",   icon: "👥", color: "bg-blue-50   border-blue-100   text-blue-600" },
  { key: "confirmed" as const,    label: "Подтвердили",    icon: "✅", color: "bg-emerald-50 border-emerald-100 text-emerald-600" },
  { key: "declined" as const,     label: "Отказали",       icon: "❌", color: "bg-rose-50    border-rose-100    text-rose-600" },
  { key: "pending" as const,      label: "Ожидают",        icon: "⏳", color: "bg-amber-50   border-amber-100   text-amber-600" },
  { key: "tables_count" as const, label: "Столы",          icon: "🪑", color: "bg-purple-50  border-purple-100  text-purple-600" },
];

export default function AdminDashboard() {
  const token = useAdminToken();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getStats(token)
      .then(setStats)
      .catch(() => setError("Не удалось загрузить статистику."))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <PageHeader
        title="Дашборд"
        subtitle="Обзор мероприятия"
      />

      {loading && (
        <div className="flex items-center gap-3 py-12 text-[#7A6E60]">
          <Spinner size="md" />
          <span className="font-sans text-sm">Загрузка статистики…</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 font-sans text-sm">
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
            {STAT_CARDS.map(({ key, label, icon, color }) => (
              <div
                key={key}
                className={`rounded-2xl border p-5 ${color.split(" ").slice(0, 2).join(" ")} border-solid`}
                style={{ borderColor: "inherit" }}
              >
                <div className={`text-2xl mb-2`}>{icon}</div>
                <div className="font-sans text-3xl font-bold text-[#2C2418] tabular-nums">
                  {stats[key]}
                </div>
                <div className="font-sans text-xs text-[#7A6E60] mt-1 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>

          {/* Confirmation rate */}
          {stats.total > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8E4DC] p-6">
              <p className="font-sans text-sm font-medium text-[#2C2418] mb-4">
                Процент подтверждения
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-[#F2EBE0] rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.round((stats.confirmed / stats.total) * 100)}%` }}
                  />
                </div>
                <span className="font-sans text-sm font-semibold text-emerald-600 w-12 text-right tabular-nums">
                  {Math.round((stats.confirmed / stats.total) * 100)}%
                </span>
              </div>
              <div className="flex gap-6 mt-4 font-sans text-xs text-[#7A6E60]">
                <span>✅ Придут: <strong className="text-[#2C2418]">{stats.confirmed}</strong></span>
                <span>❌ Отказали: <strong className="text-[#2C2418]">{stats.declined}</strong></span>
                <span>⏳ Ожидают: <strong className="text-[#2C2418]">{stats.pending}</strong></span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
