'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type FormblattTabStatus = 'idle' | 'generating' | 'streaming' | 'done'

export type FormblattTab = {
  tabId: string // Stable key: "doc:<documentId>" or "tmpl:<templateId>"
  templateId: string
  formularNummer: string
  name: string
  status: FormblattTabStatus
  content: unknown
  documentId?: string
  error?: string
}

type FormblattContextType = {
  tabs: FormblattTab[]
  setTabs: (tabs: FormblattTab[] | ((prev: FormblattTab[]) => FormblattTab[])) => void
  activeTab: string | null
  setActiveTab: (tabId: string) => void
  updateTab: (tabId: string, patch: Partial<FormblattTab>) => void
  progress: { current: number; total: number }
  isGenerating: boolean
  setIsGenerating: (v: boolean) => void
}

const FormblattContext = createContext<FormblattContextType | null>(null)

type Props = { children: ReactNode; initialTabs?: FormblattTab[] }

export function FormblattProvider({ children, initialTabs }: Props) {
  const [tabs, setTabs] = useState<FormblattTab[]>(initialTabs ?? [])
  const [activeTab, setActiveTab] = useState<string | null>(initialTabs?.[0]?.tabId ?? null)
  const [isGenerating, setIsGenerating] = useState(false)

  const updateTab = useCallback((tabId: string, patch: Partial<FormblattTab>) => {
    setTabs((prev) =>
      prev.map((t) => (t.tabId === tabId ? { ...t, ...patch } : t)),
    )
  }, [])

  const progress = {
    current: tabs.filter((t) => t.status === 'done').length,
    total: tabs.length,
  }

  return (
    <FormblattContext.Provider
      value={{ tabs, setTabs, activeTab, setActiveTab, updateTab, progress, isGenerating, setIsGenerating }}
    >
      {children}
    </FormblattContext.Provider>
  )
}

export function useFormblatt() {
  const ctx = useContext(FormblattContext)
  if (!ctx) throw new Error('useFormblatt must be used within FormblattProvider')
  return ctx
}
