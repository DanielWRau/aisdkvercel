import type { CollectionConfig } from 'payload'

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    useAsTitle: 'name',
  },
  versions: { drafts: true },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'richText' },
    {
      name: 'projectStatus',
      type: 'select',
      label: 'Status',
      defaultValue: 'active',
      options: [
        { label: 'Aktiv', value: 'active' },
        { label: 'Abgeschlossen', value: 'completed' },
        { label: 'Archiviert', value: 'archived' },
      ],
    },
    {
      name: 'settings',
      type: 'group',
      label: 'Projekt-Einstellungen',
      fields: [
        {
          name: 'defaultCategory',
          type: 'select',
          label: 'Standard-Kategorie',
          options: [
            { label: 'Spezifikation', value: 'spec' },
            { label: 'Research', value: 'research' },
            { label: 'Vertrag', value: 'contract' },
            { label: 'Sonstiges', value: 'other' },
          ],
        },
        {
          name: 'allowedFileTypes',
          type: 'select',
          hasMany: true,
          label: 'Erlaubte Dateitypen',
          defaultValue: ['pdf', 'docx', 'txt'],
          options: [
            { label: 'PDF', value: 'pdf' },
            { label: 'Word', value: 'docx' },
            { label: 'Text', value: 'txt' },
            { label: 'Bilder', value: 'images' },
            { label: 'Tabellen', value: 'xlsx' },
          ],
        },
        {
          name: 'requireApproval',
          type: 'checkbox',
          label: 'Freigabe erforderlich',
          defaultValue: false,
        },
        {
          name: 'autoTagging',
          type: 'checkbox',
          label: 'AI Auto-Tagging',
          defaultValue: true,
        },
      ],
    },
    // Reverse relation: alle Dokumente dieses Projekts
    {
      name: 'documents',
      type: 'join',
      collection: 'documents',
      on: 'project',
    },
  ],
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
}
