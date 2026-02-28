'use client'

import { useEffect } from 'react'
import { useBreadcrumbs } from '@/providers/breadcrumb-provider'
import { useStatusFooter } from '@/providers/status-footer-provider'
import { Construction } from 'lucide-react'

export function WorkflowPlaceholder({
  projectId,
  projectName,
  title,
}: {
  projectId: string
  projectName: string
  title: string
}) {
  const { setItems } = useBreadcrumbs()
  const { setStatusText, setCopyContent } = useStatusFooter()

  useEffect(() => {
    setItems([
      { label: 'Projekte', href: '/projects' },
      { label: projectName, href: `/projects/${projectId}` },
      { label: title },
    ])
  }, [projectId, projectName, title, setItems])

  useEffect(() => {
    setStatusText('Noch nicht verfügbar')
    setCopyContent(null)
    return () => {
      setStatusText('')
      setCopyContent(null)
    }
  }, [setStatusText, setCopyContent])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Construction className="size-12 opacity-40" />
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm">Dieser Bereich wird bald verfügbar sein.</p>
    </div>
  )
}
