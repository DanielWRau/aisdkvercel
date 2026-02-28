'use client'

import { Loader2, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useFormblatt } from '@/providers/formblatt-provider'
import { formSchemas } from '@/data/form-schemas'
import { renderFormToMarkdown, type FormStructure } from '@/lib/form-structure'

export function FormblattPanel() {
  const { tabs, activeTab, setActiveTab } = useFormblatt()

  if (tabs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground p-8">
        <FileText className="size-12 opacity-40" />
        <p className="text-sm text-center">
          Wähle Formulare im linken Panel aus und klicke &quot;Generieren&quot;
        </p>
      </div>
    )
  }

  const currentTab = tabs.find((t) => t.tabId === activeTab) ?? tabs[0]

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {/* Tab bar */}
      <div className="shrink-0 border-b bg-background overflow-x-auto">
        <div className="flex">
          {tabs.map((tab) => {
            const isActive = tab.tabId === (activeTab ?? tabs[0]?.tabId)
            return (
              <button
                key={tab.tabId}
                type="button"
                onClick={() => setActiveTab(tab.tabId)}
                className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.status === 'generating' || tab.status === 'streaming' ? (
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                ) : tab.status === 'done' ? (
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                ) : tab.error ? (
                  <AlertCircle className="size-3.5 text-destructive" />
                ) : null}
                {tab.formularNummer}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {currentTab && <TabContent tab={currentTab} />}
      </div>
    </div>
  )
}

function TabContent({ tab }: { tab: ReturnType<typeof useFormblatt>['tabs'][0] }) {
  if (tab.error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-destructive py-12">
        <AlertCircle className="size-8" />
        <p className="text-sm text-center">{tab.error}</p>
      </div>
    )
  }

  if (tab.status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground py-12">
        <FileText className="size-8 opacity-40" />
        <p className="text-sm">{tab.formularNummer}: {tab.name}</p>
        <p className="text-xs">Wird in Kürze generiert...</p>
      </div>
    )
  }

  if (tab.status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {tab.formularNummer} wird generiert...
        </p>
      </div>
    )
  }

  // streaming or done — render content as markdown
  const markdown = renderContent(tab)

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
      {tab.status === 'streaming' && (
        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
      )}
    </div>
  )
}

function renderContent(tab: ReturnType<typeof useFormblatt>['tabs'][0]): string {
  if (!tab.content) return ''

  // If done and has _meta, try structure-based rendering first
  const content = tab.content as Record<string, unknown>
  const meta = content._meta as {
    formularNummer?: string
    name?: string
    structureSnapshot?: FormStructure
  } | undefined

  if (meta?.structureSnapshot) {
    try {
      return renderFormToMarkdown(meta.structureSnapshot, content, {
        formularNummer: meta.formularNummer ?? '',
        name: meta.name ?? '',
      })
    } catch {
      // Fall through to legacy
    }
  }

  if (meta?.formularNummer) {
    const renderer = formSchemas[meta.formularNummer]
    if (renderer) return renderer.toMarkdown(content)
  }

  // For partial streaming objects, render what we can
  if (typeof content === 'object') {
    return objectToMarkdown(content)
  }

  return String(content)
}

function objectToMarkdown(obj: Record<string, unknown>, depth = 2): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_meta') continue
    if (value === null || value === undefined) continue

    if (Array.isArray(value)) {
      lines.push(`${'#'.repeat(depth)} ${formatKey(key)}`)
      for (const item of value) {
        lines.push(`- ${typeof item === 'string' ? item : JSON.stringify(item)}`)
      }
      lines.push('')
    } else if (typeof value === 'object') {
      lines.push(`${'#'.repeat(depth)} ${formatKey(key)}`)
      lines.push(objectToMarkdown(value as Record<string, unknown>, Math.min(depth + 1, 4)))
    } else {
      lines.push(`**${formatKey(key)}:** ${String(value)}`)
      lines.push('')
    }
  }
  return lines.join('\n')
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}
