'use server'

import { getPayloadClient } from '@/lib/payload'
import { requireAuth } from '@/lib/auth'
import { persistToolResult } from '@/lib/persist-tool-result'

type SaveResult = {
  success: boolean
  documentId?: string | number
  document?: Record<string, unknown>
  versionCount?: number
  error?: string
}

export type DocumentVersion = {
  id: string | number
  createdAt: string
  title: string | null
  markdown: string | null
}

export async function saveToolResult(input: {
  toolType: string
  result: unknown
  projectId: string | number
}): Promise<SaveResult> {
  const user = await requireAuth()
  const persistResult = await persistToolResult({ ...input, user })

  if (!persistResult.success || !persistResult.documentId) {
    return persistResult
  }

  // Return the full populated document for immediate UI update
  const payload = await getPayloadClient()
  const populated = await payload.findByID({
    collection: 'documents',
    id: persistResult.documentId,
    depth: 1,
    user,
  })

  return {
    success: true,
    documentId: populated.id,
    document: populated as unknown as Record<string, unknown>,
    versionCount: persistResult.versionCount,
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

export async function getProjectDocumentsWithMedia(projectId: string | number) {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'documents',
    where: { project: { equals: projectId } },
    sort: '-createdAt',
    depth: 1,
    limit: 100,
    user,
  })
  return result.docs
}

export async function getProjectDocuments(projectId: string | number) {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'documents',
    where: { project: { equals: projectId } },
    sort: '-updatedAt',
    limit: 100,
    user,
  })
  return result.docs
}

export async function getDocument(id: string | number) {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  return payload.findByID({
    collection: 'documents',
    id,
    user,
  })
}

export async function getDocumentVersionCount(documentId: string | number): Promise<number> {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  await payload.findByID({ collection: 'documents', id: documentId, user })
  const result = await payload.findVersions({
    collection: 'documents',
    where: { parent: { equals: documentId } },
    limit: 1,
  })
  return result.totalDocs
}

export async function getDocumentAsMarkdown(
  id: string | number,
): Promise<string> {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  const doc = await payload.findByID({ collection: 'documents', id, user })
  return (doc.markdown as string) || ''
}


export async function saveDocumentFromMarkdown(
  id: string | number,
  markdown: string,
): Promise<SaveResult> {
  if (markdown.length > 100_000) {
    return { success: false, error: 'Content zu groß (max 100.000 Zeichen)' }
  }
  const user = await requireAuth()
  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: 'documents',
      id,
      data: {
        markdown,
        _status: 'published',
      },
      user,
    })
    return { success: true, documentId: id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Fehler beim Speichern',
    }
  }
}

export async function updateDocumentContent(
  id: string | number,
  markdown: string,
) {
  if (markdown.length > 100_000) {
    throw new Error('Content zu groß (max 100.000 Zeichen)')
  }
  const user = await requireAuth()
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'documents',
    id,
    data: { markdown },
    user,
  })
}


export async function getMarkdownExports(input: {
  items: { toolType: string; result: unknown }[]
}): Promise<{ fileName: string; content: string }[]> {
  const { getTransformer } = await import('@/lib/tool-transformers')
  const exports: { fileName: string; content: string }[] = []

  for (const item of input.items) {
    const transformer = getTransformer(item.toolType)
    if (!transformer) continue
    const docInput = transformer.toDocument(item.result)
    const markdown = transformer.toMarkdown(item.result)
    const safeName = docInput.title
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 80)
    exports.push({ fileName: `${safeName}.md`, content: markdown })
  }

  return exports
}

const VALID_CATEGORIES = ['spec', 'research', 'contract', 'questionnaire', 'angebots-draft', 'angebots-anfrage', 'angebots-vergleich', 'formblatt', 'other']

export async function updateDocumentCategory(
  id: string | number,
  category: string,
): Promise<SaveResult> {
  if (!VALID_CATEGORIES.includes(category)) {
    return { success: false, error: `Ungültige Kategorie: ${category}` }
  }
  const user = await requireAuth()
  const payload = await getPayloadClient()
  try {
    await payload.update({
      collection: 'documents',
      id,
      data: { category },
      user,
    })
    return { success: true, documentId: id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Fehler beim Kategorie-Update' }
  }
}

const VALID_WORKFLOW_STATUSES = ['draft', 'review', 'revision', 'approved', 'final', 'archived']

export async function updateDocumentStatus(
  id: string | number,
  status: string,
): Promise<SaveResult> {
  if (!VALID_WORKFLOW_STATUSES.includes(status)) {
    return { success: false, error: `Ungültiger Status: ${status}` }
  }

  const user = await requireAuth()
  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: 'documents',
      id,
      data: { workflowStatus: status },
      user,
    })
    return { success: true, documentId: id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Fehler beim Status-Update',
    }
  }
}

export async function deleteDocument(id: string | number) {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  await payload.delete({
    collection: 'documents',
    id,
    user,
  })
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
]

export async function uploadFile(formData: FormData): Promise<SaveResult> {
  const user = await requireAuth()

  const file = formData.get('file') as File | null
  const rawProjectId = formData.get('projectId') as string | null
  const title = (formData.get('title') as string) || undefined
  const category = (formData.get('category') as string) || 'other'

  if (!file || !rawProjectId) {
    return { success: false, error: 'Datei und Projekt-ID sind erforderlich' }
  }

  const projectId = Number(rawProjectId)

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      success: false,
      error: 'Dateityp nicht unterstützt. Erlaubt: PDF, Word, Text, Markdown, CSV',
    }
  }

  try {
    const payload = await getPayloadClient()

    // Ownership validation
    try {
      await payload.findByID({ collection: 'projects', id: projectId, user })
    } catch {
      return { success: false, error: 'Projekt nicht gefunden oder kein Zugriff' }
    }

    // Extract text from file
    const { extractTextFromBuffer } = await import('@/lib/text-extraction')

    const buffer = Buffer.from(await file.arrayBuffer())
    const extractedText = await extractTextFromBuffer(buffer, file.type, file.name)

    const doc = await payload.create({
      collection: 'documents',
      data: {
        title: title || file.name,
        category,
        sourceToolType: 'manual',
        project: projectId,
        markdown: extractedText,
        workflowStatus: 'draft',
        _status: 'published',
      },
      user,
    })

    return { success: true, documentId: doc.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unbekannter Fehler beim Upload',
    }
  }
}

export async function getDocumentVersions(
  documentId: string | number,
): Promise<DocumentVersion[]> {
  const user = await requireAuth()
  const payload = await getPayloadClient()

  // Verify access
  await payload.findByID({ collection: 'documents', id: documentId, user })

  const result = await payload.findVersions({
    collection: 'documents',
    where: { parent: { equals: documentId } },
    sort: '-createdAt',
    limit: 20,
  })

  return result.docs.map((v) => ({
    id: v.id,
    createdAt: v.createdAt as string,
    title: (v.version?.title as string) ?? null,
    markdown: (v.version?.markdown as string) ?? null,
  }))
}

export async function restoreDocumentVersion(
  versionId: string | number,
): Promise<SaveResult> {
  const user = await requireAuth()
  const payload = await getPayloadClient()

  try {
    const result = await payload.restoreVersion({
      collection: 'documents',
      id: String(versionId),
      user,
    })
    return { success: true, documentId: result.doc.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Fehler beim Wiederherstellen',
    }
  }
}

export async function deleteDocumentVersion(
  documentId: string | number,
  versionId: string | number,
): Promise<SaveResult> {
  const user = await requireAuth()
  const payload = await getPayloadClient()

  // Verify user has access to parent document
  await payload.findByID({ collection: 'documents', id: documentId, user })

  // Verify the version belongs to this document
  const version = await payload.findVersionByID({
    collection: 'documents',
    id: String(versionId),
  })

  if (String(version.parent) !== String(documentId)) {
    return { success: false, error: 'Version gehört nicht zu diesem Dokument' }
  }

  try {
    // Payload CMS 3 doesn't expose a public deleteVersion API.
    // Delete from the versions table via the database pool.
    const pool = (payload.db as unknown as { pool: { query: (sql: string, params: unknown[]) => Promise<unknown> } }).pool
    await pool.query('DELETE FROM _documents_v WHERE id = $1', [Number(versionId)])
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Fehler beim Löschen der Version',
    }
  }
}
