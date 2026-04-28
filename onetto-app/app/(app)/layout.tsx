import React from 'react'
import TopSidebar from '../components/TopSidebar'

interface AppLayoutProps {
  children: React.ReactNode
}
function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-full flex flex-col lg:flex-row">
      <TopSidebar />

      <main className="flex-1 w-full min-h-full p-4">
        {children}
      </main>
    </div>
  )
}

export default AppLayout