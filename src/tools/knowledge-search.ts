import { tool } from 'ai'
import { getVectorizedPayload } from 'payloadcms-vectorize'
import { getPayloadClient } from '@/lib/payload'
import type { Where } from 'payload'
import { getSessionContext } from '@/lib/session-context'
import { directEmbedDocuments } from '@/lib/vectorize-config'
import { knowledgeSearchInputSchema } from './knowledge-search-schema'
import type { KnowledgeSearchResult } from './knowledge-search-schema'

export { knowledgeSearchInputSchema, knowledgeSearchResultSchema } from './knowledge-search-schema'
export type { KnowledgeSearchInput, KnowledgeSearchResult } from './knowledge-search-schema'

const POOL_NAME = 'vector_embeddings'

/** Max documents to embed in a single tool call */
const MAX_EMBED_BATCH = 20

// In-memory rate limit: max 5 calls per minute per (userId, projectId)
const rateLimits = new Map<string, number[]>()
function checkRateLimit(userId: string | number, projectId: string | number): boolean {
  const key = `${userId}:${projectId}`
  const now = Date.now()
  const window = 60_000
  const maxCalls = 5
  const calls = (rateLimits.get(key) ?? []).filter(
    (t) => now - t < window,
  )
  if (calls.length >= maxCalls) return false
  calls.push(now)
  rateLimits.set(key, calls)
  return true
}

// Embedding cooldown: 30s after an embedding batch per (userId, projectId)
const embeddingCooldowns = new Map<string, number>()
function checkEmbeddingCooldown(userId: string | number, projectId: string | number): boolean {
  const key = `${userId}:${projectId}`
  const last = embeddingCooldowns.get(key) ?? 0
  return Date.now() - last >= 30_000
}
function setEmbeddingCooldown(userId: string | number, projectId: string | number) {
  embeddingCooldowns.set(`${userId}:${projectId}`, Date.now())
}

/**
 * Fetch all accessible document IDs for a collection+project, paginating if needed.
 */
async function fetchAllDocs(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  collection: 'documents' | 'media',
  ctx: NonNullable<ReturnType<typeof getSessionContext>>,
): Promise<Array<Record<string, unknown>>> {
  const allDocs: Array<Record<string, unknown>> = []
  const pageSize = 100
  let page = 1
  let hasMore = true

  const baseWhere: Where = { project: { equals: ctx.projectId } }

  while (hasMore) {
    const result = await payload.find({
      collection,
      where: baseWhere,
      limit: pageSize,
      page,
      depth: 0,
      overrideAccess: false,
      user: ctx.user as Record<string, unknown>,
    })
    allDocs.push(...(result.docs as Array<Record<string, unknown>>))
    hasMore = result.hasNextPage
    page++
  }
  return allDocs
}

export type KnowledgeSearchProgress = {
  status: 'checking' | 'embedding' | 'searching'
  results: never[]
  count?: number
}

export const knowledgeSearch = tool({
  description:
    'Durchsuche die Wissensbasis des aktuellen Projekts nach relevanten Informationen ' +
    'aus hochgeladenen Dokumenten, Marktrecherchen und Leistungsbeschreibungen.',
  inputSchema: knowledgeSearchInputSchema,
  execute: async function* ({ query, category, limit }) {
    const ctx = getSessionContext()
    if (!ctx?.user || !ctx.projectId) {
      yield { results: [], error: 'Kein Projekt-Kontext' } satisfies KnowledgeSearchResult
      return
    }

    const payload = await getPayloadClient()
    const projectId = String(ctx.projectId)

    // Rate limit by (userId, projectId) — unforgeable
    if (!checkRateLimit(ctx.user.id, ctx.projectId!)) {
      yield { results: [], error: 'Zu viele Suchanfragen. Bitte warten.' } satisfies KnowledgeSearchResult
      return
    }

    try {
      // 0. Check if vectorize is enabled
      const vectorized = getVectorizedPayload(payload)
      if (!vectorized) {
        yield { results: [], error: 'Die Dokumentensuche ist derzeit nicht verfügbar.' } satisfies KnowledgeSearchResult
        return
      }

      // 1. Access Control: Fetch accessible docs + media (paginated)
      yield { status: 'checking' as const, results: [] as never[] }

      const [allDocs, allMedia] = await Promise.all([
        fetchAllDocs(payload, 'documents', ctx),
        fetchAllDocs(payload, 'media', ctx),
      ])

      if (allDocs.length + allMedia.length === 0) {
        yield { results: [], message: 'Keine Dokumente im Projekt gefunden.' } satisfies KnowledgeSearchResult
        return
      }

      // 2. Check which docs are already embedded + stale detection
      const existingEmbeddings = await payload.find({
        collection: POOL_NAME as 'users',
        where: { projectId: { equals: projectId } },
        limit: 10000,
        depth: 0,
        overrideAccess: true,
      })

      // Map: "collection:docId" -> newest embedding createdAt
      const embeddingTimestamps = new Map<string, Date>()
      for (const e of existingEmbeddings.docs as Array<Record<string, unknown>>) {
        const key = `${e.sourceCollection}:${e.docId}`
        const existing = embeddingTimestamps.get(key)
        const created = new Date(e.createdAt as string)
        if (!existing || created > existing) {
          embeddingTimestamps.set(key, created)
        }
      }

      // 3. Lazy Embed: identify missing + stale docs
      const needsEmbeddingDocs: Array<Record<string, unknown>> = []
      const needsEmbeddingMedia: Array<Record<string, unknown>> = []

      for (const doc of allDocs) {
        const embeddedAt = embeddingTimestamps.get(`documents:${doc.id}`)
        if (!embeddedAt || new Date(doc.updatedAt as string) > embeddedAt) {
          if (embeddedAt) {
            // Stale -> delete old embeddings
            await payload.delete({
              collection: POOL_NAME as 'users',
              where: {
                sourceCollection: { equals: 'documents' },
                docId: { equals: String(doc.id) },
              },
              overrideAccess: true,
            })
          }
          needsEmbeddingDocs.push(doc)
        }
      }

      for (const media of allMedia) {
        const embeddedAt = embeddingTimestamps.get(`media:${media.id}`)
        if (!embeddedAt || new Date(media.updatedAt as string) > embeddedAt) {
          if (embeddedAt) {
            await payload.delete({
              collection: POOL_NAME as 'users',
              where: {
                sourceCollection: { equals: 'media' },
                docId: { equals: String(media.id) },
              },
              overrideAccess: true,
            })
          }
          needsEmbeddingMedia.push(media)
        }
      }

      const totalNeedsEmbedding =
        needsEmbeddingDocs.length + needsEmbeddingMedia.length

      if (totalNeedsEmbedding > 0) {
        // Embedding cooldown: prevent repeated expensive embedding within 30s
        if (!checkEmbeddingCooldown(ctx.user.id, ctx.projectId!)) {
          yield { results: [], error: 'Embeddings werden gerade verarbeitet. Bitte warten.' } satisfies KnowledgeSearchResult
          return
        }

        yield { status: 'embedding' as const, results: [] as never[], count: totalNeedsEmbedding }

        // Respect batch limit to control costs
        await directEmbedDocuments(
          payload,
          'documents',
          needsEmbeddingDocs.slice(0, MAX_EMBED_BATCH),
        )
        await directEmbedDocuments(
          payload,
          'media',
          needsEmbeddingMedia.slice(
            0,
            MAX_EMBED_BATCH - Math.min(needsEmbeddingDocs.length, MAX_EMBED_BATCH),
          ),
        )

        setEmbeddingCooldown(ctx.user.id, ctx.projectId!)
      }

      // 4. Build lookup maps from already-fetched docs/media
      const titleMap = new Map<string, string>()
      const categoryMap = new Map<string, string>()
      for (const d of allDocs) {
        titleMap.set(String(d.id), String(d.title ?? ''))
        if (d.category) categoryMap.set(String(d.id), String(d.category))
      }
      for (const m of allMedia) {
        titleMap.set(String(m.id), String(m.title ?? m.filename ?? ''))
        categoryMap.set(String(m.id), 'media')
      }

      // 5. Vector Search — fetch extra results when category-filtering to compensate
      yield { status: 'searching' as const, results: [] as never[] }

      const searchLimit = category ? Math.min(limit * 3, 20) : limit

      const results = await vectorized.search({
        query,
        knowledgePool: POOL_NAME,
        where: {
          projectId: { equals: projectId },
          ...(category === 'media'
            ? { sourceCollection: { equals: 'media' } }
            : category
              ? { sourceCollection: { equals: 'documents' } }
              : {}),
        },
        limit: searchLimit,
      })

      // 6. Defense-in-depth: filter against allowed IDs + category post-filter
      const allowedSet = new Set([
        ...allDocs.map((d) => String(d.id)),
        ...allMedia.map((m) => String(m.id)),
      ])
      const filtered = results
        .filter((r) => allowedSet.has(String(r.docId)))
        .filter((r) => !category || category === categoryMap.get(r.docId))
        .slice(0, limit)

      // Final yield
      yield {
        results: filtered.map((r) => ({
          text: r.chunkText,
          source: r.sourceCollection,
          docId: r.docId,
          docTitle: titleMap.get(r.docId) || undefined,
          similarity: Math.round(r.similarity * 100) / 100,
        })),
      } satisfies KnowledgeSearchResult
    } catch (err) {
      console.error('[knowledgeSearch] Fehler:', err)
      yield {
        results: [],
        error: 'Bei der Suche ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
      } satisfies KnowledgeSearchResult
    }
  },
})
