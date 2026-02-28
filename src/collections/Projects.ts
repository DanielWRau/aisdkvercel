import type { CollectionConfig } from 'payload'
import { projektDataSchema } from '@/types/project'

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'projectStatus', 'owner', 'updatedAt'],
  },
  versions: { drafts: true, maxPerDoc: 20 },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'richText' },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'projectStatus',
      type: 'select',
      defaultValue: 'planung',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Planung', value: 'planung' },
        { label: 'Bekanntgemacht', value: 'bekanntgemacht' },
        { label: 'Laufend', value: 'laufend' },
        { label: 'Auswertung', value: 'auswertung' },
        { label: 'Abgeschlossen', value: 'abgeschlossen' },
        { label: 'Aufgehoben', value: 'aufgehoben' },
        { label: 'Ruhend', value: 'ruhend' },
      ],
    },
    { name: 'data', type: 'json' },
    {
      name: 'documents',
      type: 'join',
      collection: 'documents',
      on: 'project',
    },
  ],
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        if (operation === 'create' && req.user) {
          data.owner = req.user.id
        }
        return data
      },
    ],
    beforeValidate: [
      ({ data }) => {
        if (data?.data && typeof data.data === 'object' && Object.keys(data.data).length > 0) {
          projektDataSchema.parse(data.data)
        }
        return data
      },
    ],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { owner: { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { owner: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { owner: { equals: user.id } }
    },
  },
}
