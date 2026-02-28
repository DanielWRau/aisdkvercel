'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getAngebotsDraft,
  saveAngebotsDraft,
  getMarktanalyseProviders,
  getLeistungsbeschreibung,
  getAnfrageContext,
  getAngebotsDocuments,
} from '@/actions/angebot'
import type {
  Supplier,
  AnfrageSettings,
  AnfrageContextSource,
  AngebotsDocumentsResult,
  AngebotsResultTab,
} from '@/types/angebot'
import { mockSuppliers } from '@/data/mock-suppliers'

export interface UseAngebotsWorkflowReturn {
  suppliers: Supplier[]
  isLoadingDraft: boolean
  isLoadingProviders: boolean
  isGeneratingAnfrage: boolean
  isGeneratingVergleich: boolean
  error: string | null
  hasProvidersAvailable: boolean
  suppliersWithBids: number
  canGenerateVergleich: boolean
  hasLeistungsbeschreibung: boolean
  canGenerateAnfrage: boolean
  anfrageContextSource: AnfrageContextSource | null
  anfrageSettings: AnfrageSettings
  documents: AngebotsDocumentsResult
  // Streaming
  streamingContent: string | null
  streamingTab: AngebotsResultTab | null
  // Supplier Management
  importFromMarktanalyse: () => Promise<void>
  addSupplier: (name: string, kontakt?: string) => void
  removeSupplier: (id: string) => void
  updateSupplier: (id: string, updates: Partial<Supplier>) => void
  // Generation
  generateAnfrage: () => Promise<string | null>
  generateVergleich: () => Promise<string | null>
  // Documents
  refreshDocuments: () => Promise<void>
  // Settings
  updateAnfrageSettings: (settings: AnfrageSettings) => void
  // Dev helpers
  fillMockData: () => void
}

export function useAngebotsWorkflow(
  projectId: string | number,
): UseAngebotsWorkflowReturn {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoadingDraft, setIsLoadingDraft] = useState(true)
  const [isLoadingProviders, setIsLoadingProviders] = useState(false)
  const [isGeneratingAnfrage, setIsGeneratingAnfrage] = useState(false)
  const [isGeneratingVergleich, setIsGeneratingVergleich] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasProvidersAvailable, setHasProvidersAvailable] = useState(false)
  const [providersData, setProvidersData] = useState<
    { name: string; website?: string; kontakt?: string }[]
  >([])
  const [hasLeistungsbeschreibung, setHasLeistungsbeschreibung] = useState(false)
  const [leistungsbeschreibung, setLeistungsbeschreibung] = useState<string | null>(null)
  const [anfrageContext, setAnfrageContext] = useState<{
    source: AnfrageContextSource
    content: string
  } | null>(null)
  const [anfrageSettings, setAnfrageSettings] = useState<AnfrageSettings>({})
  const [documents, setDocuments] = useState<AngebotsDocumentsResult>({
    anfrage: null,
    vergleich: null,
  })
  const [streamingContent, setStreamingContent] = useState<string | null>(null)
  const [streamingTab, setStreamingTab] = useState<AngebotsResultTab | null>(null)

  const updatedAtRef = useRef<string | undefined>(undefined)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppliersRef = useRef(suppliers)
  suppliersRef.current = suppliers
  const anfrageSettingsRef = useRef(anfrageSettings)
  anfrageSettingsRef.current = anfrageSettings

  // Load initial data
  useEffect(() => {
    async function load() {
      setIsLoadingDraft(true)
      setIsLoadingProviders(true)
      setError(null)

      try {
        const [draft, providers, lb, ctx, docs] = await Promise.all([
          getAngebotsDraft(projectId),
          getMarktanalyseProviders(projectId),
          getLeistungsbeschreibung(projectId),
          getAnfrageContext(projectId),
          getAngebotsDocuments(projectId),
        ])

        if (draft) {
          setSuppliers(draft.suppliers)
          if (draft.anfrageSettings) setAnfrageSettings(draft.anfrageSettings)
          updatedAtRef.current = draft.updatedAt
        }

        setHasProvidersAvailable(providers.available)
        setProvidersData(providers.providers)
        setHasLeistungsbeschreibung(!!lb)
        setLeistungsbeschreibung(lb)
        setAnfrageContext(ctx)
        setDocuments(docs)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Fehler beim Laden der Daten',
        )
      } finally {
        setIsLoadingDraft(false)
        setIsLoadingProviders(false)
      }
    }
    load()
  }, [projectId])

  // Debounced auto-save
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const result = await saveAngebotsDraft({
        projectId,
        suppliers: suppliersRef.current,
        anfrageSettings: anfrageSettingsRef.current,
        updatedAt: updatedAtRef.current,
      })
      if (result.success && result.updatedAt) {
        updatedAtRef.current = result.updatedAt
      } else if (result.error) {
        setError(result.error)
      }
    }, 2000)
  }, [projectId])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const addSupplier = useCallback(
    (name: string, kontakt?: string) => {
      const newSupplier: Supplier = {
        id: crypto.randomUUID(),
        name,
        kontakt,
      }
      setSuppliers((prev) => [...prev, newSupplier])
      scheduleSave()
    },
    [scheduleSave],
  )

  const removeSupplier = useCallback(
    (id: string) => {
      setSuppliers((prev) => prev.filter((s) => s.id !== id))
      scheduleSave()
    },
    [scheduleSave],
  )

  const updateSupplier = useCallback(
    (id: string, updates: Partial<Supplier>) => {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      )
      scheduleSave()
    },
    [scheduleSave],
  )

  const importFromMarktanalyse = useCallback(async () => {
    if (!providersData.length) return

    setSuppliers((prev) => {
      const existingNames = new Set(prev.map((s) => s.name.toLowerCase()))
      const newSuppliers = providersData
        .filter((p) => !existingNames.has(p.name.toLowerCase()))
        .map((p) => ({
          id: crypto.randomUUID(),
          name: p.name,
          website: p.website,
          kontakt: p.kontakt,
        }))
      return [...prev, ...newSuppliers]
    })
    scheduleSave()
  }, [providersData, scheduleSave])

  /** Read a text stream from a fetch Response and update streamingContent progressively */
  const readTextStream = useCallback(
    async (res: Response): Promise<string> => {
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setStreamingContent(accumulated)
      }

      return accumulated
    },
    [],
  )

  const generateAnfrage = useCallback(async (): Promise<string | null> => {
    if (!anfrageContext) {
      setError('Kein Kontext vorhanden (Leistungsbeschreibung, Marktrecherche oder Bedarfsanalyse)')
      return null
    }

    setIsGeneratingAnfrage(true)
    setStreamingContent('')
    setStreamingTab('anfrage')
    setError(null)

    try {
      const res = await fetch('/api/angebot/anfrage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          context: anfrageContext.content,
          contextSource: anfrageContext.source,
          settings: anfrageSettingsRef.current,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Fehler: ${res.status}`)
      }

      const content = await readTextStream(res)

      // Give server time to save via onFinish, then refresh
      await new Promise((r) => setTimeout(r, 800))
      const docs = await getAngebotsDocuments(projectId)
      setDocuments(docs)

      return content
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Fehler bei der Anfrage-Generierung',
      )
      return null
    } finally {
      setIsGeneratingAnfrage(false)
      setStreamingContent(null)
      setStreamingTab(null)
    }
  }, [projectId, anfrageContext, readTextStream])

  const generateVergleich = useCallback(async (): Promise<string | null> => {
    const withBids = suppliersRef.current.filter(
      (s) => s.angebotText && s.angebotText.length >= 10,
    )
    if (withBids.length < 2) {
      setError('Mindestens 2 Angebote erforderlich')
      return null
    }

    setIsGeneratingVergleich(true)
    setStreamingContent('')
    setStreamingTab('vergleich')
    setError(null)

    try {
      const res = await fetch('/api/angebot/vergleich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          leistungsbeschreibung: leistungsbeschreibung ?? undefined,
          suppliers: withBids.map((s) => ({
            name: s.name,
            angebotText: s.angebotText!,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Fehler: ${res.status}`)
      }

      const content = await readTextStream(res)

      // Give server time to save via onFinish, then refresh
      await new Promise((r) => setTimeout(r, 800))
      const docs = await getAngebotsDocuments(projectId)
      setDocuments(docs)

      return content
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Fehler bei der Vergleich-Generierung',
      )
      return null
    } finally {
      setIsGeneratingVergleich(false)
      setStreamingContent(null)
      setStreamingTab(null)
    }
  }, [projectId, leistungsbeschreibung, readTextStream])

  const refreshDocuments = useCallback(async () => {
    const docs = await getAngebotsDocuments(projectId)
    setDocuments(docs)
  }, [projectId])

  const updateAnfrageSettings = useCallback(
    (settings: AnfrageSettings) => {
      setAnfrageSettings(settings)
      scheduleSave()
    },
    [scheduleSave],
  )

  const fillMockData = useCallback(() => {
    const mocked: Supplier[] = mockSuppliers.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
    }))
    setSuppliers(mocked)
    scheduleSave()
  }, [scheduleSave])

  const suppliersWithBids = suppliers.filter(
    (s) => s.angebotText && s.angebotText.length >= 10,
  ).length

  return {
    suppliers,
    isLoadingDraft,
    isLoadingProviders,
    isGeneratingAnfrage,
    isGeneratingVergleich,
    error,
    hasProvidersAvailable,
    suppliersWithBids,
    canGenerateVergleich: suppliersWithBids >= 2,
    hasLeistungsbeschreibung,
    canGenerateAnfrage: !!anfrageContext,
    anfrageContextSource: anfrageContext?.source ?? null,
    anfrageSettings,
    documents,
    streamingContent,
    streamingTab,
    importFromMarktanalyse,
    addSupplier,
    removeSupplier,
    updateSupplier,
    generateAnfrage,
    generateVergleich,
    refreshDocuments,
    updateAnfrageSettings,
    fillMockData,
  }
}
