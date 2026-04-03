import { SidebarProvider } from "@/lib/sidebar-context"
import { AppLayoutInner } from "@/components/app-layout-inner"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </SidebarProvider>
  )
}
