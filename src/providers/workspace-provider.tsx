'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

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
      setTabContents((prev) => ({
        ...prev,
        [tab]: {
          status,
          content,
          version: (status === 'done' && !options?.skipVersionBump)
            ? prev[tab].version + 1
            : prev[tab].version,
        },
      }))
      // Auto-switch tab on 'done' or 'streaming'
      if (status === 'done' || status === 'streaming') {
        setActiveTab(tab)
      }
    },
    [],
  )

  const setTabVersion = useCallback(
    (tab: WorkspaceTab, version: number) => {
      setTabContents((prev) => ({
        ...prev,
        [tab]: { ...prev[tab], version },
      }))
    },
    [],
  )

  return (
    <WorkspaceContext.Provider
      value={{ activeTab, setActiveTab, tabContents, updateTabContent, setTabVersion }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
