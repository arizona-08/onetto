import type { InputHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon: LucideIcon;
}

export function AuthInput({ id, label, icon: Icon, className = "", ...inputProps }: AuthInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-ui-text">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-secondary" aria-hidden="true" />
        <input
          id={id}
          className={`h-11 w-full rounded-ui-control border border-ui-border bg-ui-surface px-4 pl-11 text-sm text-ui-text shadow-ui-card outline-none transition-colors placeholder:text-ui-secondary/70 focus:border-ui-primary focus:ring-2 focus:ring-ui-primary/15 read-only:bg-ui-subtle ${className}`}
          {...inputProps}
        />
      </div>
    </div>
  );
}

export function AuthGoogleButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex h-11 w-full items-center justify-center gap-3 rounded-ui-control border border-ui-border bg-ui-surface px-4 text-sm font-semibold text-ui-text transition-colors hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary"
    >
      <span className="bg-[conic-gradient(#4285f4_0deg_90deg,#34a853_90deg_180deg,#fbbc05_180deg_270deg,#ea4335_270deg_360deg)] bg-clip-text font-title text-lg font-bold leading-none text-transparent" aria-hidden="true">G</span>
      {label}
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-5" aria-hidden="true">
      <span className="h-px flex-1 bg-ui-border" />
      <span className="text-xs text-ui-secondary">ou</span>
      <span className="h-px flex-1 bg-ui-border" />
    </div>
  );
}

export function AuthSubmitButton({ children, disabled, loading }: { children: ReactNode; disabled?: boolean; loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-ui-control bg-ui-primary px-4 text-sm font-semibold text-white shadow-ui-card transition-colors hover:bg-ui-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary disabled:cursor-not-allowed disabled:opacity-65"
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function AuthFeedback({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded-ui-control p-3 text-sm ${kind === "error" ? "bg-ui-danger-soft text-ui-danger" : "bg-ui-success-soft text-ui-success"}`}>
      {children}
    </p>
  );
}

export function AuthFooter({ prompt, href, linkLabel }: { prompt: string; href: string; linkLabel: string }) {
  return (
    <p className="mt-6 text-sm text-ui-secondary">
      {prompt}{" "}
      <Link href={href} className="font-semibold text-ui-primary hover:text-ui-primary-hover focus-visible:outline-2 focus-visible:outline-ui-primary">{linkLabel}</Link>
    </p>
  );
}
