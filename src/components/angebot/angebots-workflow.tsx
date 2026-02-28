'use client'

import { useState } from 'react'
import { Loader2, Download, FileText, AlertCircle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SupplierCard, AddSupplierForm } from './supplier-card'
import { AnfrageSettingsDialog } from './anfrage-settings-dialog'
import type { UseAngebotsWorkflowReturn } from '@/hooks/use-angebots-workflow'
import { downloadFile } from '@/lib/download'

const CONTEXT_SOURCE_LABELS: Record<string, string> = {
  leistungsbeschreibung: 'Leistungsbeschreibung vorhanden',
  marketResearch: 'Kontext: Marktrecherche',
  askQuestions: 'Kontext: Bedarfsanalyse',
}

interface AngebotsWorkflowProps {
  project: { id: string | number; name: string }
  wf: UseAngebotsWorkflowReturn
}

export function AngebotsWorkflow({
  project,
  wf,
}: AngebotsWorkflowProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleGenerateAnfrage = async () => {
    await wf.generateAnfrage()
  }

  const handleGenerateVergleich = async () => {
    await wf.generateVergleich()
  }

  const contextLabel = wf.anfrageContextSource
    ? CONTEXT_SOURCE_LABELS[wf.anfrageContextSource]
    : null

  return (
    <div className="h-full flex flex-col overflow-hidden min-w-0">
      {/* Context Section — fixed */}
      <div className="shrink-0 border-b p-4 space-y-1 bg-background">
        <h2
          className="text-lg font-semibold"
          onDoubleClick={
            process.env.NODE_ENV === 'development'
              ? () => wf.fillMockData()
              : undefined
          }
        >
          {project.name}
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          {contextLabel ? (
            <span className="text-green-600">{contextLabel}</span>
          ) : (
            <span>Kein Kontext vorhanden</span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {wf.error && (
        <div className="shrink-0 mx-4 mt-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{wf.error}</p>
        </div>
      )}

      {/* Suppliers — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              Lieferanten
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {wf.suppliers.length} erfasst, {wf.suppliersWithBids} mit Angebot
            </Badge>
          </div>
        </div>

        {/* Import Button */}
        {wf.hasProvidersAvailable && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5"
            onClick={wf.importFromMarktanalyse}
            disabled={wf.isLoadingProviders}
          >
            <Download className="h-3.5 w-3.5" />
            Aus Marktanalyse importieren
          </Button>
        )}

        {/* Supplier Cards */}
        {wf.suppliers.map((supplier) => (
          <SupplierCard
            key={supplier.id}
            supplier={supplier}
            onUpdate={wf.updateSupplier}
            onRemove={wf.removeSupplier}
          />
        ))}

        {/* Add Form */}
        <AddSupplierForm onAdd={wf.addSupplier} />
      </div>

      {/* Action Buttons — fixed at bottom */}
      <div className="shrink-0 border-t p-3 sm:p-4 bg-background">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Left: Generate Anfrage */}
          <Button
            onClick={handleGenerateAnfrage}
            disabled={
              !wf.canGenerateAnfrage ||
              wf.isGeneratingAnfrage ||
              wf.isGeneratingVergleich
            }
            size="lg"
            className="h-12 sm:h-14 gap-1.5 sm:gap-2 px-2 sm:px-4 overflow-hidden"
          >
            {wf.isGeneratingAnfrage ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-medium truncate leading-tight">
              Anfrage gen.
            </span>
          </Button>

          {/* Center: Generate Vergleich */}
          <Button
            onClick={handleGenerateVergleich}
            disabled={
              !wf.canGenerateVergleich ||
              wf.isGeneratingAnfrage ||
              wf.isGeneratingVergleich
            }
            variant="outline"
            size="lg"
            className="h-12 sm:h-14 gap-1.5 sm:gap-2 px-2 sm:px-4 overflow-hidden"
          >
            {wf.isGeneratingVergleich ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-medium truncate leading-tight">
              Auswertung
            </span>
          </Button>

          {/* Right: Export + Settings */}
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-12 sm:h-14 gap-1.5 sm:gap-2 px-2 sm:px-4 overflow-hidden"
              disabled={!wf.documents.anfrage && !wf.documents.vergleich}
              onClick={() => {
                if (wf.documents.anfrage?.content) {
                  downloadFile('Angebotsanfrage.md', wf.documents.anfrage.content)
                }
                if (wf.documents.vergleich?.content) {
                  downloadFile('Angebotsvergleich.md', wf.documents.vergleich.content)
                }
              }}
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">
                Export
              </span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="shrink-0 h-12 sm:h-14 px-3"
              onClick={() => setSettingsOpen(true)}
              disabled={!wf.canGenerateAnfrage}
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <AnfrageSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={wf.anfrageSettings}
        onSave={wf.updateAnfrageSettings}
      />
    </div>
  )
}
