import React from "react";
import TopSidebar from "../components/TopSidebar";
import EmailVerificationBanner from "../components/EmailVerificationBanner";

interface AppLayoutProps {
  children: React.ReactNode;
}
function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-ui-background text-ui-text lg:fixed lg:inset-0 lg:h-dvh lg:min-h-0 lg:flex-row lg:overflow-hidden">
      <TopSidebar />

      <main className="min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto lg:overscroll-contain">
        <EmailVerificationBanner />
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
