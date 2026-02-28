'use client'

import { useEffect, useState, use, type Dispatch, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { getProject } from '@/actions/projects'
import { getProjectDocuments } from '@/actions/documents'
import { useBreadcrumbs } from '@/providers/breadcrumb-provider'
import { WorkspaceProvider } from '@/providers/workspace-provider'
import { BedarfsWorkflow } from '@/components/bedarfs-workflow'
import { DocumentPanel } from '@/components/document-panel'
import { useBedarfsStatusFooter } from '@/hooks/use-bedarfs-status-footer'

type Project = {
  id: string | number
  name: string
  description?: unknown
  projectStatus?: string | null
}

type Document = {
  id: string | number
  title: string
  sourceToolType?: string | null
  jsonData?: unknown
  workflowStatus?: string | null
  createdAt: string
  updatedAt: string
}

export function WorkspaceClient({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { setItems } = useBreadcrumbs()
  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [proj, docs] = await Promise.all([
          getProject(id),
          getProjectDocuments(id),
        ])
        setProject({
          id: proj.id,
          name: proj.name,
          projectStatus: proj.projectStatus,
        })
        setDocuments(docs as unknown as Document[])
        setItems([
          { label: 'Projekte', href: '/projects' },
          { label: proj.name, href: `/projects/${proj.id}` },
          { label: 'Bedarfsanalyse' },
        ])
      } catch {
        router.push('/projects')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router, setItems])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Projekt wird geladen...
        </div>
      </div>
    )
  }

  if (!project) return null

  return (
    <WorkspaceProvider>
      <WorkspaceContent project={project} documents={documents} setDocuments={setDocuments} />
    </WorkspaceProvider>
  )
}

function WorkspaceContent({
  project,
  documents,
  setDocuments,
}: {
  project: Project
  documents: Document[]
  setDocuments: Dispatch<SetStateAction<Document[]>>
}) {
  useBedarfsStatusFooter()

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Workflow */}
      <div className="w-full lg:w-1/2 xl:w-[45%] min-w-0 overflow-hidden border-r">
        <BedarfsWorkflow
          project={project}
          documents={documents}
          onDocumentSaved={(doc) => {
            const d = doc as Document
            setDocuments(prev => {
              const idx = prev.findIndex(p => p.id === d.id)
              if (idx >= 0) {
                const next = [...prev]
                next[idx] = d
                return next
              }
              return [d, ...prev]
            })
          }}
        />
      </div>
      {/* Right: Document Panel */}
      <div className="hidden lg:flex flex-1 min-w-0 min-h-0 overflow-hidden">
        <DocumentPanel documents={documents} />
      </div>
    </div>
  )
}
