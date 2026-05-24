"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { searchGuests, submitRsvp } from "@/lib/guests";
import type { Guest, RsvpPayload } from "@/lib/types";

// ─── Sub-components ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-[#C4A35A]"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function StatusBadge({ status }: { status: Guest["status"] }) {
  const map: Record<Guest["status"], { label: string; cls: string }> = {
    pending: { label: "Ожидает", cls: "bg-amber-100 text-amber-700" },
    confirmed: { label: "Придёт", cls: "bg-emerald-100 text-emerald-700" },
    declined: { label: "Не придёт", cls: "bg-rose-100 text-rose-700" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`font-sans text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

// ─── Steps ───────────────────────────────────────────────────────────────────

type Step = "search" | "confirm" | "survey" | "done";

// ─── Main component ───────────────────────────────────────────────────────────

export default function RsvpSection() {
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Guest[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [finalStatus, setFinalStatus] = useState<"confirmed" | "declined" | null>(null);

  // Survey fields
  const [dietary, setDietary] = useState("");
  const [alcohol, setAlcohol] = useState<"none" | "wine" | "beer" | "cocktails">("none");
  const [transport, setTransport] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Search with debounce ──
  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    setSearchError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchGuests(val);
        setResults(data);
      } catch {
        setSearchError("Что-то пошло не так. Попробуйте ещё раз.");
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Select guest ──
  function selectGuest(g: Guest) {
    setSelectedGuest(g);
    setResults([]);
    setQuery("");
    setStep("confirm");
  }

  // ── Confirm intent ──
  function handleIntent(intent: "confirmed" | "declined") {
    setFinalStatus(intent);
    if (intent === "confirmed") {
      setStep("survey");
    } else {
      handleSubmit("declined");
    }
  }

  // ── Submit RSVP ──
  async function handleSubmit(status: "confirmed" | "declined") {
    if (!selectedGuest) return;
    setSubmitting(true);
    setSubmitError("");
    const payload: RsvpPayload = {
      status,
      ...(status === "confirmed"
        ? {
          dietary_preferences: dietary.trim() || null,
          alcohol_preference: alcohol === "none" ? null : alcohol,
          needs_transport: transport,
        }
        : {}),
    };
    try {
      await submitRsvp(selectedGuest.id, payload);
      setFinalStatus(status);
      setStep("done");
    } catch {
      setSubmitError("Не удалось отправить. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Reset ──
  function reset() {
    setStep("search");
    setQuery("");
    setResults([]);
    setSelectedGuest(null);
    setFinalStatus(null);
    setDietary("");
    setAlcohol("none");
    setTransport(false);
    setSubmitError("");
    setSearchError("");
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section
      id="rsvp"
      className="py-24 px-6"
      style={{ background: "linear-gradient(180deg, #FAF7F2 0%, #F2EBE0 100%)" }}
    >
      <div className="max-w-lg mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <p className="font-sans text-xs uppercase tracking-[0.3em] text-[#C4A35A] mb-3">
            Подтверждение
          </p>
          <h2
            className="font-serif italic"
            style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", color: "#2C2418" }}
          >
            Вы придёте?
          </h2>
          <div className="ornament w-40 mx-auto mt-4 text-[#C4A35A] text-sm" aria-hidden="true">
            ✦
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-[#E0D8CC] p-6 sm:p-8">

          {/* ── STEP 1: Search ── */}
          {step === "search" && (
            <div>
              <label htmlFor="guest-search" className="block font-sans text-sm text-[#7A6E60] mb-2">
                Введите ваше имя или фамилию
              </label>
              <div className="relative">
                <input
                  id="guest-search"
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Иванова Анна…"
                  className="w-full font-sans text-base border border-[#E0D8CC] rounded-xl px-4 py-3 pr-10 bg-[#FAF7F2] text-[#2C2418] placeholder:text-[#C0B8B0] focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/40 focus:border-[#C4A35A] transition"
                  autoComplete="off"
                />
                {searching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner />
                  </span>
                )}
              </div>

              {/* Error */}
              {searchError && (
                <p className="font-sans text-sm text-rose-600 mt-2">{searchError}</p>
              )}

              {/* Results dropdown */}
              {results.length > 0 && (
                <ul className="mt-2 rounded-xl border border-[#E0D8CC] bg-white shadow-lg overflow-hidden divide-y divide-[#F2EBE0]">
                  {results.map((g) => (
                    <li key={g.id}>
                      <button
                        onClick={() => selectGuest(g)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#FAF7F2] transition text-left"
                      >
                        <span className="font-sans text-sm text-[#2C2418]">
                          {g.first_name} {g.last_name}
                        </span>
                        <StatusBadge status={g.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!searching && query.trim().length >= 2 && results.length === 0 && !searchError && (
                <p className="font-sans text-sm text-[#7A6E60] mt-3 text-center">
                  Гость не найден. Проверьте написание.
                </p>
              )}
            </div>
          )}

          {/* ── STEP 2: Confirm identity ── */}
          {step === "confirm" && selectedGuest && (
            <div className="text-center">
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-[#C4A35A] mb-2">
                Рады вас видеть
              </p>
              <h3 className="font-serif italic text-3xl sm:text-4xl text-[#2C2418] mb-2">
                Здравствуйте, {selectedGuest.first_name}!
              </h3>
              <p className="font-sans text-sm text-[#7A6E60] mb-2">
                {selectedGuest.first_name} {selectedGuest.last_name}
              </p>
              <div className="flex justify-center mb-6">
                <StatusBadge status={selectedGuest.status} />
              </div>

              <p className="font-sans text-sm text-[#7A6E60] mb-6">
                Пожалуйста, подтвердите своё участие:
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleIntent("confirmed")}
                  className="flex-1 font-sans text-sm uppercase tracking-widest py-3 px-6 rounded-xl bg-[#C4A35A] text-white hover:bg-[#B39248] transition-all duration-200 shadow-sm"
                >
                  Буду на празднике
                </button>
                <button
                  onClick={() => handleIntent("declined")}
                  disabled={submitting}
                  className="flex-1 font-sans text-sm uppercase tracking-widest py-3 px-6 rounded-xl border border-[#E0D8CC] text-[#7A6E60] hover:border-rose-300 hover:text-rose-500 transition-all duration-200 disabled:opacity-50"
                >
                  {submitting ? <Spinner /> : " Не смогу прийти"}
                </button>
              </div>

              <button
                onClick={reset}
                className="mt-4 font-sans text-xs text-[#7A6E60] underline underline-offset-2 hover:text-[#C4A35A] transition"
              >
                ← Поиск
              </button>
            </div>
          )}

          {/* ── STEP 3: Survey ── */}
          {step === "survey" && (
            <div className="text-center py-4">
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-[#C4A35A] mb-2">
                Последний шаг
              </p>
              <h3 className="font-serif italic text-2xl sm:text-3xl text-[#2C2418] mb-4">
                Подтверждение участия
              </h3>
              <p className="font-sans text-sm text-[#7A6E60] mb-8 leading-relaxed">
                Вы подтверждаете, что сможете присутствовать на нашем празднике? Мы с нетерпением ждем встречи с вами!
              </p>

              {submitError && (
                <p className="font-sans text-sm text-rose-600 mb-4">{submitError}</p>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleSubmit("confirmed")}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 font-sans text-sm uppercase tracking-widest py-3.5 px-6 rounded-xl bg-[#C4A35A] text-white hover:bg-[#B39248] transition-all duration-200 shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? <Spinner /> : "Подтвердить участие"}
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  disabled={submitting}
                  className="w-full font-sans text-xs text-[#7A6E60] underline underline-offset-2 hover:text-[#C4A35A] transition py-2"
                >
                  Назад
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Done ── */}
          {step === "done" && (
            <div className="text-center py-4">
              <p className="text-5xl mb-4">{finalStatus === "confirmed" ? "🎉" : "💙"}</p>
              <h3 className="font-serif italic text-2xl sm:text-3xl text-[#2C2418] mb-3">
                {finalStatus === "confirmed"
                  ? "Мы так рады, что вы будете с нами!"
                  : "Жаль, что не получится. Будем скучать!"}
              </h3>
              <p className="font-sans text-sm text-[#7A6E60] mb-6">
                {finalStatus === "confirmed"
                  ? "Ваш ответ получен. Ждём не дождёмся увидеть вас!"
                  : "Спасибо, что сообщили. Желаем вам всего самого лучшего."}
              </p>
              <button
                onClick={reset}
                className="font-sans text-xs text-[#7A6E60] underline underline-offset-2 hover:text-[#C4A35A] transition"
              >
                Ответить за другого гостя
              </button>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
