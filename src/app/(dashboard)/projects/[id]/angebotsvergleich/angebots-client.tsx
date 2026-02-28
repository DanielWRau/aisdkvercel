'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { getProject } from '@/actions/projects'
import { useBreadcrumbs } from '@/providers/breadcrumb-provider'
import { useStatusFooter } from '@/providers/status-footer-provider'
import { useAngebotsWorkflow } from '@/hooks/use-angebots-workflow'
import { AngebotsWorkflow } from '@/components/angebot/angebots-workflow'
import { AngebotsEditorPanel } from '@/components/angebot/angebots-editor-panel'

type Project = {
  id: string | number
  name: string
}

export function AngebotsClient({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { setItems } = useBreadcrumbs()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const wf = useAngebotsWorkflow(id)
  const { setStatusText } = useStatusFooter()

  useEffect(() => {
    if (wf.documents.vergleich) {
      setStatusText('Auswertung erstellt')
    } else if (wf.documents.anfrage) {
      setStatusText('Anfrage erstellt')
    } else {
      setStatusText('Entwurf')
    }
  }, [wf.documents, setStatusText])

  useEffect(() => {
    async function load() {
      try {
        const proj = await getProject(id)
        setProject({ id: proj.id, name: proj.name })
        setItems([
          { label: 'Projekte', href: '/projects' },
          { label: proj.name, href: `/projects/${proj.id}` },
          { label: 'Angebotsvergleich' },
        ])
      } catch {
        router.push('/projects')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router, setItems])

  if (loading || wf.isLoadingDraft) {
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
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Workflow */}
      <div className="w-full lg:w-1/2 xl:w-[45%] min-w-0 overflow-hidden border-r">
        <AngebotsWorkflow project={project} wf={wf} />
      </div>
      {/* Right: Editor Panel */}
      <div className="hidden lg:flex flex-1 min-w-0 min-h-0 overflow-hidden">
        <AngebotsEditorPanel
          projectId={project.id}
          documents={wf.documents}
          streamingContent={wf.streamingContent}
          streamingTab={wf.streamingTab}
          onRefresh={wf.refreshDocuments}
        />
      </div>
    </div>
  )
}
