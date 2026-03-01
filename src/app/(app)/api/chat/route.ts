import { createAgentUIStreamResponse, consumeStream } from 'ai'
import { after } from 'next/server'
import { z } from 'zod'
import { createAgent } from '@/agent'
import { runWithSession } from '@/lib/session-context'
import { getPayloadClient } from '@/lib/payload'
import { withAuth, readBodySafe } from '@/lib/auth'
import type { WorkflowSettingsData } from '@/types/user-settings'
import { persistToolResult } from '@/lib/persist-tool-result'
import { getVorlageById } from '@/data/gliederung-vorlagen'

const CHAT_MODES = {
  workflow: {
    tools: ['askQuestions', 'marketResearch', 'generateSpec', 'knowledgeSearch', 'saveDocument'] as const,
    persistTools: ['askQuestions', 'marketResearch', 'generateSpec'],
  },
  knowledge: {
    tools: ['knowledgeSearch'] as const,
    persistTools: [] as string[],
  },
} as const

type ChatMode = keyof typeof CHAT_MODES

// Validate known part types, passthrough others (step-start, source, reasoning, etc.)
const partSchema = z.object({ type: z.string() }).passthrough().superRefine((part, ctx) => {
  if (part.type === 'text') {
    const text = part.text
    if (typeof text !== 'string' || text.length > 10_000) {
      ctx.addIssue({ code: 'custom', message: 'text part: text must be a string of max 10000 chars' })
    }
  }
})

const messageSchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant']),
        content: z.string().max(10_000).optional(),
        parts: z.array(partSchema).optional(),
      }),
    )
    .max(50),
})

export const POST = withAuth(async (req, { user }) => {
  const body = await readBodySafe(req)
  if ('error' in body) return body.error

  const parsed = messageSchema.safeParse(body.json)
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  // Validate chat mode — fail-closed on unknown
  const modeHeader = req.headers.get('x-chat-mode') ?? 'workflow'
  if (!(modeHeader in CHAT_MODES)) {
    return Response.json({ error: `Ungültiger Chat-Modus: ${modeHeader}` }, { status: 400 })
  }
  const mode = CHAT_MODES[modeHeader as ChatMode]

  const sessionId = req.headers.get('x-session-id') ?? 'default'
  const projectId = req.headers.get('x-project-id')

  // Validate projectId: must exist and belong to the user
  if (!projectId) {
    return Response.json({ error: 'x-project-id Header fehlt' }, { status: 400 })
  }

  const payload = await getPayloadClient()
  try {
    await payload.findByID({
      collection: 'projects',
      id: projectId,
      overrideAccess: false,
      user,
    })
  } catch {
    return Response.json(
      { error: 'Projekt nicht gefunden oder kein Zugriff' },
      { status: 403 },
    )
  }

  // Load user workflow settings for dynamic agent configuration
  const settingsResult = await payload.find({
    collection: 'user-settings',
    where: { user: { equals: user.id } },
    select: { workflowSettings: true },
    limit: 1,
  })
  const ws = settingsResult.docs[0]?.workflowSettings as WorkflowSettingsData | undefined

  // Resolve gliederung: eigene or vorlage
  let resolvedGliederung: string[] | undefined
  if (ws?.eigeneGliederungAktiv && ws.eigeneGliederung) {
    const parsed = ws.eigeneGliederung.split('\n').map(s => s.trim()).filter(Boolean)
    if (parsed.length > 0) resolvedGliederung = parsed
  } else if (ws?.gliederungVorlage && ws.gliederungVorlage !== 'standard') {
    resolvedGliederung = getVorlageById(ws.gliederungVorlage)?.gliederung
  }

  const dynamicAgent = createAgent({
    mode: modeHeader as ChatMode,
    tools: [...mode.tools],
    maxFrageRunden: ws?.maxFrageRunden ?? 2,
    fragenstil: ws?.fragenstil ?? 'standard',
    marketResearchSettings: {
      region: ws?.region,
      groessenPraeferenz: ws?.groessenPraeferenz ?? 'alle',
    },
    specSettings: {
      detailtiefe: ws?.detailtiefe ?? 'standard',
      stil: ws?.stil ?? 'formal',
      mitZeitplanung: ws?.mitZeitplanung ?? true,
      gliederung: resolvedGliederung,
    },
  })

  // Promise that resolves when the agent stream is fully consumed server-side.
  // Used with after() to keep the function alive even if the client disconnects.
  let resolveAgentDone: () => void
  const agentDone = new Promise<void>((r) => { resolveAgentDone = r })

  // Accumulate askQuestions answers across rounds for robust server-side persistence.
  // Each round yields only its own answers; we merge them so the saved document
  // always contains the full set even if the client disconnects mid-workflow.
  const accumulatedAnswers: unknown[] = []

  const response = await runWithSession(
    { sessionId, user: user as unknown as Record<string, unknown> & { id: string | number; role: string; email: string }, projectId },
    () =>
      createAgentUIStreamResponse({
        agent: dynamicAgent,
        uiMessages: parsed.data.messages,
        consumeSseStream: async ({ stream }) => {
          await consumeStream({ stream })
          resolveAgentDone()
        },
        onStepFinish: async (stepResult) => {
          // Server-side persistence — authoritative save for all tool results.
          // Runs inside after() so it completes even if the client disconnects.
          const persistable = stepResult.toolResults.filter(
            (tr) => (mode.persistTools as readonly string[]).includes(tr.toolName),
          )
          for (const toolResult of persistable) {
            if ('preliminary' in toolResult && toolResult.preliminary) continue
            if (!toolResult.output) continue

            let resultToSave = toolResult.output

            // askQuestions: accumulate answers across rounds and wrap for transformer
            if (toolResult.toolName === 'askQuestions') {
              try {
                const roundAnswers = typeof toolResult.output === 'string'
                  ? JSON.parse(toolResult.output)
                  : toolResult.output
                if (Array.isArray(roundAnswers)) {
                  accumulatedAnswers.push(...roundAnswers)
                }
                resultToSave = { answers: [...accumulatedAnswers], summary: '' }
              } catch {
                // If parsing fails, save raw output as-is
              }
            }

            try {
              const result = await persistToolResult({
                toolType: toolResult.toolName,
                result: resultToSave,
                projectId,
                user,
              })
              if (result.success) {
                console.log('[chat] persisted', toolResult.toolName, projectId, result.documentId)
              } else {
                console.error('[chat] persist failed:', toolResult.toolName, projectId, result.error)
              }
            } catch (err) {
              console.error('[chat] onStepFinish error:', toolResult.toolName, err instanceof Error ? err.message : err)
            }
          }
        },
      }),
  )

  // Keep the serverless function alive until the agent finishes,
  // even if the client disconnects or the browser is closed.
  after(agentDone)

  return response
})
