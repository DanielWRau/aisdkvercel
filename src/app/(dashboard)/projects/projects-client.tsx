'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  listProjects as fetchProjects,
  createProject,
  deleteProject,
  updateProjectStatus,
} from '@/actions/projects'
import { useBreadcrumbs } from '@/providers/breadcrumb-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
import { cn } from '@/lib/utils'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus,
  Search,
  FolderOpen,
  LayoutList,
  LayoutGrid,
  MoreHorizontal,
  ExternalLink,
  Archive,
  CalendarClock,
} from 'lucide-react'
import { CpvAutocomplete } from '@/components/cpv-autocomplete'
import { berechneTermine } from '@/data/vergabe-fristen'
import { useUserSettings } from '@/hooks/use-user-settings'

import type { ProjectListItem, ProjectStatus, ProjektData, Vergaberecht, Auftragsart, Verfahrensart, Auftraggeberebene } from '@/types/project'
import {
  VERGABERECHT_LABELS,
  VERFAHRENSART_LABELS,
  AUFTRAGSART_LABELS,
  AUFTRAGGEBEREBENE_LABELS,
  getVerfahrensartenFuer,
} from '@/types/project'

type Project = ProjectListItem

const PROJECT_STATUSES = [
  { value: 'planung', label: 'Planung' },
  { value: 'bekanntgemacht', label: 'Bekanntgemacht' },
  { value: 'laufend', label: 'Laufend' },
  { value: 'auswertung', label: 'Auswertung' },
  { value: 'abgeschlossen', label: 'Abgeschlossen' },
  { value: 'aufgehoben', label: 'Aufgehoben' },
  { value: 'ruhend', label: 'Ruhend' },
] as const

const PROJECT_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value, s.label]),
)

const PROJECT_STATUS_COLORS: Record<string, string> = {
  planung: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  bekanntgemacht: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  laufend: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  auswertung: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  abgeschlossen: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  aufgehoben: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  ruhend: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
}

const NOTIZEN_MAX_LENGTH = 5000

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function ProjectStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2.5 h-6 text-xs font-medium whitespace-nowrap',
        PROJECT_STATUS_COLORS[status] ?? PROJECT_STATUS_COLORS.planung,
        className,
      )}
    >
      {PROJECT_STATUS_LABELS[status] ?? status}
    </span>
  )
}

function ProjectStatusDropdown({
  projectId,
  currentStatus,
  onStatusChange,
}: {
  projectId: string | number
  currentStatus: string
  onStatusChange: (projectId: string | number, status: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <ProjectStatusBadge status={currentStatus} className="hover:opacity-80 transition-opacity" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {PROJECT_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s.value}
            disabled={s.value === currentStatus}
            onClick={() => onStatusChange(projectId, s.value)}
          >
            <ProjectStatusBadge status={s.value} />
            {s.value === currentStatus && (
              <span className="text-muted-foreground ml-auto text-xs">aktuell</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ProjectActions({
  onOpen,
  onArchive,
}: {
  onOpen: () => void
  onArchive: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onOpen}>
          <ExternalLink className="size-4" />
          Öffnen
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onArchive}>
          <Archive className="size-4" />
          Archivieren
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// --- Create Form ---

interface CreateFormData {
  name: string
  cpvCode: string
  vergaberecht: Vergaberecht | ''
  verfahrensart: Verfahrensart | ''
  auftragsart: Auftragsart | ''
  schaetzwert: string
  oberschwelle: boolean
  bekanntmachung: string
  teilnahmefrist: string
  angebotsfrist: string
  bindefrist: string
  zuschlag: string
  vertragsstart: string
  auftraggeberName: string
  auftraggeberEbene: Auftraggeberebene | ''
  auftraggeberKontakt: string
  notizen: string
}

const EMPTY_FORM: CreateFormData = {
  name: '',
  cpvCode: '',
  vergaberecht: '',
  verfahrensart: '',
  auftragsart: '',
  schaetzwert: '',
  oberschwelle: false,
  bekanntmachung: '',
  teilnahmefrist: '',
  angebotsfrist: '',
  bindefrist: '',
  zuschlag: '',
  vertragsstart: '',
  auftraggeberName: '',
  auftraggeberEbene: '',
  auftraggeberKontakt: '',
  notizen: '',
}

function formDataToProjektData(form: CreateFormData): Partial<ProjektData> {
  const data: Partial<ProjektData> = {}
  if (form.vergaberecht) data.vergaberecht = form.vergaberecht as Vergaberecht
  if (form.verfahrensart) data.verfahrensart = form.verfahrensart as Verfahrensart
  if (form.auftragsart) data.auftragsart = form.auftragsart as Auftragsart
  if (form.cpvCode) data.cpvCode = form.cpvCode
  if (form.schaetzwert) data.schaetzwert = Number(form.schaetzwert)
  if (form.oberschwelle) data.oberschwelle = true

  const termine: Record<string, string> = {}
  if (form.bekanntmachung) termine.bekanntmachung = form.bekanntmachung
  if (form.teilnahmefrist) termine.teilnahmefrist = form.teilnahmefrist
  if (form.angebotsfrist) termine.angebotsfrist = form.angebotsfrist
  if (form.bindefrist) termine.bindefrist = form.bindefrist
  if (form.zuschlag) termine.zuschlag = form.zuschlag
  if (form.vertragsstart) termine.vertragsstart = form.vertragsstart
  if (Object.keys(termine).length > 0) data.termine = termine

  if (form.auftraggeberName || form.auftraggeberEbene || form.auftraggeberKontakt) {
    data.auftraggeber = {
      name: form.auftraggeberName || undefined,
      ebene: (form.auftraggeberEbene as Auftraggeberebene) || undefined,
      kontakt: form.auftraggeberKontakt || undefined,
    }
  }

  if (form.notizen) data.notizen = form.notizen

  return data
}

function CreateProjectForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (name: string, data: Partial<ProjektData>) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [form, setForm] = useState<CreateFormData>(EMPTY_FORM)
  const { fristenConfig } = useUserSettings()

  const update = <K extends keyof CreateFormData>(key: K, value: CreateFormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // Reset verfahrensart when oberschwelle/auftragsart changes and current selection is invalid
      if (key === 'oberschwelle' || key === 'auftragsart') {
        const available = getVerfahrensartenFuer(
          next.oberschwelle,
          (next.auftragsart as Auftragsart) || null,
        )
        if (next.verfahrensart && !available.includes(next.verfahrensart as Verfahrensart)) {
          next.verfahrensart = ''
        }
      }
      return next
    })
  }

  const verfuegbareVerfahrensarten = getVerfahrensartenFuer(
    form.oberschwelle,
    (form.auftragsart as Auftragsart) || null,
  )

  const applyCalculatedDeadlines = () => {
    if (!form.bekanntmachung || !form.verfahrensart) return
    const bekanntmachungDate = new Date(form.bekanntmachung)
    const termine = berechneTermine(
      bekanntmachungDate,
      form.verfahrensart,
      form.oberschwelle,
      fristenConfig,
    )
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    setForm((prev) => ({
      ...prev,
      teilnahmefrist: termine.teilnahmefrist ? fmt(termine.teilnahmefrist) : prev.teilnahmefrist,
      angebotsfrist: termine.angebotsfrist ? fmt(termine.angebotsfrist) : prev.angebotsfrist,
      bindefrist: termine.bindefrist ? fmt(termine.bindefrist) : prev.bindefrist,
      zuschlag: termine.zuschlag ? fmt(termine.zuschlag) : prev.zuschlag,
      vertragsstart: termine.vertragsstart ? fmt(termine.vertragsstart) : prev.vertragsstart,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit(form.name.trim(), formDataToProjektData(form))
  }

  const notizenLength = form.notizen.length
  const notizenRemaining = NOTIZEN_MAX_LENGTH - notizenLength

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
      {/* Name — always visible */}
      <div className="space-y-2">
        <Label htmlFor="create-name">Projektname *</Label>
        <Input
          id="create-name"
          placeholder="z.B. IT-Beschaffung 2024"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          autoFocus
        />
        <p className="text-muted-foreground text-xs">Nur dieses Feld ist erforderlich</p>
      </div>

      {/* Optional fields in Accordion */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="weitere-angaben" className="rounded-lg border">
          <AccordionTrigger className="px-4 hover:no-underline">
            <span className="text-base font-medium">Weitere Angaben (optional)</span>
          </AccordionTrigger>
          <AccordionContent className="px-4">
            <div className="space-y-6 pt-2">
              {/* Grunddaten */}
              <div className="space-y-4">
                <h4 className="text-muted-foreground text-sm font-medium">Grunddaten</h4>
                <div className="space-y-2">
                  <Label>CPV-Code</Label>
                  <CpvAutocomplete
                    value={form.cpvCode}
                    onChange={(v) => update('cpvCode', v)}
                    placeholder="CPV-Code oder Begriff suchen..."
                  />
                </div>
              </div>

              <Separator />

              {/* Verfahrensinformationen */}
              <div className="space-y-4">
                <h4 className="text-muted-foreground text-sm font-medium">Verfahrensinformationen</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Vergaberecht</Label>
                    <Select
                      value={form.vergaberecht}
                      onValueChange={(v) => update('vergaberecht', v as Vergaberecht)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(VERGABERECHT_LABELS) as Vergaberecht[]).map((v) => (
                          <SelectItem key={v} value={v}>{VERGABERECHT_LABELS[v]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Verfahrensart</Label>
                    <Select
                      value={form.verfahrensart}
                      onValueChange={(v) => update('verfahrensart', v as Verfahrensart)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {verfuegbareVerfahrensarten.map((v) => (
                          <SelectItem key={v} value={v}>{VERFAHRENSART_LABELS[v]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Auftragsart</Label>
                    <Select
                      value={form.auftragsart}
                      onValueChange={(v) => update('auftragsart', v as Auftragsart)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(AUFTRAGSART_LABELS) as Auftragsart[]).map((v) => (
                          <SelectItem key={v} value={v}>{AUFTRAGSART_LABELS[v]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-schaetzwert">Schätzwert (EUR)</Label>
                    <Input
                      id="create-schaetzwert"
                      type="number"
                      placeholder="z.B. 100000"
                      value={form.schaetzwert}
                      onChange={(e) => update('schaetzwert', e.target.value)}
                    />
                  </div>

                  <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label>Oberschwelle</Label>
                      <p className="text-muted-foreground text-sm">EU-Schwellenwert überschritten</p>
                    </div>
                    <Switch
                      checked={form.oberschwelle}
                      onCheckedChange={(v) => update('oberschwelle', v)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Termine */}
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-muted-foreground text-sm font-medium">Termine</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyCalculatedDeadlines}
                    disabled={!form.bekanntmachung || !form.verfahrensart}
                  >
                    <CalendarClock className="mr-2 size-4" />
                    Fristen vorschlagen
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {([
                    ['bekanntmachung', 'Bekanntmachung'],
                    ['teilnahmefrist', 'Teilnahmefrist'],
                    ['angebotsfrist', 'Angebotsfrist'],
                    ['bindefrist', 'Bindefrist'],
                    ['zuschlag', 'Zuschlag'],
                    ['vertragsstart', 'Vertragsstart'],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={`create-${key}`}>{label}</Label>
                      <Input
                        id={`create-${key}`}
                        type="date"
                        value={form[key]}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Auftraggeber */}
              <div className="space-y-4">
                <h4 className="text-muted-foreground text-sm font-medium">Auftraggeber</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="create-ag-name">Name</Label>
                    <Input
                      id="create-ag-name"
                      placeholder="z.B. Stadt Musterstadt"
                      value={form.auftraggeberName}
                      onChange={(e) => update('auftraggeberName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ebene</Label>
                    <Select
                      value={form.auftraggeberEbene}
                      onValueChange={(v) => update('auftraggeberEbene', v as Auftraggeberebene)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(AUFTRAGGEBEREBENE_LABELS) as Auftraggeberebene[]).map((v) => (
                          <SelectItem key={v} value={v}>{AUFTRAGGEBEREBENE_LABELS[v]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-ag-kontakt">Kontakt</Label>
                    <Input
                      id="create-ag-kontakt"
                      placeholder="E-Mail oder Telefon"
                      value={form.auftraggeberKontakt}
                      onChange={(e) => update('auftraggeberKontakt', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Notizen — always visible */}
      <div className="space-y-2">
        <Label htmlFor="create-notizen">Notizen</Label>
        <Textarea
          id="create-notizen"
          placeholder="Zusätzliche Informationen zum Projekt..."
          className="min-h-[100px]"
          maxLength={NOTIZEN_MAX_LENGTH}
          value={form.notizen}
          onChange={(e) => update('notizen', e.target.value)}
        />
        <div className="flex items-center justify-end">
          <span
            className={cn(
              'text-xs',
              notizenRemaining <= 0
                ? 'text-destructive font-medium'
                : notizenRemaining < 500
                  ? 'text-orange-500'
                  : 'text-muted-foreground',
            )}
          >
            {notizenRemaining.toLocaleString('de-DE')} Zeichen verbleibend
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={!form.name.trim() || isLoading}>
          {isLoading ? 'Erstellen...' : 'Erstellen'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// --- Main Component ---

export function ProjectsClient() {
  const router = useRouter()
  const { setItems } = useBreadcrumbs()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  const handleStatusChange = useCallback(
    async (projectId: string | number, newStatus: string) => {
      const result = await updateProjectStatus(projectId, newStatus)
      if (result.success) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, projectStatus: newStatus as ProjectStatus } : p,
          ),
        )
      }
    },
    [],
  )

  useEffect(() => {
    setItems([{ label: 'Projekte' }])
  }, [setItems])

  const loadProjects = useCallback(async () => {
    try {
      const docs = await fetchProjects()
      setProjects(docs)
    } catch {
      // Auth error → redirect handled by middleware
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleCreate = async (name: string, data: Partial<ProjektData>) => {
    setCreating(true)
    try {
      const project = await createProject({
        name,
        data: Object.keys(data).length > 0 ? data : undefined,
      })
      setCreateOpen(false)
      router.push(`/projects/${project.id}`)
    } catch {
      // handle error
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProject(deleteTarget.id)
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id))
    } finally {
      setDeleteTarget(null)
    }
  }

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== 'all' && p.projectStatus !== statusFilter) return false
      return true
    })
  }, [projects, search, statusFilter])

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mb-4 flex gap-3">
          <div className="h-9 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-9 w-[160px] animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Projekte</h1>
          <Badge variant="secondary">{filtered.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Neues Projekt
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

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Projekte suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {PROJECT_STATUSES.filter((s) => s.value !== 'aufgehoben').map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <FolderOpen className="size-12 opacity-40" />
          <p>
            {search || statusFilter !== 'all'
              ? 'Keine Projekte gefunden'
              : 'Noch keine Projekte vorhanden'}
          </p>
          {!search && statusFilter === 'all' && (
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 size-4" />
              Erstes Projekt erstellen
            </Button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y rounded-lg border">
            {filtered.map((project) => (
              <div
                key={String(project.id)}
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <FolderOpen className="text-muted-foreground size-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  {project.data?.vergaberecht && (
                    <p className="text-muted-foreground text-xs">
                      {VERGABERECHT_LABELS[project.data.vergaberecht] ?? project.data.vergaberecht}
                    </p>
                  )}
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <ProjectStatusDropdown
                    projectId={project.id}
                    currentStatus={project.projectStatus || 'planung'}
                    onStatusChange={handleStatusChange}
                  />
                </div>
                <span className="text-muted-foreground hidden md:block text-xs whitespace-nowrap">
                  {formatDate(project.updatedAt)}
                </span>
                <ProjectActions
                  onOpen={() => router.push(`/projects/${project.id}`)}
                  onArchive={() => setDeleteTarget(project)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <div
                key={String(project.id)}
                className="group cursor-pointer rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <div className="mb-3 flex items-start justify-between">
                  <FolderOpen className="text-muted-foreground size-8" />
                  <ProjectActions
                    onOpen={() => router.push(`/projects/${project.id}`)}
                    onArchive={() => setDeleteTarget(project)}
                  />
                </div>
                <p className="mb-1 truncate text-sm font-medium">{project.name}</p>
                {project.data?.vergaberecht && (
                  <p className="text-muted-foreground mb-2 text-xs">
                    {VERGABERECHT_LABELS[project.data.vergaberecht] ?? project.data.vergaberecht}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  <ProjectStatusDropdown
                    projectId={project.id}
                    currentStatus={project.projectStatus || 'planung'}
                    onStatusChange={handleStatusChange}
                  />
                  <span className="text-muted-foreground ml-auto text-xs">
                    {formatDate(project.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Neues Projekt</DialogTitle>
          </DialogHeader>
          <CreateProjectForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            isLoading={creating}
          />
        </DialogContent>
      </Dialog>

      {/* Archive Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projekt archivieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Projekt &ldquo;{deleteTarget?.name}&rdquo; wird archiviert und
              ist nicht mehr in der Liste sichtbar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Archivieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
