'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

type AuthContextType = ReturnType<typeof useAuth>

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { authState } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (authState === 'unauthenticated') {
      router.push('/login')
    }
  }, [authState, router])

  if (authState === 'loading' || authState === 'unauthenticated') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    )
  }

  return <>{children}</>
}
