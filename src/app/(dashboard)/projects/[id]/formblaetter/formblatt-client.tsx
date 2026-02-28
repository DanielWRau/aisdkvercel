'use client'

import { useEffect, useCallback, useRef, useMemo } from 'react'
import { useBreadcrumbs } from '@/providers/breadcrumb-provider'
import { FormblattProvider, useFormblatt, type FormblattTab } from '@/providers/formblatt-provider'
import { FormblattSelector } from '@/components/formblatt-selector'
import { FormblattPanel } from '@/components/formblatt-panel'
import type { FormTemplateItem } from '@/actions/form-templates'

type Props = {
  projectId: string
  projectName: string
  templates: FormTemplateItem[]
  sammlungen: string[]
  schaetzwert: number | null
  existingDocuments: {
    id: string | number
    tags?: { tag: string }[] | null
    jsonData?: Record<string, unknown> | null
  }[]
}

export function FormblattClient(props: Props) {
  const { templates, existingDocuments } = props

  // Build initialTabs from existing documents with jsonData
  const initialTabs: FormblattTab[] = useMemo(() => {
    return existingDocuments
      .filter((d) => d.jsonData?._meta)
      .map((d) => {
        const meta = (d.jsonData as Record<string, unknown>)._meta as {
          formularNummer?: string
          name?: string
        }
        const tmpl = templates.find((t) => t.formularNummer === meta.formularNummer)
        return {
          tabId: `doc:${d.id}`,
          templateId: String(tmpl?.id ?? d.id),
          formularNummer: meta.formularNummer ?? '',
          name: meta.name ?? '',
          status: 'done' as const,
          content: d.jsonData,
          documentId: String(d.id),
        }
      })
  }, [existingDocuments, templates])

  return (
    <FormblattProvider initialTabs={initialTabs}>
      <FormblattContent {...props} />
    </FormblattProvider>
  )
}

function FormblattContent({
  projectId,
  projectName,
  templates,
  sammlungen,
  schaetzwert,
  existingDocuments,
}: Props) {
  const { setItems } = useBreadcrumbs()
  const { tabs, setActiveTab, updateTab, isGenerating, setIsGenerating } = useFormblatt()
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setItems([
      { label: 'Projekte', href: '/projects' },
      { label: projectName, href: `/projects/${projectId}` },
      { label: 'Formblätter' },
    ])
  }, [setItems, projectName, projectId])

  // Sequential generation: watch for tabs change (new generation requested)
  const startGeneration = useCallback(async () => {
    if (isGenerating) return
    if (tabs.length === 0) return
    // Only start if all idle tabs exist (skip done tabs from initial load)
    const idleTabs = tabs.filter((t) => t.status === 'idle')
    if (idleTabs.length === 0) return

    setIsGenerating(true)
    abortRef.current = new AbortController()

    for (const tab of idleTabs) {
      if (abortRef.current.signal.aborted) break

      updateTab(tab.tabId, { status: 'generating' })
      setActiveTab(tab.tabId)

      try {
        const res = await fetch(`/projects/${projectId}/api/formblatt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: tab.templateId }),
          signal: abortRef.current.signal,
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          updateTab(tab.tabId, { status: 'idle', error: err.error ?? 'Fehler' })
          continue
        }

        // Read SSE stream
        const reader = res.body?.getReader()
        if (!reader) {
          updateTab(tab.tabId, { status: 'idle', error: 'Kein Stream' })
          continue
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const json = line.slice(6).trim()
            if (!json) continue

            try {
              const msg = JSON.parse(json)

              if (msg.error) {
                updateTab(tab.tabId, {
                  status: 'idle',
                  error: msg.error,
                  content: msg.result ?? undefined,
                })
              } else if (msg.done) {
                updateTab(tab.tabId, {
                  status: 'done',
                  content: msg.result,
                  documentId: msg.documentId ? String(msg.documentId) : undefined,
                })
              } else if (msg.partial) {
                updateTab(tab.tabId, { status: 'streaming', content: msg.partial })
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }

        // If still streaming after stream ends, mark as done
        // (handles case where final 'done' message was missed)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          updateTab(tab.tabId, {
            status: 'idle',
            error: err instanceof Error ? err.message : 'Unbekannter Fehler',
          })
        }
      }
    }

    setIsGenerating(false)
    abortRef.current = null
  }, [tabs, isGenerating, projectId, updateTab, setActiveTab, setIsGenerating])

  // Trigger generation when new idle tabs appear
  useEffect(() => {
    const hasIdle = tabs.some((t) => t.status === 'idle')
    if (hasIdle && !isGenerating) {
      startGeneration()
    }
  }, [tabs, isGenerating, startGeneration])

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Selector */}
      <div className="w-full lg:w-1/2 xl:w-[40%] min-w-0 overflow-hidden border-r">
        <FormblattSelector
          templates={templates}
          sammlungen={sammlungen}
          schaetzwert={schaetzwert}
          existingDocuments={existingDocuments}
        />
      </div>
      {/* Right: Panel */}
      <div className="hidden lg:flex flex-1 min-w-0 min-h-0 overflow-hidden">
        <FormblattPanel />
      </div>
    </div>
  )
}
