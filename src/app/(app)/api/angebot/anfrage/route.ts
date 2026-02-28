import { streamText } from 'ai'
import { ai } from '@/lib/ai'
import { getPayloadClient } from '@/lib/payload'
import { withAuth, readBodySafe } from '@/lib/auth'
import { anfrageRequestSchema } from '@/types/angebot'
import { getAnfrageSystemPrompt } from '@/prompts/angebot-anfrage'

const SOURCE_LABELS: Record<string, string> = {
  leistungsbeschreibung: 'Leistungsbeschreibung',
  marketResearch: 'Marktrecherche',
  askQuestions: 'Bedarfsanalyse',
}

export const maxDuration = 120

export const POST = withAuth(async (req, { user }) => {
  const body = await readBodySafe(req, 200_000)
  if ('error' in body) return body.error

  const parsed = anfrageRequestSchema.safeParse(body.json)
  if (!parsed.success) {
    return Response.json(
      { error: 'Ungültige Anfrage', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { projectId, context, contextSource, settings } = parsed.data
  const { laenge, gliederung, angebotsfrist, liefertermin, ansprechpartner, customInstructions } =
    settings ?? {}
  const payload = await getPayloadClient()

  // Ownership check
  try {
    await payload.findByID({ collection: 'projects', id: projectId, user })
  } catch {
    return Response.json(
      { error: 'Projekt nicht gefunden oder kein Zugriff' },
      { status: 403 },
    )
  }

  const sourceLabel = SOURCE_LABELS[contextSource] ?? 'Kontext'

  const result = streamText({
    model: ai.languageModel('fast'),
    system: getAnfrageSystemPrompt({
      contextSource,
      laenge,
      gliederung,
      angebotsfrist,
      liefertermin,
      ansprechpartner,
      customInstructions,
    }),
    prompt: `Erstelle eine herstellerneutrale Angebotsanfrage basierend auf folgender ${sourceLabel}:\n\n${context}`,
    maxOutputTokens: 8000,
    temperature: 0.4,
    onFinish: async ({ text }) => {
      try {
        const existing = await payload.find({
          collection: 'documents',
          where: {
            project: { equals: projectId },
            sourceToolType: { equals: 'angebotsAnfrage' },
          },
          limit: 1,
          user,
        })

        if (existing.docs.length > 0) {
          await payload.update({
            collection: 'documents',
            id: existing.docs[0].id,
            data: {
              content: text,
              title: 'Angebotsanfrage',
              workflowStatus: 'draft',
            },
            user,
          })
        } else {
          await payload.create({
            collection: 'documents',
            data: {
              title: 'Angebotsanfrage',
              content: text,
              category: 'angebots-anfrage',
              sourceToolType: 'angebotsAnfrage',
              project: projectId,
              workflowStatus: 'draft',
              _status: 'published',
            },
            user,
          })
        }
      } catch (err) {
        console.error('Failed to save Angebotsanfrage:', err)
      }
    },
  })

  result.consumeStream()

  return result.toTextStreamResponse()
})
