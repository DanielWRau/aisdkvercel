'use server'

import { getPayloadClient } from '@/lib/payload'
import { requireAuth } from '@/lib/auth'
import type { FristenConfig, UiPreferences, VergabestelleData, FeatureToggles, WorkflowSettingsData } from '@/types/user-settings'

export async function getUserSettings() {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'user-settings',
    where: { user: { equals: user.id } },
    limit: 1,
    user,
  })
  return result.docs[0] ?? null
}

export async function getUiPreferences(): Promise<UiPreferences | null> {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'user-settings',
    where: { user: { equals: user.id } },
    select: { uiPreferences: true },
    limit: 1,
    user,
  })
  return (result.docs[0]?.uiPreferences as UiPreferences) ?? null
}

export async function getVergabestelleData(): Promise<VergabestelleData | null> {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'user-settings',
    where: { user: { equals: user.id } },
    select: { vergabestelleData: true },
    limit: 1,
    user,
  })
  return (result.docs[0]?.vergabestelleData as VergabestelleData) ?? null
}

export async function getWorkflowSettings(): Promise<WorkflowSettingsData | null> {
  const user = await requireAuth()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'user-settings',
    where: { user: { equals: user.id } },
    select: { workflowSettings: true },
    limit: 1,
    user,
  })
  return (result.docs[0]?.workflowSettings as WorkflowSettingsData) ?? null
}

export async function updateUserSettings(data: {
  fristenConfig?: FristenConfig
  uiPreferences?: UiPreferences
  vergabestelleData?: VergabestelleData
  featureToggles?: FeatureToggles
  workflowSettings?: WorkflowSettingsData
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  const payload = await getPayloadClient()

  try {
    const existing = await payload.find({
      collection: 'user-settings',
      where: { user: { equals: user.id } },
      limit: 1,
      user,
    })

    if (existing.docs[0]) {
      await payload.update({
        collection: 'user-settings',
        id: existing.docs[0].id,
        data,
        user,
      })
    } else {
      await payload.create({
        collection: 'user-settings',
        data: { ...data, user: user.id },
        user,
      })
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Fehler beim Speichern der Einstellungen',
    }
  }
}
