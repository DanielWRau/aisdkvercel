'use client'

import { useState, useEffect } from 'react'
import { getUserSettings } from '@/actions/user-settings'
import { DEFAULT_FRISTEN_CONFIG, type FristenConfig } from '@/types/user-settings'

export function useUserSettings() {
  const [fristenConfig, setFristenConfig] = useState<FristenConfig>(DEFAULT_FRISTEN_CONFIG)

  useEffect(() => {
    getUserSettings().then((settings) => {
      if (settings?.fristenConfig) {
        setFristenConfig({
          ...DEFAULT_FRISTEN_CONFIG,
          ...settings.fristenConfig as Partial<FristenConfig>,
        })
      }
    }).catch(() => {
      // Use defaults on error
    })
  }, [])

  return { fristenConfig }
}
