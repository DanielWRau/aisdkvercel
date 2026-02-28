import type { CollectionConfig } from 'payload'

export const Documents: CollectionConfig = {
  slug: 'documents',
  versions: { drafts: true, maxPerDoc: 20 },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'project', 'category', 'workflowStatus', 'updatedAt'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'markdown',
      type: 'textarea',
    },
    {
      name: 'attachments',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
    },
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
        { label: 'Specification', value: 'spec' },
        { label: 'Research', value: 'research' },
        { label: 'Contract', value: 'contract' },
        { label: 'Questionnaire', value: 'questionnaire' },
        { label: 'Angebotsentwurf', value: 'angebots-draft' },
        { label: 'Angebotsanfrage', value: 'angebots-anfrage' },
        { label: 'Angebotsvergleich', value: 'angebots-vergleich' },
        { label: 'Formblatt', value: 'formblatt' },
        { label: 'Other', value: 'other' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'sourceToolType',
      type: 'select',
      options: [
        { label: 'Market Research', value: 'marketResearch' },
        { label: 'Specification', value: 'generateSpec' },
        { label: 'Questionnaire', value: 'askQuestions' },
        { label: 'Lieferantenliste', value: 'angebotsDraft' },
        { label: 'Angebotsanfrage', value: 'angebotsAnfrage' },
        { label: 'Angebotsvergleich', value: 'angebotsVergleich' },
        { label: 'Formblatt-Ausfüllung', value: 'fillFormblatt' },
        { label: 'Dokument speichern', value: 'saveDocument' },
        { label: 'Manual', value: 'manual' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'jsonData',
      type: 'json',
      admin: {
        condition: (data) => Boolean(data?.jsonData),
      },
    },
    {
      name: 'workflowStatus',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Entwurf', value: 'draft' },
        { label: 'In Prüfung', value: 'review' },
        { label: 'Überarbeitung', value: 'revision' },
        { label: 'Freigegeben', value: 'approved' },
        { label: 'Final', value: 'final' },
        { label: 'Archiviert', value: 'archived' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'tags',
      type: 'array',
      fields: [{ name: 'tag', type: 'text' }],
    },
  ],
  hooks: {
    beforeDelete: [
      async ({ req, id }) => {
        const doc = await req.payload.findByID({ collection: 'documents', id, req })
        if (doc.attachments?.length) {
          const ids = doc.attachments.map((a: { id: string | number } | string | number) =>
            typeof a === 'object' ? a.id : a,
          )
          await req.payload.delete({
            collection: 'media',
            where: { id: { in: ids } },
            req,
            overrideAccess: true,
          })
        }
      },
    ],
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation !== 'create' || !data?.project) return data

        const project = await req.payload.findByID({
          collection: 'projects',
          id: data.project,
        })

        const projectData = (project.data as Record<string, unknown>) ?? {}
        const settings = (projectData.settings as Record<string, unknown>) ?? {}

        if (!data.category && settings.defaultCategory) {
          data.category = settings.defaultCategory as string
        }

        if (settings.requireApproval) {
          data.workflowStatus = 'draft'
        }

        return data
      },
    ],
  },
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
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { 'project.owner': { equals: user.id } }
    },
  },
}
