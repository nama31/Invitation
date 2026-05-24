import type { GuestStatus } from "@/lib/types";

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = "sm" }: { size?: "sm" | "md" }) {
  const s = size === "sm" ? "h-4 w-4" : "h-7 w-7";
  return (
    <svg className={`animate-spin ${s} text-[#C4A35A]`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ── Skeleton row ─────────────────────────────────────────────────────────────
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-[#E8E4DC] rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: GuestStatus }) {
  const cfg: Record<GuestStatus, { label: string; cls: string }> = {
    pending:   { label: "Ожидает",    cls: "bg-amber-100 text-amber-700 border border-amber-200" },
    confirmed: { label: "Придёт",     cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
    declined:  { label: "Не придёт", cls: "bg-rose-100 text-rose-700 border border-rose-200" },
  };
  const { label, cls } = cfg[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}
export function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full sm:max-w-md mx-0 sm:mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-sans text-lg font-semibold text-[#2C2418]">{title}</h3>
          <button onClick={onClose} className="text-[#7A6E60] hover:text-[#2C2418] transition text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
export function ConfirmDialog({
  message,
  confirmLabel = "Удалить",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <p className="font-sans text-sm text-[#2C2418] leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-[#E0D8CC] font-sans text-sm text-[#7A6E60] hover:bg-[#F7F5F2] transition"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl font-sans text-sm text-white transition ${danger ? "bg-rose-500 hover:bg-rose-600" : "bg-[#C4A35A] hover:bg-[#B39248]"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Input field ───────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
export function Field({ label, ...props }: InputProps) {
  return (
    <label className="block">
      <span className="font-sans text-xs text-[#7A6E60] uppercase tracking-wider mb-1 block">{label}</span>
      <input
        {...props}
        className="w-full font-sans text-sm border border-[#E0D8CC] rounded-xl px-3 py-2.5 bg-[#FAF7F2] text-[#2C2418] focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/30 focus:border-[#C4A35A] transition"
      />
    </label>
  );
}

// ── Page header ───────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-[#2C2418]">{title}</h1>
        {subtitle && <p className="font-sans text-sm text-[#7A6E60] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Primary button ────────────────────────────────────────────────────────────
export function PrimaryBtn({
  children,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C4A35A] text-white font-sans text-sm hover:bg-[#B39248] transition disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
