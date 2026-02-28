'use client'

import { useState, useEffect, useCallback } from 'react'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

type User = {
  id: string | number
  email: string
  role?: string
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [user, setUser] = useState<User | null>(null)

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        // Payload CMS v3 returns { user: ... } from /api/users/me
        const user = data.user ?? (data.id ? data : null)
        if (user) {
          setUser(user)
          setAuthState('authenticated')
          return
        }
      }
      // Clear stale cookie so middleware won't redirect /login back here
      document.cookie = 'payload-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      setUser(null)
      setAuthState('unauthenticated')
    } catch {
      document.cookie = 'payload-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      setUser(null)
      setAuthState('unauthenticated')
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Anmeldung fehlgeschlagen')
      }

      await checkSession()
    },
    [checkSession],
  )

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      setUser(null)
      setAuthState('unauthenticated')
    }
  }, [])

  const userName = user?.email?.split('@')[0] ?? ''

  return {
    authState,
    user,
    userName,
    handleLogin,
    handleLogout,
    checkSession,
  }
}
