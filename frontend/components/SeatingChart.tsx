"use client";

import { useEffect, useRef, useState } from "react";
import { getSeatingPlan } from "@/lib/api";
import type { SeatingTable } from "@/lib/api";

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#E0D8CC] shadow-sm p-5 animate-pulse">
      <div className="flex justify-between items-center mb-3">
        <div className="h-4 bg-[#E8E4DC] rounded w-1/2" />
        <div className="h-3 bg-[#E8E4DC] rounded w-12" />
      </div>
      <div className="border-t border-[#F2EBE0] mb-3" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-3 bg-[#F2EBE0] rounded w-4/5" />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SeatingChart() {
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  // One ref per table card for scrollIntoView
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    getSeatingPlan()
      .then(setTables)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // ── Live WebSocket updates ─────────────────────────────────────────────────
  useEffect(() => {
    // Derive the WS URL from the public API URL:
    // "http://localhost:8000" → "ws://localhost:8000/api/ws"
    // "https://api.example.com" → "wss://api.example.com/api/ws"
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const wsUrl = apiUrl.replace(/^http/, "ws") + "/api/ws";

    let ws: WebSocket | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 1_000; // start at 1 s, cap at 30 s
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as { type: string };
          if (msg.type === "seating_updated") {
            // Re-fetch without resetting the search query
            getSeatingPlan().then(setTables).catch(() => { /* keep stale data */ });
          }
        } catch {
          // Ignore non-JSON frames
        }
      };

      ws.onclose = () => {
        if (destroyed) return;
        // Exponential back-off reconnect (cap at 30 s)
        retryTimeout = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30_000);
          connect();
        }, retryDelay);
      };

      ws.onerror = () => {
        ws?.close(); // triggers onclose → reconnect
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      ws?.close();
    };
  }, []);

  // Scroll to first matching table when query is long enough
  useEffect(() => {
    if (query.trim().length < 2) return;
    const q = query.toLowerCase();
    const firstMatch = tables.find((t) =>
      t.guests.some(
        (g) =>
          g.first_name.toLowerCase().includes(q) ||
          g.last_name.toLowerCase().includes(q) ||
          `${g.first_name} ${g.last_name}`.toLowerCase().includes(q)
      )
    );
    if (firstMatch) {
      const el = cardRefs.current.get(firstMatch.table_id);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [query, tables]);

  // Derived state
  const q = query.trim().toLowerCase();
  const hasQuery = q.length > 0;

  const visibleTables = hasQuery
    ? tables.filter((t) =>
        t.guests.some(
          (g) =>
            g.first_name.toLowerCase().includes(q) ||
            g.last_name.toLowerCase().includes(q) ||
            `${g.first_name} ${g.last_name}`.toLowerCase().includes(q)
        )
      )
    : [];

  const allEmpty =
    !loading && !error && tables.length > 0 && tables.every((t) => t.guests.length === 0);
  const noResults = hasQuery && !loading && visibleTables.length === 0;
  const showEmpty = !loading && !error && tables.length === 0;

  function isMatch(g: { first_name: string; last_name: string }) {
    if (!hasQuery) return false;
    const full = `${g.first_name} ${g.last_name}`.toLowerCase();
    return (
      g.first_name.toLowerCase().includes(q) ||
      g.last_name.toLowerCase().includes(q) ||
      full.includes(q)
    );
  }

  return (
    <section
      id="seating"
      className="py-24 px-6 bg-[#FAF7F2]"
    >
      <div className="max-w-4xl mx-auto">

        {/* Heading — same style as other sections */}
        <div className="text-center mb-12">
          <p className="font-sans text-xs uppercase tracking-[0.3em] text-[#C4A35A] mb-3">
            Рассадка
          </p>
          <h2
            className="font-serif italic"
            style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", color: "#2C2418" }}
          >
            Ваше место
          </h2>
          <div className="ornament w-40 mx-auto mt-4 text-[#C4A35A] text-sm" aria-hidden="true">
            ✦
          </div>
          <p className="font-sans text-sm text-[#7A6E60] mt-4">
            Найдите своё место за столом
          </p>
        </div>

        {/* Search bar */}
        {!error && !showEmpty && !allEmpty && (
          <div className="flex justify-center mb-8">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Введите своё имя…"
                className="w-full font-sans text-sm border border-[#E0D8CC] rounded-xl px-4 py-3 pl-10 bg-white text-[#2C2418] placeholder:text-[#C0B8B0] focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/30 focus:border-[#C4A35A] transition shadow-sm"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C0B8B0]"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
          </div>
        )}

        {/* No-results message */}
        {noResults && (
          <p className="text-center font-sans text-sm text-[#7A6E60] italic mb-8">
            Гость с таким именем не найден.
          </p>
        )}

        {/* Error state */}
        {error && (
          <p className="text-center font-sans text-sm text-[#7A6E60] italic py-10">
            Не удалось загрузить рассадку. Попробуйте позже.
          </p>
        )}

        {/* Empty / coming-soon state */}
        {(showEmpty || allEmpty) && (
          <p className="text-center font-serif italic text-lg text-[#7A6E60] py-10">
            Рассадка будет доступна позже ✨
          </p>
        )}

        {/* Skeleton loading grid */}
        {loading && hasQuery && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Table cards grid */}
        {!loading && !error && visibleTables.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTables.map((t) => (
              <div
                key={t.table_id}
                ref={(el) => {
                  if (el) cardRefs.current.set(t.table_id, el);
                  else cardRefs.current.delete(t.table_id);
                }}
                className="bg-white rounded-2xl border border-[#E0D8CC] shadow-sm p-5 transition-shadow hover:shadow-md"
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-2">
                  <p className="font-sans text-sm font-bold text-[#2C2418]">
                    {t.table_name}
                  </p>
                  <p className="font-sans text-xs text-[#7A6E60] tabular-nums">
                    {t.guests.length}&thinsp;/&thinsp;{t.max_seats}
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-[#F2EBE0] mb-3" />

                {/* Guest list */}
                {t.guests.length === 0 ? (
                  <p className="font-sans text-xs text-[#C0B8B0] italic">
                    Гостей пока нет
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {t.guests.map((g, i) => {
                      const highlighted = isMatch(g);
                      return (
                        <li
                          key={i}
                          className={`font-sans text-sm flex items-center gap-1.5 ${highlighted
                            ? "font-semibold text-amber-700"
                            : "text-[#2C2418]"
                            }`}
                        >
                          <span className={`text-[10px] ${highlighted ? "text-amber-500" : "text-[#C4A35A]"}`}>
                            •
                          </span>
                          {g.first_name} {g.last_name}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
