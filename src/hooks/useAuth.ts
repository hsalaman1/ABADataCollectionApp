import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getCurrentUser, onAuthChange, isSupabaseConfigured } from '../services/auth'
import { setCurrentOwnerId } from '../db/database'

export interface AuthState {
  user: User | null
  loading: boolean
  configured: boolean
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    let cancelled = false
    getCurrentUser().then(u => {
      if (cancelled) return
      setUser(u)
      setCurrentOwnerId(u?.id ?? null)
      setLoading(false)
    })
    const unsubscribe = onAuthChange(u => {
      setUser(u)
      setCurrentOwnerId(u?.id ?? null)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return { user, loading, configured: isSupabaseConfigured }
}
