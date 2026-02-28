import type { CollectionConfig } from 'payload'
import {
  fristenConfigSchema,
  uiPreferencesSchema,
  vergabestelleDataSchema,
  featureTogglesSchema,
  workflowSettingsSchema,
} from '@/types/user-settings'

export const UserSettings: CollectionConfig = {
  slug: 'user-settings',
  admin: {
    defaultColumns: ['user', 'updatedAt'],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
      admin: { readOnly: true },
    },
    { name: 'fristenConfig', type: 'json' },
    { name: 'uiPreferences', type: 'json' },
    { name: 'vergabestelleData', type: 'json' },
    { name: 'featureToggles', type: 'json' },
    { name: 'workflowSettings', type: 'json' },
  ],
  hooks: {
    beforeChange: [
      ({ req, data }) => {
        if (req.user) {
          data.user = req.user.id
        }
        return data
      },
    ],
    beforeValidate: [
      ({ data }) => {
        if (data?.fristenConfig) fristenConfigSchema.parse(data.fristenConfig)
        if (data?.uiPreferences) uiPreferencesSchema.parse(data.uiPreferences)
        if (data?.vergabestelleData) vergabestelleDataSchema.parse(data.vergabestelleData)
        if (data?.featureToggles) featureTogglesSchema.parse(data.featureToggles)
        if (data?.workflowSettings) workflowSettingsSchema.parse(data.workflowSettings)
        return data
      },
    ],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { user: { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { user: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin'
    },
  },
}
