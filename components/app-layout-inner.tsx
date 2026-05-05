"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { useSidebar } from "@/lib/sidebar-context"

export function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  return (
    <div className="min-h-screen app-bg">
      <AppSidebar />
      <main
        className="transition-all duration-300 p-6"
        style={{ marginLeft: collapsed ? '72px' : '256px' }}
      >
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
