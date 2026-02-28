import { getProject } from '@/actions/projects'
import { WorkflowPlaceholder } from '@/components/workflow-placeholder'

export default async function EinstellungenPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProject(id)
  return <WorkflowPlaceholder projectId={id} projectName={project.name as string} title="Einstellungen" />
}
