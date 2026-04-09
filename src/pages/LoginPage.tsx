import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, signUp } = useAuth()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/clients'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

    try {
      const result = mode === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password)

      if (result.error) {
        setError(result.error)
      } else if (mode === 'signup') {
        setInfo('Account created. Check your email if confirmation is required, then sign in.')
        setMode('signin')
      } else {
        navigate(from, { replace: true })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page" style={{ maxWidth: 400, margin: '48px auto', padding: 24 }}>
      <h1>{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>

      {!isSupabaseConfigured && (
        <p style={{ color: '#b45309', background: '#fef3c7', padding: 12, borderRadius: 8 }}>
          Supabase is not configured. Copy <code>.env.example</code> to <code>.env.local</code> and
          set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart
          the dev server.
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            style={{ width: '100%', padding: 8 }}
          />
        </label>

        {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
        {info && <p style={{ color: '#047857' }}>{info}</p>}

        <button
          type="submit"
          disabled={submitting || !isSupabaseConfigured}
          style={{ padding: 12, fontSize: 16 }}
        >
          {submitting
            ? 'Please wait…'
            : mode === 'signin'
              ? 'Sign in'
              : 'Sign up'}
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        {mode === 'signin' ? (
          <>
            No account?{' '}
            <button type="button" onClick={() => { setMode('signup'); setError(null); setInfo(null) }}>
              Create one
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button type="button" onClick={() => { setMode('signin'); setError(null); setInfo(null) }}>
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  )
}
