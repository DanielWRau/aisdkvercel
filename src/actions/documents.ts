'use server'

import { getPayloadClient } from '@/lib/payload'
import { getTransformer } from '@/lib/tool-transformers'

type SaveResult = {
  success: boolean
  documentId?: string | number
  error?: string
}

export async function saveToolResult(input: {
  toolType: string
  result: unknown
  projectId: string | number
}): Promise<SaveResult> {
  const { toolType, result, projectId } = input

  const transformer = getTransformer(toolType)
  if (!transformer) {
    return { success: false, error: `Unbekannter Tool-Typ: ${toolType}` }
  }

  try {
    const docInput = transformer.toDocument(result)
    const markdown = transformer.toMarkdown(result)

    // Create a safe filename from the title
    const safeName = docInput.title
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 80)
    const fileName = `${safeName}.md`

    const buffer = Buffer.from(markdown, 'utf-8')
    const file = {
      data: buffer,
      mimetype: 'text/markdown',
      name: fileName,
      size: buffer.length,
    }

    const payload = await getPayloadClient()
    const doc = await payload.create({
      collection: 'documents',
      data: {
        title: docInput.title,
        description: docInput.description,
        category: docInput.category,
        sourceToolType: docInput.sourceToolType,
        tags: docInput.tags,
        jsonData: docInput.jsonData,
        project: projectId,
        status: 'draft',
        _status: 'published',
      },
      file,
      overrideAccess: true,
    })

    return { success: true, documentId: doc.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unbekannter Fehler',
    }
  }
}

export async function saveAllToolResults(input: {
  projectId: string | number
  items: { toolType: string; result: unknown }[]
}): Promise<SaveResult[]> {
  const results: SaveResult[] = []
  for (const item of input.items) {
    const result = await saveToolResult({
      toolType: item.toolType,
      result: item.result,
      projectId: input.projectId,
    })
    results.push(result)
  }
  return results
}
