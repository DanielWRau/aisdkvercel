import type { CollectionConfig } from 'payload'

export const FormTemplates: CollectionConfig = {
  slug: 'form-templates',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['formularNummer', 'name', 'pflicht', 'sortOrder', 'updatedAt'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'formularNummer', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'sammlung',
      type: 'text',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Formblatt-Sammlung, z.B. "BerlAVG", "VHL Bayern", "VHB Bayern", "VHB Bund"',
      },
    },
    {
      name: 'labels',
      type: 'array',
      fields: [{ name: 'label', type: 'text', required: true }],
    },
    {
      name: 'promptHinweise',
      type: 'textarea',
      admin: { description: 'LLM-spezifische Anweisungen (nur serverseitig genutzt)' },
    },
    { name: 'anwendungsschwelle', type: 'number', admin: { description: 'EUR netto' } },
    { name: 'pflicht', type: 'checkbox', defaultValue: true },
    { name: 'sortOrder', type: 'number', defaultValue: 0 },
    {
      name: 'structure',
      type: 'json',
      admin: {
        description:
          'Formularstruktur: Abschnitte, Festtexte, Felder (FormStructure). Version in structure.schemaVersion.',
      },
    },
    {
      name: 'seedChecksum',
      type: 'text',
      hidden: true,
      admin: {
        readOnly: true,
        description: 'SHA-256 der letzten Seed-Daten. Wird nur vom Seed-Prozess geschrieben.',
      },
    },
  ],
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
}
