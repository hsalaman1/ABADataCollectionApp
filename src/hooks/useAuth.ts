import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type UserRole = 'clinician' | 'parent'

interface AuthState {
  user: User | null
  role: UserRole
  loading: boolean
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole>('clinician')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setRole((data.session?.user?.user_metadata?.role as UserRole) ?? 'clinician')
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setRole((session?.user?.user_metadata?.role as UserRole) ?? 'clinician')
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return { user, role, loading }
}
