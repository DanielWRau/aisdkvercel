import { DashboardShell } from '@/components/layout/dashboard-shell'

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  )
}
