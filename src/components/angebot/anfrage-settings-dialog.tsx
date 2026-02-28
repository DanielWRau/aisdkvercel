'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ANFRAGE_GLIEDERUNGEN } from '@/prompts/angebot-gliederungen'
import type { AnfrageSettings, AnfrageLaenge, AnfrageGliederungsvorschlag } from '@/types/angebot'

interface AnfrageSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: AnfrageSettings
  onSave: (settings: AnfrageSettings) => void
}

const LAENGE_OPTIONS: { value: AnfrageLaenge; label: string }[] = [
  { value: 'kurz', label: 'Kurz' },
  { value: 'mittel', label: 'Mittel' },
  { value: 'lang', label: 'Lang' },
]

const GLIEDERUNG_OPTIONS: { value: AnfrageGliederungsvorschlag; label: string; description: string }[] =
  (Object.entries(ANFRAGE_GLIEDERUNGEN) as [AnfrageGliederungsvorschlag, (typeof ANFRAGE_GLIEDERUNGEN)[AnfrageGliederungsvorschlag]][]).map(
    ([key, def]) => ({ value: key, label: def.label, description: def.description }),
  )

export function AnfrageSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
}: AnfrageSettingsDialogProps) {
  const [draft, setDraft] = useState<AnfrageSettings>({ ...settings })

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft({ ...settings })
    onOpenChange(next)
  }

  const handleSave = () => {
    const cleaned: AnfrageSettings = {
      laenge: draft.laenge,
      gliederung: draft.gliederung,
      angebotsfrist: draft.angebotsfrist?.trim() || undefined,
      liefertermin: draft.liefertermin?.trim() || undefined,
      ansprechpartner: draft.ansprechpartner?.trim() || undefined,
      customInstructions: draft.customInstructions?.trim() || undefined,
    }
    onSave(cleaned)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Anfrage-Einstellungen</DialogTitle>
          <DialogDescription>
            Konfiguriere Format und Inhalte der Anfrage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Gliederungsvorschlag */}
          <div className="space-y-2">
            <Label>Gliederungsvorschlag</Label>
            <Select
              value={draft.gliederung ?? 'formal'}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, gliederung: v as AnfrageGliederungsvorschlag }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GLIEDERUNG_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span>{opt.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{opt.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Länge */}
          <div className="space-y-2">
            <Label>Länge</Label>
            <div className="inline-flex rounded-md border">
              {LAENGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    'px-4 py-1.5 text-sm font-medium transition-colors first:rounded-l-md last:rounded-r-md',
                    (draft.laenge ?? 'mittel') === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                  )}
                  onClick={() => setDraft((d) => ({ ...d, laenge: opt.value }))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Standardfelder */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Standardfelder</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="angebotsfrist">Angebotsfrist</Label>
                <Input
                  id="angebotsfrist"
                  value={draft.angebotsfrist ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, angebotsfrist: e.target.value.slice(0, 100) }))
                  }
                  placeholder="z.B. 14 Tage nach Versand"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="liefertermin">Liefertermin</Label>
                <Input
                  id="liefertermin"
                  value={draft.liefertermin ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, liefertermin: e.target.value.slice(0, 100) }))
                  }
                  placeholder="z.B. Q2 2026"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ansprechpartner">Ansprechpartner</Label>
              <Input
                id="ansprechpartner"
                value={draft.ansprechpartner ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, ansprechpartner: e.target.value.slice(0, 200) }))
                }
                placeholder="z.B. Max Müller, Tel 030-123456"
              />
            </div>
          </div>

          <Separator />

          {/* Custom Instructions */}
          <div className="space-y-2">
            <Label htmlFor="customInstructions">Zusätzliche Anweisungen</Label>
            <Textarea
              id="customInstructions"
              value={draft.customInstructions ?? ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  customInstructions: e.target.value.slice(0, 2000),
                }))
              }
              placeholder="z.B. Formale Anrede, Maximal 2 Seiten..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {(draft.customInstructions ?? '').length} / 2.000 Zeichen
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button onClick={handleSave}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
