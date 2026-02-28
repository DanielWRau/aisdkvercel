'use client'

import { useWorkspace, type WorkspaceTab } from '@/providers/workspace-provider'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText } from 'lucide-react'
import { getTransformer } from '@/lib/tool-transformers'

type Document = {
  id: string | number
  title: string
  sourceToolType?: string | null
  markdown?: string | null
  createdAt: string
}

const TAB_CONFIG: { key: WorkspaceTab; label: string }[] = [
  { key: 'bedarfsanalyse', label: 'Bedarfsanalyse' },
  { key: 'marktanalyse', label: 'Marktanalyse' },
  { key: 'leistungsbeschreibung', label: 'Leistungsbeschr.' },
]

const TAB_TOOL_MAP: Record<WorkspaceTab, string> = {
  bedarfsanalyse: 'askQuestions',
  marktanalyse: 'marketResearch',
  leistungsbeschreibung: 'generateSpec',
}

export function DocumentPanel({ documents }: { documents: Document[] }) {
  const { activeTab, setActiveTab, tabContents } = useWorkspace()
  const current = tabContents[activeTab]

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-background">
      {/* Tab Bar */}
      <div className="flex items-end shrink-0 px-3 pt-4 pb-1 bg-muted/20 gap-1 overflow-x-auto">
        {TAB_CONFIG.map(({ key, label }) => {
          const tab = tabContents[key]
          const isActive = activeTab === key
          const hasContent = tab.status === 'done'
          const isGenerating = tab.status === 'generating' || tab.status === 'streaming'

          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-t-md whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-background border border-b-0 border-border text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isGenerating && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {hasContent && !isGenerating && (
                <span className="h-2 w-2 rounded-full bg-green-500" />
              )}
              {label}
              {tab.version > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  v{tab.version}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {current.status === 'idle' && (
          <IdlePlaceholder tab={activeTab} documents={documents} />
        )}
        {current.status === 'generating' && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Wird generiert...</p>
          </div>
        )}
        {current.status === 'streaming' && (
          <StreamingContent tab={activeTab} content={current.content} />
        )}
        {current.status === 'done' && (
          <DoneContent tab={activeTab} content={current.content} />
        )}
      </div>
    </div>
  )
}

/** Convert raw tool output to markdown for display. */
function toolOutputToMarkdown(tab: WorkspaceTab, content: unknown): string {
  const toolType = TAB_TOOL_MAP[tab]
  const transformer = getTransformer(toolType)
  if (transformer && content) {
    try {
      return transformer.toMarkdown(content)
    } catch {
      // Fallback: show as JSON
    }
  }
  return typeof content === 'string' ? content : JSON.stringify(content, null, 2)
}

function StreamingContent({ tab, content }: { tab: WorkspaceTab; content: unknown }) {
  const markdown = toolOutputToMarkdown(tab, content)
  return (
    <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
      <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
      <span className="inline-block w-2 h-4 bg-foreground/70 animate-pulse ml-0.5 align-text-bottom" />
    </div>
  )
}

function DoneContent({ tab, content }: { tab: WorkspaceTab; content: unknown }) {
  const markdown = toolOutputToMarkdown(tab, content)
  return (
    <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
      <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
    </div>
  )
}

function IdlePlaceholder({ tab, documents }: { tab: WorkspaceTab; documents: Document[] }) {
  const savedDocs = documents.filter((d) => d.sourceToolType === TAB_TOOL_MAP[tab])

  if (savedDocs.length > 0) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
          Gespeicherte Dokumente
        </p>
        {savedDocs.map((doc) => (
          <SavedDocumentCard key={String(doc.id)} doc={doc} />
        ))}
      </div>
    )
  }

  const messages: Record<WorkspaceTab, string> = {
    bedarfsanalyse: 'Starten Sie die Bedarfsanalyse, um Fragen zu generieren.',
    marktanalyse: 'Beantworten Sie die Fragen und starten Sie die Analyse.',
    leistungsbeschreibung: 'Die Leistungsbeschreibung wird nach der Marktanalyse erstellt.',
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <FileText className="h-10 w-10 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{messages[tab]}</p>
    </div>
  )
}

function SavedDocumentCard({ doc }: { doc: Document }) {
  if (doc.markdown) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{doc.title}</p>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Markdown remarkPlugins={[remarkGfm]}>{doc.markdown}</Markdown>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm font-medium">{doc.title}</p>
      <p className="text-xs text-muted-foreground">
        {new Date(doc.createdAt).toLocaleDateString('de-DE')}
      </p>
    </div>
  )
}
