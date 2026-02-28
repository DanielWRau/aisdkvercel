'use server'

import { getPayloadClient } from '@/lib/payload'
import { requireAuth } from '@/lib/auth'
import { getTransformer } from '@/lib/tool-transformers'
import {
  angebotsDraftContentSchema,
  DRAFT_MAX_JSON_SIZE,
  type AnfrageContextSource,
  type AnfrageSettings,
  type AngebotsDraftResult,
  type AngebotsDocumentsResult,
  type AngebotsDocumentSummary,
  type Supplier,
  type VersionSummary,
} from '@/types/angebot'

export async function getAngebotsDraft(
  projectId: string | number,
): Promise<AngebotsDraftResult> {
  const user = await requireAuth()
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'documents',
    where: {
      project: { equals: projectId },
      sourceToolType: { equals: 'angebotsDraft' },
    },
    sort: '-updatedAt',
    limit: 1,
    select: { id: true, jsonData: true, updatedAt: true },
    depth: 0,
    user,
  })

  if (result.docs.length === 0) return null

  const doc = result.docs[0]
  const parsed = angebotsDraftContentSchema.safeParse(doc.jsonData)
  if (!parsed.success) return null

  return {
    documentId: doc.id,
    suppliers: parsed.data.suppliers,
    anfrageSettings: parsed.data.anfrageSettings,
    updatedAt: doc.updatedAt as string,
  }
}

export async function saveAngebotsDraft(input: {
  projectId: string | number
  suppliers: Supplier[]
  anfrageSettings?: AnfrageSettings
  updatedAt?: string
}): Promise<{ success: boolean; updatedAt?: string; error?: string }> {
  const { projectId, suppliers, anfrageSettings, updatedAt } = input
  const user = await requireAuth()
  const payload = await getPayloadClient()

  // Validate with strict schema
  const draftData = { suppliers, ...(anfrageSettings ? { anfrageSettings } : {}) }
  try {
    angebotsDraftContentSchema.strict().parse(draftData)
  } catch {
    return { success: false, error: 'Ungültige Lieferantendaten' }
  }

  // JSON size check
  const jsonStr = JSON.stringify(draftData)
  if (jsonStr.length > DRAFT_MAX_JSON_SIZE) {
    return { success: false, error: 'Daten zu groß' }
  }

  // Ownership validation
  try {
    await payload.findByID({ collection: 'projects', id: projectId, user })
  } catch {
    return { success: false, error: 'Projekt nicht gefunden oder kein Zugriff' }
  }

  // Find existing draft
  const existing = await payload.find({
    collection: 'documents',
    where: {
      project: { equals: projectId },
      sourceToolType: { equals: 'angebotsDraft' },
    },
    sort: '-updatedAt',
    limit: 1,
    user,
  })

  // Generate markdown content via transformer
  const transformer = getTransformer('angebotsDraft')
  const markdown = transformer ? transformer.toMarkdown({ suppliers }) : ''

  try {
    if (existing.docs.length > 0) {
      const doc = existing.docs[0]

      // Conflict detection
      if (updatedAt && doc.updatedAt !== updatedAt) {
        return {
          success: false,
          error:
            'Konflikt: Die Daten wurden zwischenzeitlich geändert. Bitte laden Sie die Seite neu.',
        }
      }

      const updated = await payload.update({
        collection: 'documents',
        id: doc.id,
        data: {
          jsonData: draftData,
          markdown,
          title: `Lieferantenliste (${suppliers.length} Lieferanten)`,
        },
        user,
      })
      return { success: true, updatedAt: updated.updatedAt as string }
    } else {
      const created = await payload.create({
        collection: 'documents',
        data: {
          title: `Lieferantenliste (${suppliers.length} Lieferanten)`,
          category: 'angebots-draft',
          sourceToolType: 'angebotsDraft',
          project: projectId,
          jsonData: draftData,
          markdown,
          workflowStatus: 'draft',
          _status: 'published',
        },
        user,
      })
      return { success: true, updatedAt: created.updatedAt as string }
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Fehler beim Speichern',
    }
  }
}

export async function getMarktanalyseProviders(
  projectId: string | number,
): Promise<{ available: boolean; providers: { name: string; website?: string; kontakt?: string }[] }> {
  const user = await requireAuth()
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'documents',
    where: {
      project: { equals: projectId },
      sourceToolType: { equals: 'marketResearch' },
    },
    sort: '-updatedAt',
    limit: 1,
    select: { jsonData: true },
    depth: 0,
    user,
  })

  if (result.docs.length === 0) {
    return { available: false, providers: [] }
  }

  const doc = result.docs[0]
  const data = doc.jsonData as { providers?: { name: string; website?: string; email?: string; phone?: string }[] } | null

  if (!data?.providers?.length) {
    return { available: false, providers: [] }
  }

  const providers = data.providers.map((p) => ({
    name: p.name,
    website: p.website || undefined,
    kontakt: [p.email, p.phone].filter(Boolean).join(', ') || undefined,
  }))

  return { available: true, providers }
}

export async function getLeistungsbeschreibung(
  projectId: string | number,
): Promise<string | null> {
  const user = await requireAuth()
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'documents',
    where: {
      project: { equals: projectId },
      sourceToolType: { equals: 'generateSpec' },
    },
    sort: '-updatedAt',
    limit: 1,
    select: { jsonData: true },
    depth: 0,
    user,
  })

  if (result.docs.length === 0) return null

  const doc = result.docs[0]
  const transformer = getTransformer('generateSpec')
  if (!transformer || !doc.jsonData) return null

  try {
    return transformer.toMarkdown(doc.jsonData)
  } catch {
    return null
  }
}

export async function getAnfrageContext(
  projectId: string | number,
): Promise<{ source: AnfrageContextSource; content: string } | null> {
  const user = await requireAuth()
  const payload = await getPayloadClient()

  // Priority order: Spec > Market Research > Q&A
  const sourceTypes: { type: string; source: AnfrageContextSource }[] = [
    { type: 'generateSpec', source: 'leistungsbeschreibung' },
    { type: 'marketResearch', source: 'marketResearch' },
    { type: 'askQuestions', source: 'askQuestions' },
  ]

  const result = await payload.find({
    collection: 'documents',
    where: {
      project: { equals: projectId },
      sourceToolType: { in: sourceTypes.map((s) => s.type) },
    },
    sort: '-updatedAt',
    select: { sourceToolType: true, jsonData: true },
    depth: 0,
    limit: 20,
    user,
  })

  // Pick the best available by priority
  for (const { type, source } of sourceTypes) {
    const doc = result.docs.find((d) => d.sourceToolType === type)
    if (!doc?.jsonData) continue

    const transformer = getTransformer(type)
    if (!transformer) continue

    try {
      const content = transformer.toMarkdown(doc.jsonData)
      if (content && content.length >= 30) {
        return { source, content }
      }
    } catch {
      continue
    }
  }

  return null
}

export async function getAngebotsDocuments(
  projectId: string | number,
): Promise<AngebotsDocumentsResult> {
  const user = await requireAuth()
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'documents',
    where: {
      project: { equals: projectId },
      sourceToolType: { in: ['angebotsAnfrage', 'angebotsVergleich'] },
    },
    sort: '-updatedAt',
    select: {
      id: true,
      title: true,
      sourceToolType: true,
      markdown: true,
      createdAt: true,
      updatedAt: true,
    },
    depth: 0,
    limit: 10,
    user,
  })

  let anfrage: AngebotsDocumentSummary | null = null
  let vergleich: AngebotsDocumentSummary | null = null

  for (const doc of result.docs) {
    const content = (doc.markdown as string) || ''
    const summary: AngebotsDocumentSummary = {
      id: doc.id,
      title: doc.title as string,
      sourceToolType: doc.sourceToolType as string,
      content: content || null,
      createdAt: doc.createdAt as string,
      updatedAt: doc.updatedAt as string,
    }

    if (doc.sourceToolType === 'angebotsAnfrage' && !anfrage) {
      anfrage = summary
    } else if (doc.sourceToolType === 'angebotsVergleich' && !vergleich) {
      vergleich = summary
    }
  }

  return { anfrage, vergleich }
}

export async function getAngebotsDocumentVersions(
  documentId: string | number,
): Promise<VersionSummary[]> {
  const user = await requireAuth()
  const payload = await getPayloadClient()

  // Verify access by reading the parent document
  await payload.findByID({ collection: 'documents', id: documentId, user })

  const result = await payload.findVersions({
    collection: 'documents',
    where: { parent: { equals: documentId } },
    sort: '-createdAt',
    limit: 20,
  })

  const versions: VersionSummary[] = []
  for (const v of result.docs) {
    const content = (v.version?.markdown as string) || ''
    versions.push({
      id: v.id,
      createdAt: v.createdAt as string,
      content: content || null,
    })
  }
  return versions
}
