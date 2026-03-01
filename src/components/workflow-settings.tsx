'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GLIEDERUNG_VORLAGEN, getVorlageById } from '@/data/gliederung-vorlagen'
import { getWorkflowSettings, updateUserSettings } from '@/actions/user-settings'
import type { WorkflowSettingsData } from '@/types/user-settings'
import { Loader2 } from 'lucide-react'

export type WorkflowSettings = {
  // Bedarfsanalyse
  maxFrageRunden: number
  fragenstil: 'standard' | 'technisch' | 'einfach' | 'it-fokus' | 'kaufmaennisch' | 'vergabeverfahren'
  // Marktrecherche
  region: string
  groessenPraeferenz: 'klein' | 'mittel' | 'gross' | 'alle'
  // Leistungsbeschreibung
  detailtiefe: 'kurz' | 'standard' | 'erweitert'
  stil: 'formal' | 'einfach'
  mitZeitplanung: boolean
  gliederungVorlage: string
  eigeneGliederungAktiv: boolean
  eigeneGliederung: string
}

export const DEFAULT_SETTINGS: WorkflowSettings = {
  maxFrageRunden: 2,
  fragenstil: 'standard',
  region: '',
  groessenPraeferenz: 'alle',
  detailtiefe: 'standard',
  stil: 'formal',
  mitZeitplanung: false,
  gliederungVorlage: 'standard',
  eigeneGliederungAktiv: false,
  eigeneGliederung: '',
}

function toWorkflowSettings(data: WorkflowSettingsData | null): WorkflowSettings {
  if (!data) return DEFAULT_SETTINGS
  return {
    maxFrageRunden: data.maxFrageRunden ?? DEFAULT_SETTINGS.maxFrageRunden,
    fragenstil: data.fragenstil ?? DEFAULT_SETTINGS.fragenstil,
    region: data.region ?? DEFAULT_SETTINGS.region,
    groessenPraeferenz: data.groessenPraeferenz ?? DEFAULT_SETTINGS.groessenPraeferenz,
    detailtiefe: data.detailtiefe ?? DEFAULT_SETTINGS.detailtiefe,
    stil: data.stil ?? DEFAULT_SETTINGS.stil,
    mitZeitplanung: data.mitZeitplanung ?? DEFAULT_SETTINGS.mitZeitplanung,
    gliederungVorlage: data.gliederungVorlage ?? DEFAULT_SETTINGS.gliederungVorlage,
    eigeneGliederungAktiv: data.eigeneGliederungAktiv ?? DEFAULT_SETTINGS.eigeneGliederungAktiv,
    eigeneGliederung: data.eigeneGliederung ?? DEFAULT_SETTINGS.eigeneGliederung,
  }
}

function toSettingsData(settings: WorkflowSettings): WorkflowSettingsData {
  return {
    maxFrageRunden: settings.maxFrageRunden,
    fragenstil: settings.fragenstil,
    region: settings.region,
    groessenPraeferenz: settings.groessenPraeferenz,
    detailtiefe: settings.detailtiefe,
    stil: settings.stil,
    mitZeitplanung: settings.mitZeitplanung,
    gliederungVorlage: settings.gliederungVorlage,
    eigeneGliederungAktiv: settings.eigeneGliederungAktiv,
    eigeneGliederung: settings.eigeneGliederung,
  }
}

export function WorkflowSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: WorkflowSettings
  onSave: (settings: WorkflowSettings) => void
}) {
  const [draft, setDraft] = useState<WorkflowSettings>(settings)
  const [loaded, setLoaded] = useState(false)
  const [saving, startSaving] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Load persisted settings from DB on first open
  useEffect(() => {
    if (open && !loaded) {
      getWorkflowSettings().then((data) => {
        if (data) {
          const merged = toWorkflowSettings(data)
          setDraft(merged)
          onSave(merged)
        }
        setLoaded(true)
      }).catch(() => {
        setLoaded(true)
      })
    }
  }, [open, loaded, onSave])

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setDraft(settings)
    }
    onOpenChange(isOpen)
  }

  const handleSave = () => {
    setError(null)
    startSaving(async () => {
      const result = await updateUserSettings({ workflowSettings: toSettingsData(draft) })
      if (result.success) {
        onSave(draft)
        onOpenChange(false)
      } else {
        setError(result.error ?? 'Fehler beim Speichern')
      }
    })
  }

  const selectedVorlage = getVorlageById(draft.gliederungVorlage)

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Workflow-Einstellungen</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="bedarfsanalyse" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="bedarfsanalyse">Bedarfsanalyse</TabsTrigger>
            <TabsTrigger value="marktrecherche">Marktrecherche</TabsTrigger>
            <TabsTrigger value="leistungsbeschreibung">Leistungsbeschr.</TabsTrigger>
          </TabsList>

          {/* Tab: Bedarfsanalyse */}
          <TabsContent value="bedarfsanalyse" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="fragerunden">Maximale Rückfragenrunden</Label>
              <Select
                value={String(draft.maxFrageRunden)}
                onValueChange={(v) =>
                  setDraft((s) => ({ ...s, maxFrageRunden: Number(v) }))
                }
              >
                <SelectTrigger id="fragerunden">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Runde</SelectItem>
                  <SelectItem value="2">2 Runden</SelectItem>
                  <SelectItem value="3">3 Runden</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Wie oft der Assistent Vertiefungsfragen stellen darf
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fragenstil">Fragenstil</Label>
              <Select
                value={draft.fragenstil}
                onValueChange={(v) =>
                  setDraft((s) => ({
                    ...s,
                    fragenstil: v as WorkflowSettings['fragenstil'],
                  }))
                }
              >
                <SelectTrigger id="fragenstil">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="technisch">Technisch</SelectItem>
                  <SelectItem value="einfach">Einfach</SelectItem>
                  <SelectItem value="it-fokus">IT-Fokus</SelectItem>
                  <SelectItem value="kaufmaennisch">Kaufmännisch</SelectItem>
                  <SelectItem value="vergabeverfahren">Vergabeverfahren</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {draft.fragenstil === 'standard' && 'Ausgewogener Mix aus fachlichen und technischen Fragen'}
                {draft.fragenstil === 'technisch' && 'Tiefgehende technische Fragen (Schnittstellen, Protokolle, Architektur)'}
                {draft.fragenstil === 'einfach' && 'Allgemeinverständliche Fragen, keine Fachbegriffe'}
                {draft.fragenstil === 'it-fokus' && 'IT-spezifische Fragen (Software, Hardware, Cloud, Sicherheit)'}
                {draft.fragenstil === 'kaufmaennisch' && 'Wirtschaftliche Fragen (Budget, Kosten, Vertragsmodelle, ROI)'}
                {draft.fragenstil === 'vergabeverfahren' && 'Fragen zum Vergabeverfahren (Lose, Eignungskriterien, Fristen)'}
              </p>
            </div>
          </TabsContent>

          {/* Tab: Marktrecherche */}
          <TabsContent value="marktrecherche" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                placeholder="z.B. NRW, Bayern, bundesweit"
                value={draft.region}
                onChange={(e) =>
                  setDraft((s) => ({ ...s, region: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Leer lassen für keine regionale Einschränkung
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="groesse">Unternehmensgröße</Label>
              <Select
                value={draft.groessenPraeferenz}
                onValueChange={(v) =>
                  setDraft((s) => ({
                    ...s,
                    groessenPraeferenz: v as WorkflowSettings['groessenPraeferenz'],
                  }))
                }
              >
                <SelectTrigger id="groesse">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Größen</SelectItem>
                  <SelectItem value="klein">Klein</SelectItem>
                  <SelectItem value="mittel">Mittel</SelectItem>
                  <SelectItem value="gross">Groß</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Tab: Leistungsbeschreibung */}
          <TabsContent value="leistungsbeschreibung" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="detailtiefe">Detailtiefe</Label>
              <Select
                value={draft.detailtiefe}
                onValueChange={(v) =>
                  setDraft((s) => ({
                    ...s,
                    detailtiefe: v as WorkflowSettings['detailtiefe'],
                  }))
                }
              >
                <SelectTrigger id="detailtiefe">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kurz">Kurz (2 Bereiche)</SelectItem>
                  <SelectItem value="standard">Standard (3 Bereiche)</SelectItem>
                  <SelectItem value="erweitert">Erweitert (5 Bereiche)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stil">Sprachstil</Label>
              <Select
                value={draft.stil}
                onValueChange={(v) =>
                  setDraft((s) => ({
                    ...s,
                    stil: v as WorkflowSettings['stil'],
                  }))
                }
              >
                <SelectTrigger id="stil">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal / Fachsprache</SelectItem>
                  <SelectItem value="einfach">Einfache Sprache</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="zeitplanung">Zeitplanung einbeziehen</Label>
              <Switch
                id="zeitplanung"
                checked={draft.mitZeitplanung}
                onCheckedChange={(v) =>
                  setDraft((s) => ({ ...s, mitZeitplanung: v }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="eigene-gliederung-toggle">Eigene Gliederung verwenden</Label>
              <Switch
                id="eigene-gliederung-toggle"
                checked={draft.eigeneGliederungAktiv}
                onCheckedChange={(v) =>
                  setDraft((s) => ({ ...s, eigeneGliederungAktiv: v }))
                }
              />
            </div>

            {!draft.eigeneGliederungAktiv && (
              <div className="space-y-1.5">
                <Label htmlFor="gliederung">Gliederungsvorlage</Label>
                <Select
                  value={draft.gliederungVorlage}
                  onValueChange={(v) =>
                    setDraft((s) => ({ ...s, gliederungVorlage: v }))
                  }
                >
                  <SelectTrigger id="gliederung">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GLIEDERUNG_VORLAGEN.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedVorlage?.beschreibung ?? ''}
                </p>
              </div>
            )}

            {/* Vorschau der gewählten Vorlage */}
            {!draft.eigeneGliederungAktiv && selectedVorlage && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Vorschau</Label>
                <div className="bg-muted/50 rounded-md border p-3 text-xs leading-relaxed max-h-40 overflow-y-auto">
                  {selectedVorlage.gliederung.map((punkt, i) => (
                    <div key={i} className="py-0.5">{punkt}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Freitext für eigene Gliederung */}
            {draft.eigeneGliederungAktiv && (
              <div className="space-y-1.5">
                <Label htmlFor="eigene-gliederung">Eigene Gliederung</Label>
                <Textarea
                  id="eigene-gliederung"
                  placeholder={`1. Gegenstand und Ziel der Leistung\n2. Rahmenbedingungen\n3. Leistungsumfang\n4. Anforderungen an das Personal\n5. Zeitplanung und Meilensteine`}
                  value={draft.eigeneGliederung}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, eigeneGliederung: e.target.value }))
                  }
                  rows={8}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Ein Gliederungspunkt pro Zeile. Unterpunkte in Klammern ergänzen.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
