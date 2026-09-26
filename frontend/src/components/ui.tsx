import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { X, Search, AlertTriangle, Inbox, RefreshCw, Loader2 } from 'lucide-react';

/* ---------------- Button ---------------- */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

export function Button({
  variant = 'primary',
  loading = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-sky-500 text-navy-900 hover:bg-sky-400 font-semibold',
    secondary: 'bg-navy-600 text-slate-100 hover:bg-navy-700 border border-white/10',
    ghost: 'bg-transparent text-slate-300 hover:bg-white/5',
    danger: 'bg-red-500/90 text-white hover:bg-red-500',
    success: 'bg-emerald-500/90 text-navy-900 hover:bg-emerald-500 font-semibold',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ---------------- Badge ---------------- */
const badgeTones: Record<string, string> = {
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  orange: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  red: 'bg-red-500/15 text-red-300 border-red-500/30',
  blue: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  gray: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

export function Badge({ tone = 'gray', children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

/* ---------------- Card ---------------- */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-navy-800/70 p-5 ${className}`}>{children}</div>
  );
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-white">{children}</h2>
      {sub && <p className="mt-0.5 text-sm text-slate-400">{sub}</p>}
    </div>
  );
}

/* ---------------- Inputs ---------------- */
export function Input({
  label,
  error,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span>}
      <input
        className={`w-full rounded-lg border bg-navy-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 ${
          error ? 'border-red-500/60' : 'border-white/10'
        } ${className}`}
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}

export function Select({
  label,
  error,
  children,
  className = '',
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span>}
      <select
        className={`w-full rounded-lg border bg-navy-900/60 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 ${
          error ? 'border-red-500/60' : 'border-white/10'
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}

export function Textarea({
  label,
  error,
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span>}
      <textarea
        className={`w-full rounded-lg border bg-navy-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 ${
          error ? 'border-red-500/60' : 'border-white/10'
        } ${className}`}
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}

/* ---------------- SearchBar ---------------- */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
      <input
        type="search"
        aria-label={label ?? placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-navy-900/60 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400"
      />
    </div>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
      <div
        className={`glass relative z-10 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-2xl border border-white/10 p-6 shadow-2xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- ConfirmDialog ---------------- */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-slate-300">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ---------------- States ---------------- */
export function LoadingSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-navy-700/60" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-navy-800/40 px-6 py-12 text-center">
      <Inbox className="mb-3 h-10 w-10 text-slate-500" aria-hidden />
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-400">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-12 text-center">
      <AlertTriangle className="mb-3 h-10 w-10 text-red-400" aria-hidden />
      <h3 className="text-base font-semibold text-white">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-400">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}

/* ---------------- KpiCard ---------------- */
export function KpiCard({
  icon,
  label,
  value,
  tone = 'blue',
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone?: 'blue' | 'green' | 'red' | 'orange' | 'yellow';
}) {
  const tones: Record<string, string> = {
    blue: 'text-sky-300 bg-sky-500/10',
    green: 'text-emerald-300 bg-emerald-500/10',
    red: 'text-red-300 bg-red-500/10',
    orange: 'text-orange-300 bg-orange-500/10',
    yellow: 'text-yellow-300 bg-yellow-500/10',
  };
  return (
    <Card className="flex items-center gap-4">
      <div className={`rounded-xl p-3 ${tones[tone]}`} aria-hidden>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold leading-tight text-white">{value}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      </div>
    </Card>
  );
}
