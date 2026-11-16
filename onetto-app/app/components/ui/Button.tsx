"use client";

import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-ui-primary text-white hover:bg-ui-primary-hover active:bg-ui-primary-active",
  secondary: "border border-ui-border bg-ui-surface text-ui-text hover:bg-ui-subtle active:bg-ui-primary-soft",
  ghost: "text-ui-text hover:bg-ui-subtle active:bg-ui-primary-soft",
  danger: "bg-ui-danger text-white hover:brightness-90 active:brightness-75",
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`relative inline-flex min-h-11 items-center justify-center gap-2 rounded-ui-control px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      <span className={loading ? "invisible" : undefined}>{children}</span>
      {loading && (
        <>
          <Spinner className="absolute" />
          <span className="sr-only">Chargement en cours</span>
        </>
      )}
    </button>
  );
}

export function IconButton({
  label,
  className = "",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      aria-label={label}
      title={label}
      className={`h-11 w-11 p-0 ${className}`}
      {...props}
    />
  );
}
