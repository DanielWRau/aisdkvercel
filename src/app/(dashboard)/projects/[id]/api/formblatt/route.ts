import { streamObject } from 'ai'
import { z } from 'zod'
import { ai } from '@/lib/ai'
import { getPayloadClient } from '@/lib/payload'
import { withAuth, readBodySafe } from '@/lib/auth'
import { persistToolResult } from '@/lib/persist-tool-result'
import { formSchemas } from '@/data/form-schemas'
import { buildZodSchema, buildFormblattPrompt, validateStructure, type FormStructure } from '@/lib/form-structure'

export const maxDuration = 120

const formblattBodySchema = z.object({
  templateId: z.union([z.string(), z.number()]),
})

/**
 * Build project context from existing documents (bedarf, markt, spec).
 * Truncates each source and the total to stay within LLM context limits.
 */
async function buildProjectContext(
  projectId: string | number,
  user: { id: string | number; [key: string]: unknown },
  limits: { maxPerSource: number; maxTotal: number },
): Promise<string> {
  const payload = await getPayloadClient()

  const [project, docs] = await Promise.all([
    payload.findByID({ collection: 'projects', id: projectId, user }),
    payload.find({
      collection: 'documents',
      where: {
        project: { equals: projectId },
        workflowStatus: { not_equals: 'archived' },
      },
      sort: '-updatedAt',
      limit: 20,
      user,
    }),
  ])

  const truncate = (s: string, max: number) => (s.length > max ? s.slice(0, max) + '\n...[gekürzt]' : s)

  const sourceMap: Record<string, string> = {}
  const sourceOrder = ['askQuestions', 'marketResearch', 'generateSpec']

  for (const doc of docs.docs) {
    const toolType = doc.sourceToolType as string | null
    if (!toolType || !sourceOrder.includes(toolType)) continue
    if (sourceMap[toolType]) continue // keep first (newest) per type

    const content = (doc.markdown as string) || ''
    if (content) {
      sourceMap[toolType] = truncate(content, limits.maxPerSource)
    }
  }

  const parts: string[] = []

  // Project data
  const projectData = project.data as Record<string, unknown> | null
  if (projectData) {
    parts.push(`=== PROJEKTDATEN ===\n${JSON.stringify(projectData, null, 2)}`)
  }

  for (const toolType of sourceOrder) {
    if (sourceMap[toolType]) {
      const label = toolType === 'askQuestions' ? 'BEDARFSANALYSE'
        : toolType === 'marketResearch' ? 'MARKTRECHERCHE'
        : 'LEISTUNGSBESCHREIBUNG'
      parts.push(`=== ${label} ===\n${sourceMap[toolType]}`)
    }
  }

  return truncate(parts.join('\n\n---\n\n'), limits.maxTotal)
}

export const POST = withAuth(async (req, routeContext) => {
  const user = routeContext.user
  const params = (routeContext as { params?: Promise<{ id: string }> }).params
  if (!params) return Response.json({ error: 'Missing route params' }, { status: 400 })
  const { id: projectId } = await params

  // Body validation
  const body = await readBodySafe(req, 10_000)
  if ('error' in body) return body.error

  const parsed = formblattBodySchema.safeParse(body.json)
  if (!parsed.success) {
    return Response.json({ error: 'Ungültige Anfrage', details: parsed.error.flatten() }, { status: 400 })
  }

  const { templateId } = parsed.data
  const payload = await getPayloadClient()

  // Project ownership check
  try {
    await payload.findByID({ collection: 'projects', id: projectId, overrideAccess: false, user })
  } catch {
    return Response.json({ error: 'Projekt nicht gefunden oder kein Zugriff' }, { status: 403 })
  }

  // Load template
  let template
  try {
    template = await payload.findByID({ collection: 'form-templates', id: templateId })
  } catch {
    return Response.json({ error: 'Template nicht gefunden' }, { status: 404 })
  }

  const formularNummer = template.formularNummer as string
  const templateStructure = template.structure as FormStructure | null | undefined
  const promptHinweise = (template.promptHinweise as string) ?? ''

  // Fallback matrix:
  // 1. structure present + validateStructure ok → v2 pipeline
  // 2. structure present + validateStructure fail → 400 fail-closed
  // 3. structure empty/null → legacy formSchemas fallback
  let schema: z.ZodType
  let systemPrompt: string
  let userPrompt: string
  let structure: FormStructure | null = null
  let schemaVersion: number

  if (templateStructure) {
    // v2 path
    const structureResult = validateStructure(templateStructure)
    if (!structureResult.success) {
      return Response.json(
        { error: 'Ungültige Formularstruktur', details: structureResult.error },
        { status: 400 },
      )
    }
    structure = structureResult.data
    schema = buildZodSchema(structure)
    schemaVersion = structure.schemaVersion
    const prompts = buildFormblattPrompt(structure, {
      formularNummer,
      name: template.name as string,
      promptHinweise,
    })
    systemPrompt = prompts.system
    userPrompt = prompts.prompt
  } else {
    // Legacy fallback
    const schemaEntry = formSchemas[formularNummer]
    if (!schemaEntry) {
      return Response.json({ error: `Kein Schema für ${formularNummer}` }, { status: 400 })
    }
    schema = schemaEntry.schema
    schemaVersion = schemaEntry.schemaVersion
    systemPrompt = [
      'Du bist ein Experte für öffentliches Vergaberecht in Deutschland.',
      'Fülle das Vergabeformular basierend auf den Projektdaten aus.',
      'Antworte präzise und fachlich korrekt auf Deutsch.',
      'Verwende die vorhandenen Projektinformationen, um alle Felder sinnvoll zu befüllen.',
      promptHinweise ? `\nZusätzliche Hinweise:\n${promptHinweise}` : '',
    ].filter(Boolean).join('\n')
    userPrompt = [
      `Fülle das Formular "${formularNummer}: ${template.name}" aus.`,
      '',
      template.description ? `Beschreibung: ${template.description}` : '',
    ].filter(Boolean).join('\n')
  }

  // Build project context
  const context = await buildProjectContext(projectId, user, {
    maxPerSource: 8_000,
    maxTotal: 20_000,
  })

  // Stream structured object
  const result = streamObject({
    model: ai.languageModel('fast'),
    schema,
    system: systemPrompt,
    prompt: [
      userPrompt,
      '',
      '=== PROJEKTKONTEXT ===',
      context,
    ].join('\n'),
    maxOutputTokens: 4000,
    temperature: 0.3,
    abortSignal: req.signal,
  })

  // SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const partialObject of result.partialObjectStream) {
          const data = JSON.stringify({ partial: partialObject })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }

        // Final object
        const finalObject = await result.object as Record<string, unknown>

        // Persist to database
        const resultWithMeta = {
          ...finalObject,
          _meta: {
            formularNummer,
            name: template.name as string,
            description: (template.description as string) ?? '',
            schemaVersion,
            ...(structure ? { structureSnapshot: structure } : {}),
          },
        }

        const persistResult = await persistToolResult({
          toolType: 'fillFormblatt',
          result: resultWithMeta,
          projectId,
          user,
          dedupeKey: formularNummer,
        })

        if (persistResult.success) {
          const doneData = JSON.stringify({
            done: true,
            documentId: persistResult.documentId,
            result: resultWithMeta,
          })
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
        } else {
          const errorData = JSON.stringify({
            error: `Speichern fehlgeschlagen: ${persistResult.error ?? 'Unbekannter Fehler'}`,
            result: resultWithMeta, // Return anyway so UI can display
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
        }
      } catch (err) {
        const errorData = JSON.stringify({
          error: err instanceof Error ? err.message : 'Unbekannter Fehler',
        })
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})
