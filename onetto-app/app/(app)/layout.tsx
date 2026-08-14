import React from 'react'
import TopSidebar from '../components/TopSidebar'

interface AppLayoutProps {
  children: React.ReactNode
}
function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col lg:flex-row">
      <TopSidebar />

      <main className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto">
          {children}
      </main>
    </div>
  )
}

export default AppLayout
