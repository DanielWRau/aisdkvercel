import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: path.resolve(dirname, '../../media'),
    mimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown',
      'text/csv',
    ],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'mimeType', 'filesize', 'createdAt'],
    description: 'Upload and manage files (PDF, Word, Excel, Text)',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      admin: { position: 'sidebar' },
    },
    {
      name: 'filePreview',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/FilePreview#FilePreview',
        },
      },
    },
  ],
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { 'project.owner': { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { 'project.owner': { equals: user.id } }
    },
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
}
