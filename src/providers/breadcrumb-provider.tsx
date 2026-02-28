'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type BreadcrumbItem = {
  label: string
  href?: string
}

type BreadcrumbContextType = {
  items: BreadcrumbItem[]
  setItems: (items: BreadcrumbItem[]) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextType | null>(null)

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItemsState] = useState<BreadcrumbItem[]>([])
  const setItems = useCallback((newItems: BreadcrumbItem[]) => {
    setItemsState(newItems)
  }, [])

  return (
    <BreadcrumbContext.Provider value={{ items, setItems }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumbs() {
  const ctx = useContext(BreadcrumbContext)
  if (!ctx) throw new Error('useBreadcrumbs must be used within BreadcrumbProvider')
  return ctx
}
