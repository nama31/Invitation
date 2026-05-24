"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch<{ access_token: string; token_type: string }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      );
      localStorage.setItem("admin_token", data.access_token);
      router.push("/admin");
    } catch {
      setError("Неверный email или пароль.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1C1A17] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <p className="font-serif italic text-[#C4A35A] text-4xl mb-2">EventInvite</p>
          <p className="font-sans text-xs text-white/30 uppercase tracking-[0.25em]">Панель управления</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <h1 className="font-sans text-white text-xl font-semibold mb-6">Вход</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="font-sans text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@event.com"
                className="w-full font-sans text-sm bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-[#C4A35A] focus:ring-1 focus:ring-[#C4A35A]/30 transition"
              />
            </label>

            <label className="block">
              <span className="font-sans text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Пароль</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full font-sans text-sm bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-[#C4A35A] focus:ring-1 focus:ring-[#C4A35A]/30 transition"
              />
            </label>

            {error && (
              <p className="font-sans text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-[#C4A35A] text-white font-sans text-sm font-medium hover:bg-[#B39248] transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Вход…
                </>
              ) : "Войти"}
            </button>
          </form>
        </div>

        <p className="text-center font-sans text-xs text-white/20 mt-6">
          EventInvite · Admin
        </p>
      </div>
    </div>
  );
}
