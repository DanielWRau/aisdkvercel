'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai'
import { type ChatMessage } from '@/tools/index'
import { marketResearchResultSchema, type MarketResearchResult } from '@/tools/market-research-schema'
import { specResultSchema, type SpecResult } from '@/tools/generate-spec-schema'
import { normalizeBedarfsData, type AnswerItem } from '@/lib/tool-transformers'
import { QuestionWizard } from '@/components/QuestionWizard'
import { useWorkspace } from '@/providers/workspace-provider'
import { saveToolResult, getProjectDocuments, getDocumentVersionCount } from '@/actions/documents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Loader2,
  Settings,
  Download,
} from 'lucide-react'
import {
  WorkflowSettingsDialog,
  DEFAULT_SETTINGS,
  type WorkflowSettings,
} from '@/components/workflow-settings'

type WorkflowDocument = {
  id: string | number
  sourceToolType?: string | null
  jsonData?: unknown
  workflowStatus?: string | null
}

type QuestionPart = Extract<
  ChatMessage['parts'][number],
  { type: 'tool-askQuestions' }
>
type ResearchPart = Extract<
  ChatMessage['parts'][number],
  { type: 'tool-marketResearch' }
>
type SpecPart = Extract<
  ChatMessage['parts'][number],
  { type: 'tool-generateSpec' }
>

export function BedarfsWorkflow({
  project,
  documents = [],
  onDocumentSaved,
}: {
  project: { id: string | number; name: string; description?: unknown }
  documents?: WorkflowDocument[]
  onDocumentSaved?: (doc: unknown) => void
}) {
  const { updateTabContent, setActiveTab, setTabVersion } = useWorkspace()
  const [context, setContext] = useState(project.name)
  const [phase, setPhase] = useState<'initial' | 'questions' | 'ready' | 'research' | 'spec'>('initial')
  const [exporting, setExporting] = useState(false)
  const [settings, setSettings] = useState<WorkflowSettings>(DEFAULT_SETTINGS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Refs for saved data from documents (used when chat is empty)
  const savedAnswersRef = useRef<AnswerItem[]>([])
  const savedResearchRef = useRef<MarketResearchResult | null>(null)
  const savedSpecRef = useRef<SpecResult | null>(null)

  // Version bump tracking — only bump once per workflow run
  const bedarfsDoneRef = useRef(false)
  const researchDoneRef = useRef(false)
  const specDoneRef = useRef(false)
  const lastPersistedSummary = useRef('')

  // Session for rate-limiting in knowledgeSearch
  const sessionIdRef = useRef(crypto.randomUUID())
  const sessionId = sessionIdRef.current

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      headers: { 'x-session-id': sessionId, 'x-project-id': String(project.id) },
    }),
    [sessionId, project.id],
  )

  const { messages, sendMessage, addToolOutput, status } =
    useChat<ChatMessage>({
      transport,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Initialize phase and tab content from saved documents on mount
  const mountedRef = useRef(false)
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    const askDoc = documents.find(d => d.sourceToolType === 'askQuestions' && d.workflowStatus !== 'archived')
    const researchDoc = documents.find(d => d.sourceToolType === 'marketResearch' && d.workflowStatus !== 'archived')
    const specDoc = documents.find(d => d.sourceToolType === 'generateSpec' && d.workflowStatus !== 'archived')

    if (askDoc?.jsonData) {
      const normalized = normalizeBedarfsData(askDoc.jsonData)
      if (normalized.answers.length > 0) {
        savedAnswersRef.current = normalized.answers
        bedarfsDoneRef.current = true
        updateTabContent('bedarfsanalyse', { answers: normalized.answers, summary: normalized.summary }, 'done', { skipVersionBump: true })
        // Sync version from Payload CMS
        getDocumentVersionCount(askDoc.id).then(count => setTabVersion('bedarfsanalyse', count))
      }
    }
    if (researchDoc?.jsonData) {
      const parsed = marketResearchResultSchema.safeParse(researchDoc.jsonData)
      if (parsed.success) {
        savedResearchRef.current = parsed.data
        researchDoneRef.current = true
        updateTabContent('marktanalyse', parsed.data, 'done', { skipVersionBump: true })
        getDocumentVersionCount(researchDoc.id).then(count => setTabVersion('marktanalyse', count))
      }
    }
    if (specDoc?.jsonData) {
      const parsed = specResultSchema.safeParse(specDoc.jsonData)
      if (parsed.success) {
        savedSpecRef.current = parsed.data
        specDoneRef.current = true
        updateTabContent('leistungsbeschreibung', parsed.data, 'done', { skipVersionBump: true })
        getDocumentVersionCount(specDoc.id).then(count => setTabVersion('leistungsbeschreibung', count))
      }
    }

    // If any saved docs exist, workflow has been started before
    if (askDoc?.jsonData || researchDoc?.jsonData || specDoc?.jsonData) setPhase('ready')

    setActiveTab('bedarfsanalyse')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Collect tool parts from messages
  const questionParts: QuestionPart[] = []
  const researchParts: ResearchPart[] = []
  const specParts: SpecPart[] = []

  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const part of message.parts) {
      if (part.type === 'tool-askQuestions') questionParts.push(part)
      else if (part.type === 'tool-marketResearch') researchParts.push(part)
      else if (part.type === 'tool-generateSpec') specParts.push(part)
    }
  }

  const activeWizard = questionParts.find((p) => p.state === 'input-available')
  const streamingWizard = questionParts.find((p) => p.state === 'input-streaming')
  const completedWizards = questionParts.filter((p) => p.state === 'output-available')

  const activeResearch = researchParts.find(
    (p) => p.state === 'input-streaming' || p.state === 'input-available',
  )
  // Streaming research: preliminary tool result
  const streamingResearch = researchParts.find(
    (p) => p.state === 'output-available' && p.preliminary === true,
  )
  const completedResearch = researchParts.filter((p) => p.state === 'output-available' && !p.preliminary)

  const activeSpec = specParts.find(
    (p) => p.state === 'input-streaming' || p.state === 'input-available',
  )
  // Streaming spec: preliminary tool result
  const streamingSpec = specParts.find(
    (p) => p.state === 'output-available' && p.preliminary === true,
  )
  const completedSpecs = specParts.filter((p) => p.state === 'output-available' && !p.preliminary)

  // All collected answers
  const allAnswers: AnswerItem[] = []
  for (const wp of completedWizards) {
    try {
      const items: AnswerItem[] = JSON.parse(wp.output)
      for (const item of items) {
        if (item.selectedOptions?.length > 0 || item.freeText) {
          allAnswers.push(item)
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Extract summary text from assistant messages AFTER the last completed wizard.
  // Only capture text that appears after the tool-askQuestions part itself,
  // not bridge text before it (e.g. "Ich benötige Vertiefungsfragen...").
  let analysisSummary = ''
  if (completedWizards.length > 0 && !activeWizard && !streamingWizard) {
    const lastCompletedWizardId = completedWizards[completedWizards.length - 1].toolCallId
    const lastWizardMsgIdx = messages.findIndex(m =>
      m.parts.some(p => p.type === 'tool-askQuestions' && 'toolCallId' in p && p.toolCallId === lastCompletedWizardId)
    )
    if (lastWizardMsgIdx !== -1) {
      let pastLastWizardPart = false
      outer: for (let i = lastWizardMsgIdx; i < messages.length; i++) {
        const msg = messages[i]
        if (msg.role !== 'assistant') continue
        if (i > lastWizardMsgIdx) pastLastWizardPart = true
        for (const part of msg.parts) {
          if (!pastLastWizardPart && part.type === 'tool-askQuestions' && 'toolCallId' in part && part.toolCallId === lastCompletedWizardId) {
            pastLastWizardPart = true
            continue
          }
          if (pastLastWizardPart && part.type === 'text') {
            // Strip "Nächste Schritte" and everything after, clean up markdown headers
            let text = part.text
            const nextStepsIdx = text.search(/\*{0,2}Nächste Schritte\*{0,2}\s*:?/i)
            if (nextStepsIdx > 0) text = text.substring(0, nextStepsIdx).trim()
            // Remove leading "Zusammenfassung der Anforderungen:" header
            text = text.replace(/^\*{0,2}Zusammenfassung der Anforderungen:?\*{0,2}\s*/i, '')
            analysisSummary = text
          }
          if (pastLastWizardPart && part.type.startsWith('tool-') && part.type !== 'tool-askQuestions') break outer
        }
      }
    }
  }

  // Stable content references to avoid unnecessary context updates.
  // updateTabContent skips updates when content === prev, so we cache
  // the object and only create a new one when values actually change.
  const bedarfsContentRef = useRef<{ answers: AnswerItem[]; summary: string }>({ answers: [], summary: '' })
  if (
    allAnswers.length !== bedarfsContentRef.current.answers.length ||
    analysisSummary !== bedarfsContentRef.current.summary
  ) {
    bedarfsContentRef.current = { answers: allAnswers, summary: analysisSummary }
  }

  // Update workspace tabs when tool outputs are available.
  // Shows streaming content in right panel while AI generates summary.
  // Version is synced from Payload CMS after save, not bumped in-memory.
  useEffect(() => {
    if (allAnswers.length > 0 && !activeWizard && !streamingWizard) {
      const tabStatus = (phase === 'questions' && isLoading) ? 'streaming' : 'done'
      if (tabStatus === 'done' && analysisSummary !== '' && !bedarfsDoneRef.current) {
        bedarfsDoneRef.current = true
      }
      updateTabContent(
        'bedarfsanalyse',
        bedarfsContentRef.current,
        tabStatus,
        { skipVersionBump: true },
      )
    }
  }, [allAnswers.length, activeWizard, streamingWizard, isLoading, analysisSummary, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Spec streaming: show partial in right panel
  useEffect(() => {
    if (streamingSpec) {
      updateTabContent('leistungsbeschreibung', streamingSpec.output, 'streaming')
    }
  }, [streamingSpec?.output]) // eslint-disable-line react-hooks/exhaustive-deps

  // Research: only update tab on completion (not during streaming).
  // Use ref to prevent double version bump when activeResearch disappears.
  useEffect(() => {
    if (activeResearch && !streamingResearch) {
      updateTabContent('marktanalyse', null, 'generating')
    }
    if (completedResearch.length > 0) {
      const latest = completedResearch[completedResearch.length - 1]
      if (!researchDoneRef.current) researchDoneRef.current = true
      updateTabContent('marktanalyse', latest.output, 'done', { skipVersionBump: true })
    }
  }, [completedResearch.length, activeResearch?.toolCallId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Spec: update tab on completion.
  // Use ref to prevent double version bump when activeSpec disappears.
  useEffect(() => {
    if (activeSpec && !streamingSpec) {
      updateTabContent('leistungsbeschreibung', null, 'generating')
    }
    if (completedSpecs.length > 0) {
      const latest = completedSpecs[completedSpecs.length - 1]
      if (!specDoneRef.current) specDoneRef.current = true
      updateTabContent('leistungsbeschreibung', latest.output, 'done', { skipVersionBump: true })
    }
  }, [completedSpecs.length, activeSpec?.toolCallId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save: enrich askQuestions document with final summary once all rounds are done.
  // The server already persists answers per round via onStepFinish; this client-side
  // save only adds the summary text that the agent generates after the last round.
  useEffect(() => {
    if (
      allAnswers.length > 0 &&
      analysisSummary &&
      analysisSummary !== lastPersistedSummary.current &&
      !activeWizard && !streamingWizard && !isLoading
    ) {
      lastPersistedSummary.current = analysisSummary
      saveToolResult({
        toolType: 'askQuestions',
        result: { answers: allAnswers, summary: analysisSummary },
        projectId: project.id,
      }).then((r) => {
        if (r.success) {
          if (r.versionCount) setTabVersion('bedarfsanalyse', r.versionCount)
          if (onDocumentSaved) onDocumentSaved(r.document ?? { id: r.documentId })
        }
      })
    }
  }, [analysisSummary, isLoading, activeWizard, streamingWizard]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh documents & sync version counts from DB when stream finishes.
  // Server-side onStepFinish is the authoritative save for marketResearch,
  // generateSpec, and askQuestions — the client only syncs UI state here.
  const prevStatusRef = useRef(status)
  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = status

    if ((prev === 'streaming' || prev === 'submitted') && status === 'ready') {
      getProjectDocuments(project.id).then((docs) => {
        if (onDocumentSaved && docs.length > 0) {
          onDocumentSaved(docs[0])
        }
        // Sync version counts for workflow tabs (one doc per type, most recent first)
        const tabMap: Record<string, string> = {
          askQuestions: 'bedarfsanalyse',
          marketResearch: 'marktanalyse',
          generateSpec: 'leistungsbeschreibung',
        }
        const seen = new Set<string>()
        for (const doc of docs) {
          const tabId = tabMap[doc.sourceToolType as string]
          if (tabId && !seen.has(tabId) && doc.workflowStatus !== 'archived') {
            seen.add(tabId)
            getDocumentVersionCount(doc.id).then(count => setTabVersion(tabId, count))
          }
        }
      })
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track phase: transition running → ready when a step completes.
  // Uses robust signals (not isLoading) to avoid flicker during auto-send gaps.
  useEffect(() => {
    if (phase === 'questions' && completedWizards.length > 0 && !activeWizard && !streamingWizard && analysisSummary !== '') {
      setPhase('ready')
    } else if (phase === 'research' && completedResearch.length > 0 && !activeResearch && !streamingResearch) {
      setPhase('ready')
    } else if (phase === 'spec' && completedSpecs.length > 0 && !activeSpec && !streamingSpec) {
      setPhase('ready')
    }
  }, [phase, completedWizards.length, completedResearch.length, completedSpecs.length,
    activeWizard, streamingWizard, activeResearch, streamingResearch, activeSpec, streamingSpec, analysisSummary])

  // --- Derived completion state ---
  const hasAnswers = (allAnswers.length > 0 && !activeWizard && !streamingWizard) || savedAnswersRef.current.length > 0
  const hasResearch = completedResearch.length > 0 || savedResearchRef.current !== null
  const hasSpec = completedSpecs.length > 0 || savedSpecRef.current !== null
  const anyStepRunning = phase === 'questions' || phase === 'research' || phase === 'spec'

  // --- Independent step handlers ---
  const handleBedarfsanalyse = () => {
    setActiveTab('bedarfsanalyse')
    bedarfsDoneRef.current = false
    lastPersistedSummary.current = ''
    setPhase('questions')
    sendMessage({
      text: `Erstelle Fragen für folgendes Beschaffungsvorhaben: ${context}`,
    })
  }

  const handleMarktanalyse = () => {
    setActiveTab('marktanalyse')
    const answers = allAnswers.length > 0 ? allAnswers : savedAnswersRef.current
    const answersText = answers
      .map((a) => {
        const parts = []
        if (a.selectedOptions?.length) parts.push(a.selectedOptions.join(', '))
        if (a.freeText) parts.push(a.freeText)
        return `${a.question}: ${parts.join(' — ')}`
      })
      .join('\n')

    researchDoneRef.current = false
    setPhase('research')
    sendMessage({
      text: `Basierend auf diesen Antworten:\n${answersText}\n\nFühre eine Marktrecherche durch.`,
    })
  }

  const handleLeistungsbeschreibung = () => {
    setActiveTab('leistungsbeschreibung')

    // Build context from ALL available data (chat + saved)
    const answers = allAnswers.length > 0 ? allAnswers : savedAnswersRef.current
    const research = completedResearch.length > 0
      ? completedResearch[completedResearch.length - 1].output as MarketResearchResult | undefined
      : savedResearchRef.current

    const answersText = answers
      .map((a) => `${a.question}: ${[...(a.selectedOptions || []), a.freeText].filter(Boolean).join(' — ')}`)
      .join('\n')

    let contextText = `Anforderungen aus der Bedarfsanalyse:\n${answersText}`
    if (research?.providers?.length) {
      const summary = research.providers
        .slice(0, 5)
        .map((p) => `- ${p.name}: ${p.description?.substring(0, 100)}`)
        .join('\n')
      contextText += `\n\nMarktrecherche-Ergebnisse:\n${summary}`
    }

    specDoneRef.current = false
    setPhase('spec')
    sendMessage({
      text: `Erstelle jetzt basierend auf den Anforderungen${research?.providers?.length ? ' und der Marktrecherche' : ''} eine detaillierte Leistungsbeschreibung.\n\n${contextText}`,
    })
  }

  // --- Right button: export all as ZIP ---
  const hasAnyResults =
    hasAnswers || hasResearch || hasSpec

  const handleExportAll = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/projects/${project.id}/api/export-zip`)
      if (!res.ok) {
        const err = await res.text()
        console.error('ZIP-Export fehlgeschlagen:', err)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden min-w-0">
      {/* Context Section — fixed */}
      <div className="shrink-0 border-b p-4 space-y-3 bg-background">
        <h2 className="text-lg font-semibold">{project.name}</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Beschaffungskontext
          </label>
          <Input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Beschreiben Sie Ihr Beschaffungsvorhaben..."
            disabled={anyStepRunning}
          />
        </div>
      </div>

      {/* Workflow Content — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Loading states */}
        {streamingWizard && (
          <div className="rounded-lg border bg-card p-6 text-center animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Fragebogen wird erstellt...</p>
          </div>
        )}

        {isLoading && !activeWizard && !streamingWizard
          && !streamingResearch && !streamingSpec
          && !activeResearch && !activeSpec
          && phase !== 'initial' && phase !== 'ready'
          && !(completedWizards.length > 0 && phase === 'questions') && (
          <div className="rounded-lg border bg-card p-6 text-center animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Wird verarbeitet...</p>
          </div>
        )}

        {/* Collected Answers Summary */}
        {allAnswers.length > 0 && !activeWizard && (
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Ihre Angaben
              </span>
              <span className="text-xs text-muted-foreground">
                {allAnswers.length} Fragen beantwortet
              </span>
            </div>
            {analysisSummary && (
              <p className="text-sm text-foreground leading-relaxed">{analysisSummary}</p>
            )}
            {allAnswers.map((item, i) => (
              <div key={i} className="text-sm">
                <span className="text-muted-foreground">{item.question}</span>
                <br />
                <span className="font-medium">
                  {item.selectedOptions?.join(', ')}
                  {item.freeText ? ` — ${item.freeText}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Active Question Wizard */}
        {activeWizard && (
          <QuestionWizard
            key={activeWizard.toolCallId}
            title={activeWizard.input.title}
            questions={activeWizard.input.questions}
            onSubmit={(result) => {
              addToolOutput({
                tool: 'askQuestions',
                toolCallId: activeWizard.toolCallId,
                output: result,
              })
            }}
          />
        )}

        {/* Research streaming — show provider progress */}
        {streamingResearch && (
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">
                {(streamingResearch.output as { status?: string }).status === 'searching'
                  ? 'Suche läuft...'
                  : `${((streamingResearch.output as { providers?: unknown[] }).providers ?? []).length} Anbieter gefunden — Kontaktdaten werden angereichert...`}
              </span>
            </div>
            {((streamingResearch.output as { providers?: Array<{ name: string; email?: string | null }> }).providers ?? []).map((p, i) => (
              <div key={i} className="text-sm flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                <span className="font-medium">{p.name}</span>
                {p.email
                  ? <span className="text-xs text-green-600">Kontaktdaten gefunden</span>
                  : <span className="text-xs text-muted-foreground animate-pulse">wird angereichert...</span>
                }
              </div>
            ))}
          </div>
        )}

        {/* Research in progress (before first yield) */}
        {activeResearch && !streamingResearch && (
          <div className="rounded-lg border bg-card p-6 text-center animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Marktrecherche läuft...</p>
            {activeResearch.state === 'input-available' && (
              <p className="text-xs text-muted-foreground mt-1">
                Suche: &ldquo;{activeResearch.input.query}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* Spec generation in progress (before first yield) */}
        {activeSpec && !streamingSpec && (
          <div className="rounded-lg border bg-card p-6 text-center animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">
              Leistungsbeschreibung wird erstellt...
            </p>
          </div>
        )}

        {/* Spec streaming indicator (left side) */}
        {streamingSpec && (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">
                Leistungsbeschreibung wird generiert...
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Das Dokument wird im rechten Panel aufgebaut.
            </p>
          </div>
        )}

        {/* Error display */}
        {[...questionParts, ...researchParts, ...specParts].some(
          (p) => p.state === 'output-error',
        ) && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons — fixed at bottom */}
      <div className="shrink-0 border-t p-3 sm:p-4 bg-background">
        <div className="flex gap-1.5 sm:gap-2">
          {/* Bedarfsanalyse */}
          <Button
            onClick={handleBedarfsanalyse}
            disabled={anyStepRunning || !context.trim()}
            variant={(phase === 'initial' || phase === 'questions') ? 'default' : 'outline'}
            size="lg"
            className="flex-1 min-w-0 h-12 sm:h-14 gap-1.5 px-2 sm:px-3 overflow-hidden"
          >
            {phase === 'questions' ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 animate-spin" />
            ) : hasAnswers ? (
              <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
            ) : null}
            <span className="text-xs sm:text-sm font-medium truncate leading-tight">
              Bedarfsanalyse
            </span>
          </Button>

          {/* Marktanalyse */}
          <Button
            onClick={handleMarktanalyse}
            disabled={anyStepRunning || !hasAnswers}
            variant={phase === 'research' ? 'default' : 'outline'}
            size="lg"
            className="flex-1 min-w-0 h-12 sm:h-14 gap-1.5 px-2 sm:px-3 overflow-hidden"
          >
            {phase === 'research' ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 animate-spin" />
            ) : hasResearch ? (
              <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
            ) : null}
            <span className="text-xs sm:text-sm font-medium truncate leading-tight">
              Marktanalyse
            </span>
          </Button>

          {/* Leistungsbeschreibung */}
          <Button
            onClick={handleLeistungsbeschreibung}
            disabled={anyStepRunning || !hasAnswers}
            variant={phase === 'spec' ? 'default' : 'outline'}
            size="lg"
            className="flex-1 min-w-0 h-12 sm:h-14 gap-1.5 px-2 sm:px-3 overflow-hidden"
          >
            {phase === 'spec' ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 animate-spin" />
            ) : hasSpec ? (
              <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
            ) : null}
            <span className="text-xs sm:text-sm font-medium truncate leading-tight">
              Leistungsbeschr.
            </span>
          </Button>

          {/* Export icon */}
          <Button
            variant="outline"
            size="lg"
            className="shrink-0 h-12 sm:h-14 px-3"
            disabled={!hasAnyResults || exporting}
            onClick={handleExportAll}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>

          {/* Settings icon (gear, like Angebotsvergleich) */}
          <Button
            variant="outline"
            size="lg"
            className="shrink-0 h-12 sm:h-14 px-3"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>

      <WorkflowSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSave={setSettings}
      />
    </div>
  )
}
