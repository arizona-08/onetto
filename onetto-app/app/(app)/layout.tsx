import React from 'react'
import TopSidebar from '../components/TopSidebar'
import EmailVerificationBanner from '../components/EmailVerificationBanner'

interface AppLayoutProps {
  children: React.ReactNode
}
function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row">
      <TopSidebar />

      <main className="min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <EmailVerificationBanner />
          {children}
      </main>
    </div>
  )
}

export default AppLayout
