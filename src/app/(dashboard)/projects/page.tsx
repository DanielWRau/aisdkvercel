import { DashboardShell } from '@/components/layout/dashboard-shell'
import { ProjectsClient } from './projects-client'

export default function ProjectsPage() {
  return (
    <DashboardShell>
      <ProjectsClient />
    </DashboardShell>
  )
}
