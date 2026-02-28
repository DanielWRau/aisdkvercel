'use client'

import { useState, useMemo, useCallback, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileCheck, Info, Eye } from 'lucide-react'
import type { FormTemplateItem } from '@/actions/form-templates'
import { getFormTemplateStructure } from '@/actions/form-templates'
import type { FormStructure } from '@/lib/form-structure'
import { useFormblatt, type FormblattTab } from '@/providers/formblatt-provider'
import { FormblattPreviewDialog } from '@/components/formblatt-preview-dialog'

type Props = {
  templates: FormTemplateItem[]
  sammlungen: string[]
  schaetzwert?: number | null
  existingDocuments: { id: string | number; tags?: { tag: string }[] | null }[]
}

export function FormblattSelector({ templates, sammlungen, schaetzwert, existingDocuments }: Props) {
  const { tabs, setTabs, isGenerating, progress } = useFormblatt()

  // Preview dialog state
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewStructure, setPreviewStructure] = useState<FormStructure | null>(null)
  const [isPreviewPending, startPreviewTransition] = useTransition()
  const previewTemplate = useMemo(
    () => templates.find((t) => String(t.id) === previewId) ?? null,
    [templates, previewId],
  )

  const openPreview = useCallback((id: string) => {
    setPreviewId(id)
    setPreviewStructure(null)
    startPreviewTransition(async () => {
      const result = await getFormTemplateStructure(id)
      setPreviewStructure(result)
    })
  }, [])

  // Sammlung filter — defaults to first available
  const [activeSammlung, setActiveSammlung] = useState<string>(sammlungen[0] ?? '')

  // Label filter state
  const [activeLabels, setActiveLabels] = useState<Set<string>>(new Set())

  // Manual overrides: tracks user's explicit toggle actions
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({})

  // Templates in active Sammlung
  const sammlungTemplates = useMemo(() => {
    if (!activeSammlung) return templates
    return templates.filter((t) => t.sammlung === activeSammlung)
  }, [templates, activeSammlung])

  // Labels available in the active Sammlung
  const sammlungLabels = useMemo(() => {
    const labelSet = new Set<string>()
    for (const t of sammlungTemplates) {
      for (const l of t.labels) {
        if (l.label) labelSet.add(l.label)
      }
    }
    return Array.from(labelSet).sort()
  }, [sammlungTemplates])

  // Filtered templates by active labels (within active Sammlung)
  const filtered = useMemo(() => {
    if (activeLabels.size === 0) return sammlungTemplates
    return sammlungTemplates.filter((t) =>
      t.labels.some((l) => activeLabels.has(l.label)),
    )
  }, [sammlungTemplates, activeLabels])

  // Combine auto-selection with manual overrides
  const selectedIds = useMemo(() => {
    const selected = new Set<string>()
    for (const t of filtered) {
      const id = String(t.id)
      if (id in manualOverrides) {
        if (manualOverrides[id]) selected.add(id)
      } else if (t.pflicht && (!t.anwendungsschwelle || !schaetzwert || schaetzwert >= t.anwendungsschwelle)) {
        selected.add(id)
      }
    }
    return selected
  }, [filtered, schaetzwert, manualOverrides])

  const handleSammlungChange = useCallback((sammlung: string) => {
    setActiveSammlung(sammlung)
    setActiveLabels(new Set())
    setManualOverrides({})
  }, [])

  const toggleLabel = useCallback((label: string) => {
    setActiveLabels((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
    setManualOverrides({})
  }, [])

  const toggleTemplate = useCallback((id: string) => {
    setManualOverrides((prev) => ({
      ...prev,
      [id]: !selectedIds.has(id),
    }))
  }, [selectedIds])

  const hasExistingDoc = useCallback(
    (formularNummer: string) => {
      return existingDocuments.some(
        (d) => d.tags?.some((t) => t.tag === formularNummer),
      )
    },
    [existingDocuments],
  )

  const handleGenerate = useCallback(() => {
    const selected = filtered.filter((t) => selectedIds.has(String(t.id)))
    const newTabs: FormblattTab[] = selected.map((t) => ({
      tabId: `tmpl:${t.id}`,
      templateId: String(t.id),
      formularNummer: t.formularNummer,
      name: t.name,
      status: 'idle',
      content: null,
    }))
    // Preserve existing done tabs, add new ones
    setTabs((prev: FormblattTab[]) => {
      const doneTabs = prev.filter((tab) => tab.status === 'done')
      return [...doneTabs, ...newTabs]
    })
  }, [filtered, selectedIds, setTabs])

  return (
    <div className="h-full flex flex-col overflow-hidden min-w-0">
      {/* Fixed header */}
      <div className="shrink-0 border-b p-4 bg-background">
        <h2 className="text-lg font-semibold">Formblätter</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Vergabeformulare mit KI befüllen
        </p>
      </div>

      {/* Sammlung tabs */}
      {sammlungen.length > 1 && (
        <div className="shrink-0 border-b bg-background overflow-x-auto">
          <div className="flex">
            {sammlungen.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSammlungChange(s)}
                className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeSammlung === s
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Label filter */}
        {sammlungLabels.length > 1 && (
        <div>
          <p className="text-sm font-medium mb-2">Filter nach Label</p>
          <div className="flex flex-wrap gap-2">
            {sammlungLabels.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleLabel(label)}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeLabels.has(label)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Template list */}
        <div className="space-y-2">
          {filtered.map((t) => {
            const id = String(t.id)
            const checked = selectedIds.has(id)
            const existing = hasExistingDoc(t.formularNummer)

            return (
              <label
                key={id}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleTemplate(id)}
                  disabled={isGenerating}
                  className="mt-0.5 size-4 rounded border-input accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t.formularNummer}</span>
                    {t.pflicht && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Pflicht
                      </Badge>
                    )}
                    {existing && (
                      <FileCheck className="size-3.5 text-emerald-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{t.name}</p>
                  {t.anwendungsschwelle && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Info className="size-3" />
                      ab {t.anwendungsschwelle.toLocaleString('de-DE')} EUR netto
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  title="Vorschau"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openPreview(id)
                  }}
                  className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Eye className="size-4" />
                </button>
              </label>
            )
          })}

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Keine Templates für die gewählten Filter
            </p>
          )}
        </div>
      </div>

      {/* Fixed footer */}
      <div className="shrink-0 border-t p-3 sm:p-4 bg-background space-y-2">
        {tabs.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {progress.current}/{progress.total} Formulare generiert
          </p>
        )}
        <Button
          onClick={handleGenerate}
          disabled={selectedIds.size === 0 || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Wird generiert...
            </>
          ) : (
            `${selectedIds.size} Formular${selectedIds.size !== 1 ? 'e' : ''} generieren`
          )}
        </Button>
      </div>

      <FormblattPreviewDialog
        open={!!previewId}
        onOpenChange={(open) => { if (!open) setPreviewId(null) }}
        formularNummer={previewTemplate?.formularNummer ?? ''}
        name={previewTemplate?.name ?? ''}
        structure={previewStructure}
        isLoading={isPreviewPending}
      />
    </div>
  )
}
