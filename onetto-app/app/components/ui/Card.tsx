import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={`min-w-0 rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card sm:p-6 ${className}`}
      {...props}
    />
  );
}
