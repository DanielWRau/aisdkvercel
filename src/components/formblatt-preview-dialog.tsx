'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import type { FormStructure, FormSection, FormField } from '@/lib/form-structure'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formularNummer: string
  name: string
  structure: FormStructure | null
  isLoading: boolean
}

const formTypeLabels: Record<string, string> = {
  fillable: 'Ausfüllbar',
  'annotation-only': 'Nur Annotation',
  mixed: 'Gemischt',
}

function FieldTypeBadge({ type, einheit }: { type: string; einheit?: string }) {
  const label = einheit ?? type
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
      {label}
    </Badge>
  )
}

function FieldList({ felder }: { felder: FormField[] }) {
  if (felder.length === 0) return null
  return (
    <ul className="space-y-1.5 mt-2">
      {felder.map((f) => (
        <li key={f.id} className="text-sm">
          <div className="flex items-center gap-1.5 flex-wrap">
            <code className="text-xs bg-muted px-1 py-0.5 rounded">{f.id}</code>
            <span>{f.label}</span>
            <FieldTypeBadge type={f.type} einheit={f.einheit} />
            {f.pflicht !== false && (
              <span className="text-destructive text-xs">*</span>
            )}
          </div>
          {f.beschreibung && (
            <p className="text-xs text-muted-foreground ml-1 mt-0.5">{f.beschreibung}</p>
          )}
          {f.optionen && f.optionen.length > 0 && (
            <p className="text-xs text-muted-foreground ml-1 mt-0.5">
              Optionen: {f.optionen.join(' / ')}
            </p>
          )}
          {f.type === 'array' && f.spalten && f.spalten.length > 0 && (
            <div className="ml-4 mt-1 text-xs text-muted-foreground">
              <span className="font-medium">Spalten:</span>{' '}
              {f.spalten.map((s) => s.label).join(', ')}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function SectionRenderer({ section, depth }: { section: FormSection; depth: number }) {
  const HeadingTag = depth <= 1 ? 'h3' : 'h4'
  const headingSize = depth <= 1 ? 'text-sm font-semibold' : 'text-sm font-medium'

  return (
    <div className={depth > 1 ? 'pl-4 border-l border-border' : ''}>
      <HeadingTag className={`${headingSize} mt-3 mb-1`}>
        {section.nummer && <span className="text-muted-foreground mr-1">{section.nummer}.</span>}
        {section.titel}
      </HeadingTag>

      {section.bedingt && section.bedingungHinweis && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">
          Bedingt: {section.bedingungHinweis}
        </p>
      )}

      {section.festtext && (
        <p className="text-xs text-muted-foreground italic whitespace-pre-line line-clamp-4">
          {section.festtext}
        </p>
      )}

      {section.annotierbar && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          KI-Einordnung wird generiert
        </p>
      )}

      <FieldList felder={section.felder} />

      {section.unterabschnitte && section.unterabschnitte.length > 0 && (
        <div className="mt-2 space-y-2">
          {section.unterabschnitte.map((sub) => (
            <SectionRenderer key={sub.id} section={sub} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function FormblattPreviewDialog({ open, onOpenChange, formularNummer, name, structure, isLoading }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{formularNummer}: {name}</DialogTitle>
          {!isLoading && structure && (
            <DialogDescription asChild>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{formTypeLabels[structure.formType] ?? structure.formType}</Badge>
                <span className="text-sm text-muted-foreground">
                  {structure.sections.length} Abschnitt{structure.sections.length !== 1 ? 'e' : ''}
                </span>
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && !structure && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Formularstruktur noch nicht hinterlegt.
            </p>
          )}

          {!isLoading && structure && (
            <div className="space-y-3 pb-2">
              {structure.sections.map((section) => (
                <SectionRenderer key={section.id} section={section} depth={1} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
