import { getPayloadClient } from '@/lib/payload'
import { getTransformer } from '@/lib/tool-transformers'

type PersistResult = {
  success: boolean
  documentId?: string | number
  versionCount?: number
  error?: string
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === retries) throw err
      await new Promise((r) => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw new Error('unreachable')
}

/**
 * Persist a tool result to the database.
 * Converts tool output to Markdown for storage in the `markdown` field.
 */
export async function persistToolResult(input: {
  toolType: string
  result: unknown
  projectId: string | number
  user: { id: string | number; [key: string]: unknown }
  dedupeKey?: string
}): Promise<PersistResult> {
  const { toolType, result, projectId, user, dedupeKey } = input

  const transformer = getTransformer(toolType)
  if (!transformer) {
    return { success: false, error: `Unbekannter Tool-Typ: ${toolType}` }
  }

  try {
    const docInput = transformer.toDocument(result)

    let markdown: string
    try {
      markdown = transformer.toMarkdown(result)
    } catch (err) {
      console.error('[persist-tool-result] toMarkdown failed:', err)
      markdown = `# ${toolType}\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``
    }

    const payload = await getPayloadClient()

    // Ownership validation
    try {
      await payload.findByID({ collection: 'projects', id: projectId, user })
    } catch {
      return { success: false, error: 'Projekt nicht gefunden oder kein Zugriff' }
    }

    // Find existing non-archived document for this tool type
    const existing = await payload.find({
      collection: 'documents',
      where: {
        project: { equals: projectId },
        sourceToolType: { equals: toolType },
        workflowStatus: { not_equals: 'archived' },
        ...(dedupeKey ? { 'tags.tag': { equals: dedupeKey } } : {}),
      },
      sort: '-updatedAt',
      limit: 1,
      user,
    })

    let docId: string | number

    if (existing.docs.length > 0) {
      const existingDoc = existing.docs[0]
      docId = existingDoc.id

      // Update existing document (with retry)
      await withRetry(() =>
        payload.update({
          collection: 'documents',
          id: docId,
          data: {
            title: docInput.title,
            description: docInput.description,
            category: docInput.category,
            tags: docInput.tags,
            jsonData: docInput.jsonData,
            markdown,
            workflowStatus: 'draft',
            _status: 'published',
          },
          user,
        }),
      )
    } else {
      // Create new document (with retry)
      const doc = await withRetry(() =>
        payload.create({
          collection: 'documents',
          data: {
            title: docInput.title,
            description: docInput.description,
            category: docInput.category,
            sourceToolType: docInput.sourceToolType,
            tags: docInput.tags,
            jsonData: docInput.jsonData,
            markdown,
            project: projectId,
            workflowStatus: 'draft',
            _status: 'published',
          },
          user,
        }),
      )
      docId = doc.id
    }

    // Count Payload CMS versions for this document
    const versions = await payload.findVersions({
      collection: 'documents',
      where: { parent: { equals: docId } },
      limit: 1,
    })

    return { success: true, documentId: docId, versionCount: versions.totalDocs }
  } catch (err) {
    console.error('[persist-tool-result]', toolType, projectId, err instanceof Error ? err.message : err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unbekannter Fehler',
    }
  }
}
