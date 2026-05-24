"use client";

import { useEffect, useState } from "react";
import type { EventInfo } from "@/lib/types";

interface CountdownValue {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcCountdown(targetDate: string): CountdownValue {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalSec = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function downloadIcs(info: EventInfo) {
  // Format: 20250914T180000
  const dtstart = info.date.replace(/[-:]/g, "").replace("T", "T").slice(0, 15);
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventInvite//RU",
    "BEGIN:VEVENT",
    `DTSTART:${dtstart}`,
    `SUMMARY:${info.name}`,
    `LOCATION:${info.venue}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "event.ics";
  a.click();
  URL.revokeObjectURL(url);
}

interface HeroProps {
  info: EventInfo;
}

export default function Hero({ info }: HeroProps) {
  const [countdown, setCountdown] = useState<CountdownValue>(() =>
    calcCountdown(info.date)
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => {
      setCountdown(calcCountdown(info.date));
    }, 1000);
    return () => clearInterval(id);
  }, [info.date]);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-20"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #EDE0CC 0%, #FAF7F2 60%)",
      }}
    >
      {/* Decorative top floral line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C4A35A] to-transparent opacity-60" />

      {/* Mono ornament */}
      <p
        className="font-serif text-[#C4A35A] text-5xl mb-6 leading-none select-none"
        aria-hidden="true"
      >
        ✦
      </p>

      {/* Event name */}
      <h1
        className="font-serif text-center leading-tight tracking-wide"
        style={{
          fontSize: "clamp(2.8rem, 9vw, 6rem)",
          color: "#2C2418",
          fontWeight: 500,
          fontStyle: "italic",
        }}
      >
        {info.name}
      </h1>

      {/* Ornament divider */}
      <div className="ornament w-48 sm:w-64 my-5 text-sm text-[#C4A35A]" aria-hidden="true">
        ❧
      </div>

      {/* Date & venue */}
      <p className="font-sans text-[#7A6E60] text-sm sm:text-base uppercase tracking-[0.25em] text-center mb-1">
        {formatEventDate(info.date)}
      </p>
      <p className="font-serif text-[#2C2418] text-xl sm:text-2xl text-center italic mb-10">
        {info.venue}
      </p>

      {/* Countdown */}
      {mounted && (
        <div className="grid grid-cols-4 gap-3 sm:gap-6 mb-10">
          {(
            [
              { label: "Дней", value: countdown.days },
              { label: "Часов", value: countdown.hours },
              { label: "Минут", value: countdown.minutes },
              { label: "Секунд", value: countdown.seconds },
            ] as { label: string; value: number }[]
          ).map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center w-16 sm:w-20 h-16 sm:h-20 rounded-xl border border-[#E0D8CC] bg-white/60 backdrop-blur-sm shadow-sm"
            >
              <span
                className="font-serif text-2xl sm:text-3xl font-semibold leading-none tabular-nums text-[#C4A35A]"
              >
                {pad(value)}
              </span>
              <span className="font-sans text-[10px] sm:text-xs text-[#7A6E60] uppercase tracking-wider mt-1">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add to calendar */}
      <button
        onClick={() => downloadIcs(info)}
        className="font-sans text-sm uppercase tracking-[0.2em] px-8 py-3 rounded-full border border-[#C4A35A] text-[#C4A35A] hover:bg-[#C4A35A] hover:text-white transition-all duration-300 cursor-pointer"
      >
        Добавить в календарь
      </button>

      {/* Scroll cue */}
      <div className="absolute bottom-8 flex flex-col items-center gap-1 opacity-40 animate-bounce">
        <span className="font-sans text-xs tracking-widest uppercase text-[#7A6E60]">
          Листайте
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 3v10M3 9l5 5 5-5" stroke="#7A6E60" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Decorative bottom floral line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C4A35A] to-transparent opacity-60" />
    </section>
  );
}
