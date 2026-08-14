import SettingsNavigation from '@/app/components/molecules/Settings/SettingsNavigation'
import React from 'react'

interface SettingsLayoutProps {
  children: React.ReactNode
}
function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="flex flex-col">
      <SettingsNavigation />

      {children}
    </div>
  )
}

export default SettingsLayout
