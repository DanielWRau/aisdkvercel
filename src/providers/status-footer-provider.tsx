'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

type StatusFooterContextType = {
  statusText: string
  setStatusText: (text: string) => void
  copyContent: string | null
  setCopyContent: (content: string | null) => void
}

const StatusFooterContext = createContext<StatusFooterContextType | null>(null)

export function StatusFooterProvider({ children }: { children: ReactNode }) {
  const [statusText, setStatusTextRaw] = useState('')
  const [copyContent, setCopyContentRaw] = useState<string | null>(null)

  const setStatusText = useCallback((text: string) => {
    setStatusTextRaw(text)
  }, [])

  const setCopyContent = useCallback((content: string | null) => {
    setCopyContentRaw(content)
  }, [])

  const value = useMemo(
    () => ({ statusText, setStatusText, copyContent, setCopyContent }),
    [statusText, setStatusText, copyContent, setCopyContent],
  )

  return (
    <StatusFooterContext.Provider value={value}>
      {children}
    </StatusFooterContext.Provider>
  )
}

export function useStatusFooter() {
  const ctx = useContext(StatusFooterContext)
  if (!ctx) throw new Error('useStatusFooter must be used within StatusFooterProvider')
  return ctx
}
