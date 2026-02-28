'use server'

import { getPayloadClient } from '@/lib/payload'
import { requireAuth } from '@/lib/auth'
import {
  PROJECT_STATUSES,
  projektDataSchema,
  type ProjectMeta,
  type ProjectListItem,
  type ProjectStatus,
  type ProjektData,
} from '@/types/project'

// Tier 1: Sidebar/Navigation — minimal fields
export async function listProjectsMeta(): Promise<ProjectMeta[]> {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'projects',
    where: {
      projectStatus: { not_equals: 'aufgehoben' },
    },
    select: {
      name: true,
      projectStatus: true,
      createdAt: true,
      updatedAt: true,
    },
    limit: 100,
    sort: '-createdAt',
    overrideAccess: false,
    user,
  })

  return result.docs.map((doc) => ({
    id: doc.id,
    name: doc.name as string,
    projectStatus: (doc.projectStatus as ProjectStatus) ?? null,
    createdAt: doc.createdAt as string,
    updatedAt: doc.updatedAt as string,
  }))
}

// Tier 2: Project list/grid — base data + JSON data
export async function listProjects(): Promise<ProjectListItem[]> {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'projects',
    where: {
      projectStatus: { not_equals: 'aufgehoben' },
    },
    select: {
      name: true,
      projectStatus: true,
      data: true,
      createdAt: true,
      updatedAt: true,
    },
    limit: 100,
    sort: '-createdAt',
    overrideAccess: false,
    user,
  })

  return result.docs.map((doc) => ({
    id: doc.id,
    name: doc.name as string,
    projectStatus: (doc.projectStatus as ProjectStatus) ?? null,
    createdAt: doc.createdAt as string,
    updatedAt: doc.updatedAt as string,
    data: (doc.data as ProjektData) ?? null,
  }))
}

// Tier 3: Full project detail
export async function getProject(id: string | number) {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  const doc = await payload.findByID({
    collection: 'projects',
    id,
    depth: 0,
    user,
  })
  return doc
}

export async function createProject(input: {
  name: string
  description?: string
  data?: Partial<ProjektData>
}) {
  const user = await requireAuth()
  const payload = await getPayloadClient()

  const projectData = input.data && Object.keys(input.data).length > 0 ? input.data : undefined
  if (projectData) {
    projektDataSchema.parse(projectData)
  }

  const doc = await payload.create({
    collection: 'projects',
    data: {
      name: input.name,
      projectStatus: 'planung',
      data: projectData ?? {},
      _status: 'published',
    },
    user,
  })

  return { id: doc.id, name: doc.name }
}

export async function updateProjectStatus(
  id: string | number,
  status: string,
): Promise<{ success: boolean; error?: string }> {
  if (!PROJECT_STATUSES.includes(status as ProjectStatus)) {
    return { success: false, error: `Ungültiger Status: ${status}` }
  }

  const user = await requireAuth()
  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: 'projects',
      id,
      data: { projectStatus: status },
      user,
    })
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Fehler beim Status-Update',
    }
  }
}

export async function updateProjectData(
  id: string | number,
  patch: Partial<ProjektData>,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  const payload = await getPayloadClient()

  try {
    const existing = await payload.findByID({
      collection: 'projects',
      id,
      depth: 0,
      user,
    })

    const currentData = (existing.data as ProjektData) ?? {}
    const merged = { ...currentData, ...patch }
    projektDataSchema.parse(merged)

    await payload.update({
      collection: 'projects',
      id,
      data: { data: merged },
      user,
    })
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Fehler beim Projekt-Update',
    }
  }
}

export async function deleteProject(id: string | number) {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'projects',
    id,
    data: { projectStatus: 'aufgehoben' },
    user,
  })
}
