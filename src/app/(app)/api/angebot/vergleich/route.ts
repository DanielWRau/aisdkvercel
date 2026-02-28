import { streamText } from 'ai'
import { ai } from '@/lib/ai'
import { getPayloadClient } from '@/lib/payload'
import { withAuth, readBodySafe } from '@/lib/auth'
import { vergleichRequestSchema } from '@/types/angebot'
import { getVergleichSystemPrompt } from '@/prompts/angebot-vergleich'

export const maxDuration = 120

export const POST = withAuth(async (req, { user }) => {
  const body = await readBodySafe(req, 2_000_000)
  if ('error' in body) return body.error

  const parsed = vergleichRequestSchema.safeParse(body.json)
  if (!parsed.success) {
    return Response.json(
      { error: 'Ungültige Anfrage', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { projectId, leistungsbeschreibung, suppliers } = parsed.data
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

  // Build prompt with XML-wrapped offers
  const supplierXml = suppliers
    .map(
      (s) =>
        `<angebot lieferant="${s.name}">\n${s.angebotText}\n</angebot>`,
    )
    .join('\n\n')

  const lbContext = leistungsbeschreibung
    ? `\n\nLeistungsbeschreibung als Referenz:\n${leistungsbeschreibung}`
    : ''

  const result = streamText({
    model: ai.languageModel('fast'),
    system: getVergleichSystemPrompt(),
    prompt: `Erstelle einen Angebotsvergleich für die folgenden ${suppliers.length} Angebote:${lbContext}\n\n${supplierXml}`,
    maxOutputTokens: 16000,
    temperature: 0.3,
    onFinish: async ({ text }) => {
      try {
        const existing = await payload.find({
          collection: 'documents',
          where: {
            project: { equals: projectId },
            sourceToolType: { equals: 'angebotsVergleich' },
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
              title: `Angebotsvergleich (${suppliers.length} Anbieter)`,
              workflowStatus: 'draft',
            },
            user,
          })
        } else {
          await payload.create({
            collection: 'documents',
            data: {
              title: `Angebotsvergleich (${suppliers.length} Anbieter)`,
              content: text,
              category: 'angebots-vergleich',
              sourceToolType: 'angebotsVergleich',
              project: projectId,
              workflowStatus: 'draft',
              _status: 'published',
            },
            user,
          })
        }
      } catch (err) {
        console.error('Failed to save Angebotsvergleich:', err)
      }
    },
  })

  // Ensure stream runs to completion even if client disconnects
  result.consumeStream()

  return result.toTextStreamResponse()
})
