'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  File,
  FileText,
  Download,
  ChevronDown,
  Pencil,
  History,
  Loader2,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  getDocumentVersions,
  deleteDocumentVersion,
  getDocumentAsMarkdown,
  saveDocumentFromMarkdown,
  updateDocumentCategory,
  updateDocumentStatus,
  type DocumentVersion,
} from '@/actions/documents'
import { MarkdownEditor } from '@/components/markdown-editor'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStatusFooter } from '@/providers/status-footer-provider'

/* ── Types ── */

type MediaAttachment = {
  id: string | number
  url?: string
  mimeType?: string
  filename?: string
  filesize?: number
  title?: string
}

export type DetailDocument = {
  id: string | number
  title: string
  description?: string | null
  markdown?: string | null
  category?: string | null
  sourceToolType?: string | null
  workflowStatus?: string | null
  createdAt: string
  updatedAt?: string
  attachments?: (MediaAttachment | string | number)[]
}

/* ── Constants ── */

const CATEGORY_LABELS: Record<string, string> = {
  spec: 'Spezifikation',
  research: 'Recherche',
  contract: 'Vertrag',
  questionnaire: 'Fragebogen',
  'angebots-draft': 'Lieferanten',
  'angebots-anfrage': 'Angebotsanfrage',
  'angebots-vergleich': 'Angebotsvergleich',
  formblatt: 'Formblatt',
  other: 'Sonstig',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  review: 'In Prüfung',
  revision: 'Überarbeitung',
  approved: 'Freigegeben',
  final: 'Final',
  archived: 'Archiviert',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  revision: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  final: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  archived: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
}

/* ── Helpers ── */

function getResolvedAttachments(doc: DetailDocument): MediaAttachment[] {
  if (!doc.attachments?.length) return []
  return doc.attachments.filter(
    (a): a is MediaAttachment => typeof a === 'object' && a !== null,
  )
}

function formatFileSize(bytes?: number) {
  if (!bytes) return null
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string) {
  return `${new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })} ${new Date(dateStr).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

/* ── Main Component ── */

export function FileDetailPanel({
  doc,
  projectId,
  onRefresh,
}: {
  doc: DetailDocument | null
  projectId: string | number
  onRefresh: () => void
}) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null)
  const [deleteVersionTarget, setDeleteVersionTarget] = useState<DocumentVersion | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [textLoading, setTextLoading] = useState(false)
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [markdownEditData, setMarkdownEditData] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editorLoading, setEditorLoading] = useState(false)
  const { setCopyContent } = useStatusFooter()

  const prevDocId = useRef<string | number | null>(null)

  // Reset state when doc changes
  useEffect(() => {
    if (doc?.id !== prevDocId.current) {
      prevDocId.current = doc?.id ?? null
      setVersions([])
      setSelectedVersion(null)
      setTextContent(null)
      setEditing(false)
      setMarkdownEditData(null)
    }
  }, [doc?.id])

  // Sync copy content to global footer
  useEffect(() => {
    if (!doc) {
      setCopyContent(null)
      return
    }
    if (doc.markdown) {
      setCopyContent(doc.markdown)
    } else if (textContent) {
      setCopyContent(textContent)
    } else {
      setCopyContent(null)
    }
    return () => setCopyContent(null)
  }, [doc, doc?.markdown, textContent, setCopyContent])

  // Load text content for text attachments
  useEffect(() => {
    if (!doc) return
    const attachments = getResolvedAttachments(doc)
    const textAtt = attachments.find(
      (a) => a.mimeType === 'text/plain' || a.mimeType === 'text/markdown' || a.mimeType === 'text/csv',
    )
    if (textAtt?.url && !doc.markdown) {
      setTextLoading(true)
      fetch(textAtt.url)
        .then((res) => (res.ok ? res.text() : Promise.reject()))
        .then((text) => setTextContent(text.slice(0, 500 * 1024)))
        .catch(() => setTextContent('Fehler beim Laden der Datei.'))
        .finally(() => setTextLoading(false))
    }
  }, [doc])

  const loadVersions = useCallback(async (docItem: DetailDocument) => {
    setVersionsLoading(true)
    try {
      const result = await getDocumentVersions(docItem.id)
      setVersions(result)
    } catch {
      setVersions([])
    } finally {
      setVersionsLoading(false)
    }
  }, [])

  const handleDeleteVersion = useCallback(async () => {
    if (!deleteVersionTarget || !doc) return
    const result = await deleteDocumentVersion(doc.id, deleteVersionTarget.id)
    if (result.success) {
      setVersions((prev) => prev.filter((v) => v.id !== deleteVersionTarget.id))
      if (selectedVersion?.id === deleteVersionTarget.id) {
        setSelectedVersion(null)
      }
    }
    setDeleteVersionTarget(null)
  }, [deleteVersionTarget, doc, selectedVersion])

  const handleCategoryChange = useCallback(async (category: string) => {
    if (!doc) return
    const result = await updateDocumentCategory(doc.id, category)
    if (result.success) onRefresh()
  }, [doc, onRefresh])

  const handleStatusChange = useCallback(async (status: string) => {
    if (!doc) return
    const result = await updateDocumentStatus(doc.id, status)
    if (result.success) onRefresh()
  }, [doc, onRefresh])

  const handleExport = useCallback(async (format: 'pdf' | 'docx' | 'md') => {
    if (!doc) return
    setDownloadingFormat(format)
    try {
      const res = await fetch(`/projects/${projectId}/api/documents/${doc.id}/export?format=${format}`)
      if (!res.ok) {
        const err = await res.text()
        console.error('Export fehlgeschlagen:', err)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.title}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingFormat(null)
    }
  }, [doc, projectId])

  const handleExportZip = useCallback(async () => {
    setDownloadingFormat('zip')
    try {
      const res = await fetch(`/projects/${projectId}/api/export-zip`)
      if (!res.ok) {
        const err = await res.text()
        console.error('ZIP-Export fehlgeschlagen:', err)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'export.zip'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingFormat(null)
    }
  }, [projectId])

  /* ── Empty state ── */
  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-3 text-muted-foreground px-8">
        <FileText className="size-12 opacity-20" />
        <p className="text-sm">Datei auswählen für Vorschau</p>
      </div>
    )
  }

  const attachments = getResolvedAttachments(doc)
  const pdfAttachment = attachments.find((a) => a.mimeType === 'application/pdf')
  const firstDownloadable = attachments.find((a) => a.url)
  const hasContent = Boolean(doc.markdown)

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-background">
      {/* ── Header — single row: badges, date, actions ── */}
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Category Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button>
                <Badge variant="outline" className="h-6 text-xs px-2.5 cursor-pointer hover:bg-muted/50 transition-colors">
                  {CATEGORY_LABELS[doc.category ?? ''] ?? doc.category ?? 'Kategorie'}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <DropdownMenuItem
                  key={value}
                  className={cn(doc.category === value && 'font-semibold bg-accent')}
                  onClick={() => handleCategoryChange(value)}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button>
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full px-2.5 h-6 text-xs font-medium whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity',
                    STATUS_COLORS[doc.workflowStatus ?? ''] ?? STATUS_COLORS.draft,
                  )}
                >
                  {STATUS_LABELS[doc.workflowStatus ?? ''] ?? doc.workflowStatus ?? 'Status'}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <DropdownMenuItem
                  key={value}
                  className={cn(doc.workflowStatus === value && 'font-semibold bg-accent')}
                  onClick={() => handleStatusChange(value)}
                >
                  <span
                    className={cn(
                      'inline-block size-2 rounded-full mr-1',
                      STATUS_COLORS[value]?.split(' ')[0] ?? 'bg-zinc-100',
                    )}
                  />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</span>

          {/* Right-aligned actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Version History Dropdown */}
            <DropdownMenu onOpenChange={(open) => { if (open && versions.length === 0) loadVersions(doc) }}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <History className="size-4" />
                  Versionen
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Versionshistorie</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {versionsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Laden...
                  </div>
                ) : versions.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">Keine Versionen vorhanden.</p>
                ) : (
                  versions.map((v, idx) => {
                    const isCurrent = idx === 0
                    return (
                      <DropdownMenuItem
                        key={String(v.id)}
                        className="flex items-center gap-2"
                        onClick={() => {
                          if (v.markdown) {
                            setSelectedVersion(selectedVersion?.id === v.id ? null : v)
                          }
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block">
                            {v.title ?? formatDateTime(v.createdAt)}
                          </span>
                          {v.title && (
                            <span className="text-xs text-muted-foreground">{formatDateTime(v.createdAt)}</span>
                          )}
                        </div>
                        {isCurrent && (
                          <Badge variant="secondary" className="h-4 px-1 text-[10px] shrink-0">aktuell</Badge>
                        )}
                        {!isCurrent && (
                          <button
                            className="shrink-0 p-0.5 rounded hover:bg-destructive/10 transition-colors"
                            title="Version löschen"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteVersionTarget(v)
                            }}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </button>
                        )}
                      </DropdownMenuItem>
                    )
                  })
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {hasContent && !editing && (
              <Button
                variant="outline"
                size="sm"
                disabled={editorLoading}
                onClick={async () => {
                  setEditorLoading(true)
                  try {
                    // Use markdown field directly, or load from server
                    const md = doc.markdown || await getDocumentAsMarkdown(doc.id)
                    if (md) {
                      setMarkdownEditData(md)
                      setEditing(true)
                    }
                  } finally {
                    setEditorLoading(false)
                  }
                }}
              >
                {editorLoading ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
                Bearbeiten
              </Button>
            )}
            {firstDownloadable?.url ? (
              <Button variant="outline" size="sm" asChild>
                <a href={firstDownloadable.url} download target="_blank" rel="noopener noreferrer">
                  <Download className="size-4" />
                  Download
                </a>
              </Button>
            ) : hasContent ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={downloadingFormat !== null}>
                    {downloadingFormat ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    Download
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled={downloadingFormat !== null} onClick={() => handleExport('pdf')}>
                    Als PDF herunterladen
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={downloadingFormat !== null} onClick={() => handleExport('docx')}>
                    Als Word herunterladen
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={downloadingFormat !== null} onClick={() => handleExport('md')}>
                    Als Markdown herunterladen
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={downloadingFormat !== null} onClick={handleExportZip}>
                    Alle als ZIP herunterladen (PDF + Word)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Old version banner ── */}
      {selectedVersion && (
        <div className="shrink-0 flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm dark:border-amber-800 dark:bg-amber-950/40">
          <History className="size-4 text-amber-600 shrink-0" />
          <span className="text-amber-800 dark:text-amber-300">
            Version vom {formatDateTime(selectedVersion.createdAt)}
          </span>
          <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => setSelectedVersion(null)}>
            Zur aktuellen Version
          </Button>
        </div>
      )}

      {/* ── Content Area ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {editing && markdownEditData !== null ? (
          <MarkdownEditor
            initialMarkdown={markdownEditData}
            onSave={async (md) => {
              setSaving(true)
              try {
                await saveDocumentFromMarkdown(doc.id, md)
                setEditing(false)
                setMarkdownEditData(null)
                onRefresh()
              } finally {
                setSaving(false)
              }
            }}
            onCancel={() => { setEditing(false); setMarkdownEditData(null) }}
            saving={saving}
          />
        ) : selectedVersion ? (
          <VersionContent version={selectedVersion} />
        ) : (
          <CurrentContent
            doc={doc}
            attachments={attachments}
            pdfAttachment={pdfAttachment}
            textContent={textContent}
            textLoading={textLoading}
          />
        )}
      </div>

      {/* ── Delete Version Dialog ── */}
      <AlertDialog
        open={deleteVersionTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteVersionTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Version löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die Version vom{' '}
              {deleteVersionTarget ? formatDateTime(deleteVersionTarget.createdAt) : ''}{' '}
              wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteVersion}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ── Content Renderers ── */

function VersionContent({ version }: { version: DocumentVersion }) {
  if (version.markdown) {
    return (
      <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>{version.markdown}</Markdown>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground px-8">
      <File className="size-8 opacity-40" />
      <p className="text-sm">Kein Textinhalt für diese Version</p>
    </div>
  )
}

function CurrentContent({
  doc,
  attachments,
  pdfAttachment,
  textContent,
  textLoading,
}: {
  doc: DetailDocument
  attachments: MediaAttachment[]
  pdfAttachment: MediaAttachment | undefined
  textContent: string | null
  textLoading: boolean
}) {
  // Markdown field (single source of truth)
  if (doc.markdown) {
    return (
      <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>{doc.markdown}</Markdown>
      </div>
    )
  }

  // 4. PDF attachment
  if (pdfAttachment?.url) {
    return (
      <iframe
        src={pdfAttachment.url}
        className="h-full w-full"
        title="PDF Vorschau"
      />
    )
  }

  // 5. Text attachment
  if (textContent !== null || textLoading) {
    if (textLoading) {
      return (
        <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Wird geladen...</span>
        </div>
      )
    }
    return (
      <pre className="p-4 text-xs whitespace-pre-wrap">{textContent}</pre>
    )
  }

  // 5. Other attachments — download list
  if (attachments.length > 0) {
    return (
      <div className="p-4 space-y-3">
        {attachments.map((att) => (
          <div key={String(att.id)} className="flex items-center gap-3 rounded-md border p-3">
            <File className="text-muted-foreground size-5" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm">{att.filename ?? att.title}</p>
              {att.filesize && <p className="text-muted-foreground text-xs">{formatFileSize(att.filesize)}</p>}
            </div>
            {att.url && (
              <Button variant="outline" size="sm" asChild>
                <a href={att.url} download target="_blank" rel="noopener noreferrer">
                  <Download className="size-4" />
                </a>
              </Button>
            )}
          </div>
        ))}
      </div>
    )
  }

  // 6. Empty
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground px-8">
      <File className="size-8 opacity-40" />
      <p className="text-sm">Kein Inhalt verfügbar</p>
    </div>
  )
}

