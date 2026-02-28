'use client'

import { useState } from 'react'
import { X, ExternalLink, FileText, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import type { Supplier } from '@/types/angebot'

// --- SupplierCard ---

interface SupplierCardProps {
  supplier: Supplier
  onUpdate: (id: string, updates: Partial<Supplier>) => void
  onRemove: (id: string) => void
}

export function SupplierCard({ supplier, onUpdate, onRemove }: SupplierCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const hasAngebot = !!supplier.angebotText && supplier.angebotText.length > 0

  return (
    <>
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">
                {supplier.name}
              </span>
              {hasAngebot ? (
                <Badge
                  variant="default"
                  className="bg-green-600 text-white text-[10px] px-1.5 py-0"
                >
                  Angebot
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  offen
                </Badge>
              )}
            </div>
            {supplier.website && (
              <a
                href={
                  supplier.website.startsWith('http')
                    ? supplier.website
                    : `https://${supplier.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{supplier.website}</span>
              </a>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemove(supplier.id)}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => setSheetOpen(true)}
        >
          {hasAngebot ? (
            <>
              <PenLine className="h-3.5 w-3.5" />
              Angebot bearbeiten
            </>
          ) : (
            <>
              <FileText className="h-3.5 w-3.5" />
              Angebot erfassen
            </>
          )}
        </Button>
      </div>

      <SupplierModal
        supplier={supplier}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={(updates) => {
          onUpdate(supplier.id, updates)
          setSheetOpen(false)
        }}
      />
    </>
  )
}

// --- SupplierModal ---

interface SupplierModalProps {
  supplier: Supplier
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updates: Partial<Supplier>) => void
}

function SupplierModal({
  supplier,
  open,
  onOpenChange,
  onSave,
}: SupplierModalProps) {
  const [kontakt, setKontakt] = useState(supplier.kontakt ?? '')
  const [website, setWebsite] = useState(supplier.website ?? '')
  const [angebotText, setAngebotText] = useState(supplier.angebotText ?? '')

  // Sync state when supplier changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setKontakt(supplier.kontakt ?? '')
      setWebsite(supplier.website ?? '')
      setAngebotText(supplier.angebotText ?? '')
    }
    onOpenChange(isOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Angebot: {supplier.name}</SheetTitle>
          <SheetDescription>
            Erfassen Sie das Angebot und die Kontaktdaten
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Kontakt</label>
            <Input
              value={kontakt}
              onChange={(e) => setKontakt(e.target.value)}
              placeholder="E-Mail oder Telefon"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Website</label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="www.beispiel.de"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Angebotstext</label>
              <span className="text-xs text-muted-foreground">
                {angebotText.length.toLocaleString('de-DE')} / 50.000
              </span>
            </div>
            <textarea
              value={angebotText}
              onChange={(e) => setAngebotText(e.target.value)}
              placeholder="Fügen Sie hier den vollständigen Angebotstext ein..."
              className="w-full min-h-[300px] resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
              maxLength={50000}
            />
          </div>
        </div>

        <SheetFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={() =>
              onSave({
                kontakt: kontakt || undefined,
                website: website || undefined,
                angebotText: angebotText || undefined,
              })
            }
          >
            Speichern
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// --- AddSupplierForm ---

interface AddSupplierFormProps {
  onAdd: (name: string, kontakt?: string) => void
}

export function AddSupplierForm({ onAdd }: AddSupplierFormProps) {
  const [expanded, setExpanded] = useState(false)
  const [name, setName] = useState('')
  const [kontakt, setKontakt] = useState('')

  if (!expanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={() => setExpanded(true)}
      >
        + Lieferant hinzufügen
      </Button>
    )
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    onAdd(name.trim(), kontakt.trim() || undefined)
    setName('')
    setKontakt('')
    setExpanded(false)
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Firmenname *"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') setExpanded(false)
        }}
      />
      <Input
        value={kontakt}
        onChange={(e) => setKontakt(e.target.value)}
        placeholder="Kontakt (optional)"
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') setExpanded(false)
        }}
      />
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 text-xs" onClick={handleSubmit} disabled={!name.trim()}>
          Hinzufügen
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setExpanded(false)}
        >
          Abbrechen
        </Button>
      </div>
    </div>
  )
}
