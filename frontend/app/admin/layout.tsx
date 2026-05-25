"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AdminTokenContext } from "@/lib/admin-context";

const NAV = [
  { href: "/admin",         label: "Дашборд",  icon: "📊" },
  { href: "/admin/guests",  label: "Гости",    icon: "👥" },
  { href: "/admin/seating", label: "Рассадка", icon: "🪑" },
  { href: "/admin/photos",  label: "Фото",     icon: "📸" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    const stored = localStorage.getItem("admin_token");
    if (!stored && !isLoginPage) {
      router.replace("/admin/login");
      return;
    }
    setToken(stored ?? "");
    setChecked(true);
  }, [isLoginPage, router]);

  function logout() {
    localStorage.removeItem("admin_token");
    router.push("/admin/login");
  }

  // Login page: render children directly (no sidebar)
  if (isLoginPage) {
    return (
      <AdminTokenContext.Provider value="">
        {children}
      </AdminTokenContext.Provider>
    );
  }

  // Not yet verified — blank loading state while redirect fires
  if (!checked) {
    return (
      <div className="min-h-screen bg-[#1C1A17] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#C4A35A]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="font-sans text-xs text-white/40 uppercase tracking-widest">Загрузка…</p>
        </div>
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <AdminTokenContext.Provider value={token ?? ""}>
      <div className="flex min-h-screen bg-[#F7F5F2]">

        {/* ── Sidebar (desktop) ─────────────────────────────────── */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col bg-[#1C1A17] text-white fixed inset-y-0 left-0 z-30">
          {/* Brand */}
          <div className="px-6 py-6 border-b border-white/10">
            <p className="font-serif italic text-[#C4A35A] text-xl leading-none">EventInvite</p>
            <p className="font-sans text-[10px] text-white/30 mt-1 uppercase tracking-[0.2em]">Admin Panel</p>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {NAV.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-sans text-sm transition-all duration-150 ${
                  isActive(href)
                    ? "bg-[#C4A35A] text-white font-medium shadow-sm"
                    : "text-white/55 hover:text-white hover:bg-white/8"
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="px-3 py-4 border-t border-white/10">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-sans text-xs text-white/40 hover:text-white/70 transition mb-1"
            >
              <span>🌐</span> Сайт гостей
            </Link>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-sans text-sm text-white/50 hover:text-rose-400 hover:bg-white/5 transition-all cursor-pointer"
            >
              <span>🚪</span> Выйти
            </button>
          </div>
        </aside>

        {/* ── Mobile top bar ────────────────────────────────────── */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[#1C1A17] border-b border-white/10 flex items-center justify-between px-4 h-14">
          <p className="font-serif italic text-[#C4A35A] text-lg">EventInvite Admin</p>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white/60 hover:text-white p-1 transition"
            aria-label="Меню"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile menu overlay */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-20 bg-black/50" onClick={() => setMobileOpen(false)}>
            <div
              className="absolute top-14 left-0 right-0 bg-[#1C1A17] border-b border-white/10 px-3 py-4 space-y-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {NAV.map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg font-sans text-sm transition-all ${
                    isActive(href) ? "bg-[#C4A35A] text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  <span>{icon}</span>{label}
                </Link>
              ))}
              <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-3 text-white/50 font-sans text-sm hover:text-rose-400 transition cursor-pointer">
                <span>🚪</span> Выйти
              </button>
            </div>
          </div>
        )}

        {/* ── Main content ──────────────────────────────────────── */}
        <main className="flex-1 md:ml-60 mt-14 md:mt-0 overflow-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </AdminTokenContext.Provider>
  );
}
