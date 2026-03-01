'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

export type WorkspaceTab = 'bedarfsanalyse' | 'marktanalyse' | 'leistungsbeschreibung'

type TabContent = {
  status: 'idle' | 'generating' | 'streaming' | 'done'
  content: unknown
  version: number
}

type UpdateTabOptions = {
  skipVersionBump?: boolean
}

type WorkspaceContextType = {
  activeTab: WorkspaceTab
  setActiveTab: (tab: WorkspaceTab) => void
  tabContents: Record<WorkspaceTab, TabContent>
  updateTabContent: (tab: WorkspaceTab, content: unknown, status: TabContent['status'], options?: UpdateTabOptions) => void
  setTabVersion: (tab: WorkspaceTab, version: number) => void
}

const defaultTabContent: TabContent = { status: 'idle', content: null, version: 0 }

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('bedarfsanalyse')
  const [tabContents, setTabContents] = useState<Record<WorkspaceTab, TabContent>>({
    bedarfsanalyse: { ...defaultTabContent },
    marktanalyse: { ...defaultTabContent },
    leistungsbeschreibung: { ...defaultTabContent },
  })

  const updateTabContent = useCallback(
    (tab: WorkspaceTab, content: unknown, status: TabContent['status'], options?: UpdateTabOptions) => {
      setTabContents((prev) => {
        const existing = prev[tab]
        const version = (status === 'done' && !options?.skipVersionBump)
          ? existing.version + 1
          : existing.version
        // Skip update if nothing meaningful changed to prevent render cascades
        if (existing.status === status && existing.content === content && existing.version === version) {
          return prev
        }
        return {
          ...prev,
          [tab]: { status, content, version },
        }
      })
    },
    [],
  )

  const setTabVersion = useCallback(
    (tab: WorkspaceTab, version: number) => {
      setTabContents((prev) => {
        if (prev[tab].version === version) return prev
        return { ...prev, [tab]: { ...prev[tab], version } }
      })
    },
    [],
  )

  const value = useMemo(
    () => ({ activeTab, setActiveTab, tabContents, updateTabContent, setTabVersion }),
    [activeTab, tabContents, updateTabContent, setTabVersion],
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
