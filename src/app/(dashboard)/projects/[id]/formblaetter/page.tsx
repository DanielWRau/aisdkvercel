import { getProject } from '@/actions/projects'
import { listFormTemplates, getUniqueSammlungen, getProjectFormblattDocuments } from '@/actions/form-templates'
import { FormblattClient } from './formblatt-client'
import type { ProjektData } from '@/types/project'

export default async function FormblaetterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [project, templates, sammlungen, existingDocs] = await Promise.all([
    getProject(id),
    listFormTemplates(),
    getUniqueSammlungen(),
    getProjectFormblattDocuments(id),
  ])

  const projektData = (project.data as ProjektData) ?? {}

  return (
    <FormblattClient
      projectId={id}
      projectName={project.name as string}
      templates={templates}
      sammlungen={sammlungen}
      schaetzwert={projektData.schaetzwert ?? null}
      existingDocuments={existingDocs.map((d) => ({
        id: d.id,
        tags: d.tags ?? null,
        jsonData: d.jsonData ?? null,
      }))}
    />
  )
}
