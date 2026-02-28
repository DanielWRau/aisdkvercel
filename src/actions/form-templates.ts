'use server'

import { getPayloadClient } from '@/lib/payload'
import { requireAuth } from '@/lib/auth'
import type { FormStructure } from '@/lib/form-structure'

export type FormTemplateItem = {
  id: string | number
  name: string
  formularNummer: string
  sammlung: string
  description: string | null
  labels: { label: string }[]
  anwendungsschwelle: number | null
  pflicht: boolean
  sortOrder: number
}

function mapDoc(doc: Record<string, unknown>): FormTemplateItem {
  return {
    id: doc.id as string | number,
    name: doc.name as string,
    formularNummer: doc.formularNummer as string,
    sammlung: (doc.sammlung as string) ?? '',
    description: (doc.description as string) ?? null,
    labels: ((doc.labels as { label: string }[]) ?? []),
    anwendungsschwelle: (doc.anwendungsschwelle as number) ?? null,
    pflicht: (doc.pflicht as boolean) ?? true,
    sortOrder: (doc.sortOrder as number) ?? 0,
  }
}

export async function listFormTemplates(sammlung?: string): Promise<FormTemplateItem[]> {
  await requireAuth()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'form-templates',
    where: sammlung ? { sammlung: { equals: sammlung } } : {},
    sort: 'sortOrder',
    limit: 200,
  })

  return result.docs.map(mapDoc)
}

export async function getFormTemplatesByLabels(labels: string[]): Promise<FormTemplateItem[]> {
  await requireAuth()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'form-templates',
    where: { 'labels.label': { in: labels } },
    sort: 'sortOrder',
    limit: 200,
  })

  return result.docs.map(mapDoc)
}

export async function getUniqueSammlungen(): Promise<string[]> {
  await requireAuth()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'form-templates',
    limit: 200,
  })

  const set = new Set<string>()
  for (const doc of result.docs) {
    const s = doc.sammlung as string | undefined
    if (s) set.add(s)
  }
  return Array.from(set).sort()
}

export async function getUniqueLabels(sammlung?: string): Promise<string[]> {
  await requireAuth()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'form-templates',
    where: sammlung ? { sammlung: { equals: sammlung } } : {},
    limit: 200,
  })

  const labelSet = new Set<string>()
  for (const doc of result.docs) {
    const labels = doc.labels as { label: string }[] | undefined
    if (labels) {
      for (const l of labels) {
        if (l.label) labelSet.add(l.label)
      }
    }
  }

  return Array.from(labelSet).sort()
}

export async function getFormTemplateStructure(
  id: string | number,
): Promise<FormStructure | null> {
  await requireAuth()
  const payload = await getPayloadClient()
  const doc = await payload.findByID({ collection: 'form-templates', id })
  return (doc.structure as FormStructure) ?? null
}

export async function getProjectFormblattDocuments(projectId: string | number) {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'documents',
    where: {
      project: { equals: projectId },
      sourceToolType: { equals: 'fillFormblatt' },
      workflowStatus: { not_equals: 'archived' },
    },
    sort: '-updatedAt',
    limit: 50,
    user,
  })
  return result.docs.map((d) => ({
    id: d.id,
    tags: d.tags as { tag: string }[] | null,
    jsonData: d.jsonData as Record<string, unknown> | null,
  }))
}
