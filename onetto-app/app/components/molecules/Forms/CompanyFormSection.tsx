import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface CompanyFormSectionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}

export default function CompanyFormSection({ title, description, icon: Icon, children }: CompanyFormSectionProps) {
  return (
    <section className="rounded-ui-card border border-ui-border bg-ui-surface p-5 shadow-ui-card sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui-control bg-ui-primary-soft text-ui-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-title text-lg font-semibold text-ui-text">{title}</h2>
          <p className="mt-0.5 text-sm text-ui-secondary">{description}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
