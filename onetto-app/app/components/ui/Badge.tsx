import type { HTMLAttributes } from "react";

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-ui-subtle text-ui-secondary",
  primary: "bg-ui-primary-soft text-ui-primary",
  success: "bg-ui-success-soft text-ui-success",
  warning: "bg-ui-warning-soft text-ui-warning",
  danger: "bg-ui-danger-soft text-ui-danger",
  info: "bg-ui-info-soft text-ui-info",
};

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
