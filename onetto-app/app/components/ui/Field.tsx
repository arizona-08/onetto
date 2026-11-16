import type { HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const controlClass =
  "min-h-11 w-full rounded-ui-control border border-ui-control bg-ui-surface px-3 py-2 text-sm text-ui-text placeholder:text-ui-secondary transition-colors focus-visible:border-ui-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary disabled:cursor-not-allowed disabled:bg-ui-subtle disabled:text-ui-secondary";

export function Field({
  id,
  label,
  hint,
  error,
  children,
  className = "",
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-ui-text">{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-ui-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ui-secondary">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClass} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${controlClass} ${className}`} {...props} />;
}

export function Separator({ className = "", ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={`border-ui-border ${className}`} {...props} />;
}
