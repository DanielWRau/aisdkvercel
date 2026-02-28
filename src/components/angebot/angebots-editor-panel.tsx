'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useStatusFooter } from '@/providers/status-footer-provider'
import { getAngebotsDocumentVersions } from '@/actions/angebot'
import type {
  AngebotsDocumentsResult,
  AngebotsResultTab,
  VersionSummary,
} from '@/types/angebot'

interface AngebotsEditorPanelProps {
  projectId: string | number
  documents: AngebotsDocumentsResult
  streamingContent?: string | null
  streamingTab?: AngebotsResultTab | null
  onRefresh: () => void
}

export function AngebotsEditorPanel({
  documents,
  streamingContent,
  streamingTab,
}: AngebotsEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<AngebotsResultTab>('anfrage')
  const [versions, setVersions] = useState<VersionSummary[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<
    string | number | null
  >(null)
  const { setCopyContent } = useStatusFooter()
  const scrollRef = useRef<HTMLDivElement>(null)

  const isStreaming = streamingContent != null && streamingTab != null

  // Auto-switch to streaming tab (render-time state adjustment per React docs)
  const [prevStreamingTab, setPrevStreamingTab] = useState(streamingTab)
  if (streamingTab !== prevStreamingTab) {
    setPrevStreamingTab(streamingTab)
    if (streamingTab) {
      setActiveTab(streamingTab)
      setSelectedVersionId(null)
    }
  }

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [isStreaming, streamingContent])

  const currentDoc =
    activeTab === 'anfrage' ? documents.anfrage : documents.vergleich

  // Track which document versions were loaded for
  const loadedForKeyRef = useRef<string | null>(null)

  const loadVersions = useCallback(
    async (docId: string | number, docUpdatedAt: string) => {
      const key = `${docId}-${docUpdatedAt}`
      if (loadedForKeyRef.current === key) return
      loadedForKeyRef.current = key
      try {
        const v = await getAngebotsDocumentVersions(docId)
        setVersions(v)
      } catch {
        setVersions([])
      }
    },
    [],
  )

  const handleTabChange = useCallback(
    (tab: AngebotsResultTab) => {
      setActiveTab(tab)
      setSelectedVersionId(null)
      setVersions([])
      loadedForKeyRef.current = null

      // Pre-load versions for the new tab
      const doc = tab === 'anfrage' ? documents.anfrage : documents.vergleich
      if (doc) {
        loadVersions(doc.id, doc.updatedAt)
      }
    },
    [documents, loadVersions],
  )

  // Determine display content — streaming takes priority
  const displayContent = useMemo(() => {
    if (isStreaming && streamingTab === activeTab) {
      return streamingContent
    }
    if (selectedVersionId && versions.length > 0) {
      const version = versions.find((v) => v.id === selectedVersionId)
      return version?.content ?? null
    }
    return currentDoc?.content ?? null
  }, [isStreaming, streamingTab, activeTab, streamingContent, selectedVersionId, versions, currentDoc?.content])

  // Sync copy content to global footer
  useEffect(() => {
    setCopyContent(displayContent)
    return () => setCopyContent(null)
  }, [displayContent, setCopyContent])

  const handleVersionDropdownFocus = useCallback(() => {
    if (currentDoc) {
      loadVersions(currentDoc.id, currentDoc.updatedAt)
    }
  }, [currentDoc, loadVersions])

  const tabs: { key: AngebotsResultTab; label: string }[] = [
    { key: 'anfrage', label: 'Angebotsanfrage' },
    { key: 'vergleich', label: 'Auswertung' },
  ]

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-background">
      {/* Tab Bar + Version Dropdown */}
      <div className="flex items-end shrink-0 px-3 pt-4 pb-1 bg-muted/20 gap-1">
        {tabs.map(({ key, label }) => {
          const doc =
            key === 'anfrage' ? documents.anfrage : documents.vergleich
          const isActive = activeTab === key
          const hasContent = !!doc?.content
          const isTabStreaming = isStreaming && streamingTab === key

          return (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              disabled={isStreaming}
              className={`relative flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-t-md whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-background border border-b-0 border-border text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              } ${isStreaming ? 'cursor-default' : ''}`}
            >
              {isTabStreaming ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : hasContent ? (
                <span className="h-2 w-2 rounded-full bg-green-500" />
              ) : null}
              {label}
            </button>
          )
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Version Dropdown — hidden during streaming */}
        {currentDoc && !isStreaming && (
          <select
            value={
              selectedVersionId != null ? String(selectedVersionId) : ''
            }
            onFocus={handleVersionDropdownFocus}
            onChange={(e) => {
              const val = e.target.value
              setSelectedVersionId(val === '' ? null : val)
            }}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground"
          >
            <option value="">Aktuell</option>
            {versions.map((v, idx) => (
              <option key={String(v.id)} value={String(v.id)}>
                v{versions.length - idx} —{' '}
                {new Date(v.createdAt).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </option>
            ))}
          </select>
        )}

      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {displayContent ? (
          <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{displayContent}</Markdown>
          </div>
        ) : (
          <EmptyState tab={activeTab} />
        )}

        {/* Version indicator */}
        {selectedVersionId && !isStreaming && (
          <div className="sticky bottom-0 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-t text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              Ältere Version
            </Badge>
            <button
              onClick={() => setSelectedVersionId(null)}
              className="underline hover:no-underline"
            >
              Zur aktuellen Version
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ tab }: { tab: AngebotsResultTab }) {
  const messages: Record<
    AngebotsResultTab,
    { title: string; description: string }
  > = {
    anfrage: {
      title: 'Keine Angebotsanfrage',
      description:
        'Generieren Sie eine herstellerneutrale Angebotsanfrage basierend auf der Leistungsbeschreibung.',
    },
    vergleich: {
      title: 'Keine Auswertung',
      description:
        'Erfassen Sie mindestens 2 Angebote und erstellen Sie dann eine KI-gestützte Auswertung.',
    },
  }

  const msg = messages[tab]

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <FileText className="h-10 w-10 text-muted-foreground/30" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          {msg.title}
        </p>
        <p className="text-xs text-muted-foreground">{msg.description}</p>
      </div>
    </div>
  )
}
