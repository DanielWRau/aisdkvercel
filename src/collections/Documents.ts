import type { CollectionConfig } from 'payload'

export const Documents: CollectionConfig = {
  slug: 'documents',
  upload: {
    staticDir: 'media/documents',
    mimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown',
      'image/png',
      'image/jpeg',
    ],
  },
  versions: { drafts: true, maxPerDoc: 20 },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'project', 'category', 'createdAt'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      admin: { position: 'sidebar' },
    },
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'Spezifikation', value: 'spec' },
        { label: 'Research', value: 'research' },
        { label: 'Vertrag', value: 'contract' },
        { label: 'Fragebogen', value: 'questionnaire' },
        { label: 'Sonstiges', value: 'other' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'sourceToolType',
      type: 'select',
      options: [
        { label: 'Marktrecherche', value: 'marketResearch' },
        { label: 'Leistungsbeschreibung', value: 'generateSpec' },
        { label: 'Fragebogen', value: 'askQuestions' },
        { label: 'Manuell', value: 'manual' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'jsonData',
      type: 'json',
      admin: { description: 'Strukturierte Tool-Ausgabe (vom System verwaltet)' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Entwurf', value: 'draft' },
        { label: 'In Review', value: 'review' },
        { label: 'Freigegeben', value: 'approved' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'tags',
      type: 'array',
      fields: [{ name: 'tag', type: 'text' }],
    },
    { name: 'content', type: 'richText' },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation !== 'create' || !data?.project) return data

        const project = await req.payload.findByID({
          collection: 'projects',
          id: data.project,
        })

        if (!data.category && project.settings?.defaultCategory) {
          data.category = project.settings.defaultCategory
        }

        if (project.settings?.requireApproval) {
          data.status = 'draft'
        }

        return data
      },
    ],
  },
  access: {
    read: () => true,
    create: () => true,
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
}
