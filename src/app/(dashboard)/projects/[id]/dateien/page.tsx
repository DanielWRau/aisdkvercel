import { getProject } from '@/actions/projects'
import { getProjectDocumentsWithMedia } from '@/actions/documents'
import { DateienClient } from './dateien-client'
import type { DocumentItem } from '@/components/file-explorer'

export default async function DateienPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [project, documents] = await Promise.all([
    getProject(id),
    getProjectDocumentsWithMedia(id),
  ])
  return (
    <DateienClient
      project={{ id: project.id, name: project.name as string }}
      documents={documents as DocumentItem[]}
    />
  )
}
