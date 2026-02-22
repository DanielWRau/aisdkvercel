'use server'

import { getPayloadClient } from '@/lib/payload'

export async function listProjects(): Promise<{ id: string | number; name: string }[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'projects',
    where: { projectStatus: { equals: 'active' } },
    limit: 100,
    sort: '-createdAt',
    overrideAccess: true,
  })

  return result.docs.map((doc) => ({
    id: doc.id,
    name: doc.name,
  }))
}

export async function createProject(name: string): Promise<{ id: string | number; name: string }> {
  const payload = await getPayloadClient()
  const doc = await payload.create({
    collection: 'projects',
    data: {
      name,
      projectStatus: 'active',
      _status: 'published',
    },
    overrideAccess: true,
  })

  return { id: doc.id, name: doc.name }
}
