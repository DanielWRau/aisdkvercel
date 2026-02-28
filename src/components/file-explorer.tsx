'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import {
  File,
  FileText,
  FileSpreadsheet,
  FileType2,
  Files,
  LayoutList,
  LayoutGrid,
  Search,
  Download,
  Trash2,
  MoreHorizontal,
  Upload,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  deleteDocument,
  uploadFile,
  updateDocumentStatus,
  getProjectDocumentsWithMedia,
} from '@/actions/documents'

type MediaAttachment = {
  id: string | number
  url?: string
  mimeType?: string
  filename?: string
  filesize?: number
  title?: string
}

export type DocumentItem = {
  id: string | number
  title: string
  description?: string | null
  content?: string | null
  category?: string | null
  sourceToolType?: string | null
  workflowStatus?: string | null
  jsonData?: unknown
  createdAt: string
  updatedAt?: string
  attachments?: (MediaAttachment | string | number)[]
}

const WORKFLOW_STATUSES = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'review', label: 'In Prüfung' },
  { value: 'revision', label: 'Überarbeitung' },
  { value: 'approved', label: 'Freigegeben' },
  { value: 'final', label: 'Final' },
  { value: 'archived', label: 'Archiviert' },
] as const

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  WORKFLOW_STATUSES.map((s) => [s.value, s.label]),
)

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  revision: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  final: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  archived: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
}

const BADGE_HEIGHT = 'h-6 text-xs'

function getMimeIcon(mimeType?: string) {
  if (!mimeType) return File
  if (mimeType === 'application/pdf') return FileType2
  if (
    mimeType.includes('word') ||
    mimeType === 'text/markdown' ||
    mimeType === 'text/plain'
  )
    return FileText
  if (mimeType.includes('spreadsheet') || mimeType === 'text/csv')
    return FileSpreadsheet
  return File
}

function getResolvedAttachments(doc: DocumentItem): MediaAttachment[] {
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

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'text/csv',
]

const ACCEPT_STRING = ACCEPTED_MIME_TYPES.join(',')

function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2.5 font-medium whitespace-nowrap',
        BADGE_HEIGHT,
        STATUS_COLORS[status] ?? STATUS_COLORS.draft,
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function StatusDropdown({
  docId,
  currentStatus,
  onStatusChange,
}: {
  docId: string | number
  currentStatus: string
  onStatusChange: (docId: string | number, status: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={currentStatus} className="hover:opacity-80 transition-opacity" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {WORKFLOW_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s.value}
            disabled={s.value === currentStatus}
            onClick={() => onStatusChange(docId, s.value)}
          >
            <StatusBadge status={s.value} />
            {s.value === currentStatus && (
              <span className="text-muted-foreground ml-auto text-xs">aktuell</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function FileExplorer({
  documents,
  projectId,
  selectedId,
  onSelect,
  onDocumentsChange,
}: {
  documents: DocumentItem[]
  projectId: string | number
  selectedId?: string | number | null
  onSelect?: (doc: DocumentItem) => void
  onDocumentsChange?: (docs: DocumentItem[]) => void
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null)
  const [docs, setDocs] = useState(documents)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync external documents prop
  const docsRef = useRef(documents)
  if (documents !== docsRef.current) {
    docsRef.current = documents
    setDocs(documents)
  }

  const updateDocs = useCallback(
    (newDocs: DocumentItem[]) => {
      setDocs(newDocs)
      onDocumentsChange?.(newDocs)
    },
    [onDocumentsChange],
  )

  const handleStatusChange = useCallback(
    async (docId: string | number, newStatus: string) => {
      const result = await updateDocumentStatus(docId, newStatus)
      if (result.success) {
        const updated = docs.map((d) =>
          d.id === docId ? { ...d, workflowStatus: newStatus } : d,
        )
        updateDocs(updated)
      }
    },
    [docs, updateDocs],
  )

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      setUploadError(null)
      setUploading(true)

      try {
        for (const file of Array.from(files)) {
          const formData = new FormData()
          formData.set('file', file)
          formData.set('projectId', String(projectId))

          const result = await uploadFile(formData)
          if (!result.success) {
            setUploadError(result.error ?? 'Upload fehlgeschlagen')
            break
          }
        }

        const refreshed = await getProjectDocumentsWithMedia(projectId)
        updateDocs(refreshed as DocumentItem[])
      } catch {
        setUploadError('Unbekannter Fehler beim Upload')
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [projectId, updateDocs],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files)
      }
    },
    [handleUpload],
  )

  const filtered = useMemo(() => {
    return docs.filter((doc) => {
      if (search && !doc.title.toLowerCase().includes(search.toLowerCase()))
        return false
      if (category !== 'all' && doc.category !== category) return false
      return true
    })
  }, [docs, search, category])

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteDocument(deleteTarget.id)
      const updated = docs.filter((d) => d.id !== deleteTarget.id)
      updateDocs(updated)
    } catch {
      // silent — access control will prevent unauthorized deletion
    }
    setDeleteTarget(null)
  }

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden p-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="size-10" />
            <p className="text-sm font-medium">Dateien hier ablegen</p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleUpload(e.target.files)
        }}
      />

      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Dateien</h2>
          <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {uploading ? 'Lädt...' : 'Hochladen'}
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={() => setViewMode('list')}
          >
            <LayoutList className="size-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {uploadError}
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="spec">Spezifikation</SelectItem>
            <SelectItem value="research">Recherche</SelectItem>
            <SelectItem value="contract">Vertrag</SelectItem>
            <SelectItem value="questionnaire">Fragebogen</SelectItem>
            <SelectItem value="formblatt">Formblatt</SelectItem>
            <SelectItem value="other">Sonstig</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* File List / Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <Files className="size-12 opacity-40" />
          <p className="text-sm">Noch keine Dateien</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="flex-1 overflow-y-auto -mx-4">
          <div className="divide-y">
            {filtered.map((doc) => {
              const attachments = getResolvedAttachments(doc)
              const firstAttachment = attachments[0]
              const Icon = getMimeIcon(firstAttachment?.mimeType)
              const isSelected = selectedId != null && doc.id === selectedId

              return (
                <div
                  key={String(doc.id)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : 'hover:bg-muted/50 border-l-2 border-l-transparent',
                  )}
                  onClick={() => onSelect?.(doc)}
                >
                  <Icon className="text-muted-foreground size-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{doc.title}</p>
                    </div>
                    {firstAttachment?.filename && (
                      <p className="text-muted-foreground truncate text-xs">
                        {firstAttachment.filename}
                        {firstAttachment.filesize
                          ? ` (${formatFileSize(firstAttachment.filesize)})`
                          : ''}
                      </p>
                    )}
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5">
                    {doc.workflowStatus && (
                      <StatusDropdown
                        docId={doc.id}
                        currentStatus={doc.workflowStatus}
                        onStatusChange={handleStatusChange}
                      />
                    )}
                  </div>
                  <FileActions
                    doc={doc}
                    onDelete={() => setDeleteTarget(doc)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-3 grid-cols-2">
            {filtered.map((doc) => {
              const attachments = getResolvedAttachments(doc)
              const firstAttachment = attachments[0]
              const Icon = getMimeIcon(firstAttachment?.mimeType)
              const isSelected = selectedId != null && doc.id === selectedId

              return (
                <div
                  key={String(doc.id)}
                  className={cn(
                    'group rounded-lg border p-3 cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-primary/5 border-primary'
                      : 'hover:bg-muted/50',
                  )}
                  onClick={() => onSelect?.(doc)}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <Icon className="text-muted-foreground size-6" />
                    <FileActions
                      doc={doc}
                      onDelete={() => setDeleteTarget(doc)}
                    />
                  </div>
                  <div className="mb-1 flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium">{doc.title}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {doc.workflowStatus && (
                      <StatusDropdown
                        docId={doc.id}
                        currentStatus={doc.workflowStatus}
                        onStatusChange={handleStatusChange}
                      />
                    )}
                    <span className="text-muted-foreground ml-auto text-xs">
                      {formatDate(doc.createdAt)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokument löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie &quot;{deleteTarget?.title}&quot; wirklich löschen? Alle
              zugehörigen Anhänge werden ebenfalls entfernt. Diese Aktion
              kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function FileActions({
  doc,
  onDelete,
}: {
  doc: DocumentItem
  onDelete: () => void
}) {
  const attachments = getResolvedAttachments(doc)
  const firstAttachment = attachments[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {firstAttachment?.url && (
          <>
            <DropdownMenuItem asChild>
              <a
                href={firstAttachment.url}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="size-4" />
                Download
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-4" />
          Löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
