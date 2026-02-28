import path from 'node:path'
import type { Payload } from 'payload'
import { extractText } from './text-extraction'
import { embedDocs } from './embeddings'

const MAX_CHUNK_SIZE = 1500
const CHUNK_OVERLAP = 200

/**
 * Split text into paragraph-based chunks with overlap.
 */
export function chunkText(text: string): string[] {
  if (!text || text.trim().length === 0) return []

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (current.length + trimmed.length + 1 > MAX_CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim())
      // Overlap: keep tail of previous chunk
      const overlap = current.slice(-CHUNK_OVERLAP).trim()
      current = overlap ? overlap + '\n\n' + trimmed : trimmed
    } else {
      current = current ? current + '\n\n' + trimmed : trimmed
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim())
  }

  // Handle single long text without paragraph breaks
  if (chunks.length === 0 && text.trim().length > 0) {
    const trimmed = text.trim()
    for (let i = 0; i < trimmed.length; i += MAX_CHUNK_SIZE - CHUNK_OVERLAP) {
      chunks.push(trimmed.slice(i, i + MAX_CHUNK_SIZE))
    }
  }

  return chunks
}

type PoolEntry = { chunk: string; projectId: string; [key: string]: unknown }

/**
 * Convert a Document into knowledge pool entries.
 */
export async function documentsToPool(
  doc: Record<string, unknown>,
): Promise<PoolEntry[]> {
  const parts: string[] = []
  if (doc.title) parts.push(String(doc.title))
  if (doc.description) parts.push(String(doc.description))
  if (doc.markdown && typeof doc.markdown === 'string') {
    parts.push(doc.markdown)
  }

  const fullText = parts.join('\n\n')
  if (!fullText.trim()) return []

  const projectId = resolveProjectId(doc.project)
  if (!projectId) return []

  return chunkText(fullText).map((chunk) => ({ chunk, projectId }))
}

/**
 * Convert a Media upload into knowledge pool entries.
 * Extracts text from the file on disk.
 */
export async function mediaToPool(
  doc: Record<string, unknown>,
): Promise<PoolEntry[]> {
  const projectId = resolveProjectId(doc.project)
  if (!projectId) return []

  const filename = doc.filename as string | undefined
  const mimeType = doc.mimeType as string | undefined
  if (!filename || !mimeType) return []

  const filePath = path.resolve(process.cwd(), 'media', filename)

  try {
    const text = await extractText(filePath, mimeType)
    const parts: string[] = []
    if (doc.title) parts.push(String(doc.title))
    parts.push(text)

    return chunkText(parts.join('\n\n')).map((chunk) => ({ chunk, projectId }))
  } catch (err) {
    console.error(`[rag] Text extraction failed for media ${doc.id}:`, err)
    return []
  }
}

function resolveProjectId(project: unknown): string | null {
  if (!project) return null
  if (typeof project === 'string' || typeof project === 'number') return String(project)
  if (typeof project === 'object' && project !== null && 'id' in project) {
    return String((project as { id: string | number }).id)
  }
  return null
}

const POOL_NAME = 'vector_embeddings'

/**
 * Run raw SQL against Payload's Postgres adapter.
 * Mirrors the plugin's internal approach (pool.query with params).
 */
async function runSQL(
  payload: Payload,
  sql: string,
  params?: unknown[],
): Promise<unknown> {
  const db = payload.db as unknown as {
    pool?: { query: (sql: string, params?: unknown[]) => Promise<unknown> }
    drizzle?: { execute: (sql: unknown) => Promise<unknown> }
    schemaName?: string
  }
  if (db.pool?.query) return db.pool.query(sql, params)
  if (db.drizzle?.execute) return db.drizzle.execute(sql)
  throw new Error('[rag] No SQL executor available')
}

function getSchemaName(payload: Payload): string {
  return (
    (payload.db as unknown as { schemaName?: string }).schemaName || 'public'
  )
}

/**
 * Embed documents directly (without job queue).
 * Only call for documents the current user is allowed to see!
 */
export async function directEmbedDocuments(
  payload: Payload,
  collection: 'documents' | 'media',
  docs: Array<Record<string, unknown>>,
): Promise<number> {
  const toPool = collection === 'documents' ? documentsToPool : mediaToPool
  const schemaName = getSchemaName(payload)
  let embedded = 0

  for (const doc of docs) {
    try {
      const entries = await toPool(doc)
      if (entries.length === 0) continue

      const vectors = await embedDocs(entries.map((e) => e.chunk))

      // Insert chunks + vectors in parallel (matches plugin approach)
      await Promise.all(
        vectors.map(async (vector, index) => {
          const { chunk, ...extensionFields } = entries[index]

          const created = await payload.create({
            collection: POOL_NAME as 'users', // Plugin-managed collection
            data: {
              sourceCollection: collection,
              docId: String(doc.id),
              chunkIndex: index,
              chunkText: chunk,
              embeddingVersion: 'v1',
              embedding: Array.from(vector),
              ...extensionFields,
            } as Record<string, unknown>,
            overrideAccess: true,
          })

          // Persist vector column via raw SQL (plugin uses same pattern)
          const id = String(created.id)
          const literal = `[${Array.from(vector).join(',')}]`
          await runSQL(
            payload,
            `UPDATE "${schemaName}"."${POOL_NAME}" SET embedding = $1 WHERE id = $2`,
            [literal, id],
          )
        }),
      )
      embedded++
    } catch (err) {
      console.error(`[rag] Embedding failed for ${collection}:${doc.id}:`, err)
    }
  }
  return embedded
}
