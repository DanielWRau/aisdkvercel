'use client'

import { useEffect, useState, useCallback } from 'react'
import { useBreadcrumbs } from '@/providers/breadcrumb-provider'
import { useStatusFooter } from '@/providers/status-footer-provider'
import { FileExplorer, type DocumentItem } from '@/components/file-explorer'
import { FileDetailPanel, type DetailDocument } from '@/components/file-detail-panel'
import { getProjectDocumentsWithMedia } from '@/actions/documents'

export function DateienClient({
  project,
  documents: initialDocuments,
}: {
  project: { id: string | number; name: string; [key: string]: unknown }
  documents: DocumentItem[]
}) {
  const { setItems } = useBreadcrumbs()
  const { setStatusText } = useStatusFooter()
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments)
  const [selected, setSelected] = useState<DocumentItem | null>(null)

  useEffect(() => {
    setItems([
      { label: 'Projekte', href: '/projects' },
      { label: project.name, href: `/projects/${project.id}` },
      { label: 'Dateien' },
    ])
  }, [project, setItems])

  useEffect(() => {
    setStatusText(`${documents.length} Dateien`)
  }, [documents.length, setStatusText])

  const handleRefresh = useCallback(async () => {
    const refreshed = await getProjectDocumentsWithMedia(project.id)
    const docs = refreshed as DocumentItem[]
    setDocuments(docs)
    // Update selected doc if it still exists
    if (selected) {
      const updated = docs.find((d) => d.id === selected.id)
      setSelected(updated ?? null)
    }
  }, [project.id, selected])

  const handleDocumentsChange = useCallback(
    (docs: DocumentItem[]) => {
      setDocuments(docs)
      // Deselect if the selected doc was removed
      if (selected && !docs.find((d) => d.id === selected.id)) {
        setSelected(null)
      }
    },
    [selected],
  )

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: File list */}
      <div className="w-full lg:w-1/2 xl:w-[45%] min-w-0 overflow-hidden border-r">
        <FileExplorer
          documents={documents}
          projectId={project.id}
          selectedId={selected?.id}
          onSelect={setSelected}
          onDocumentsChange={handleDocumentsChange}
        />
      </div>
      {/* Right: Detail panel */}
      <div className="hidden lg:block flex-1 min-w-0 min-h-0 overflow-hidden">
        <FileDetailPanel
          doc={selected as DetailDocument | null}
          projectId={project.id}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  )
}
