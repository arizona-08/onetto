import type { ReactNode } from "react";
import AdminPageHeader from "@/app/components/AdminPageHeader";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-zinc-50 p-4 sm:p-6">
      <main className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader />
        {children}
      </main>
    </div>
  );
}
