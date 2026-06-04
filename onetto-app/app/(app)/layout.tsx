import React from 'react'
import TopSidebar from '../components/TopSidebar'

interface AppLayoutProps {
  children: React.ReactNode
}
function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="h-screen flex flex-col lg:flex-row">
      <TopSidebar />

      <main className="flex-1 w-full min-h-0  overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

export default AppLayout