import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { signIn, signUp, signOut } from '../services/auth'
import { runSync, startSync, stopSync } from '../services/sync'
import { useToast } from '../components/Toast'

export default function SyncPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user, loading, configured } = useAuth()
  const status = useSyncStatus()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      void startSync(user.id)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password)
        toast.success('Account created — check your email if confirmation is required')
      } else {
        await signIn(email.trim(), password)
        toast.success('Signed in')
      }
      setEmail('')
      setPassword('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    stopSync()
    await signOut()
    toast.info('Signed out — local data is still here')
  }

  const lastSyncLabel = status.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString()
    : 'never'

  return (
    <>
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>&larr;</button>
        <h1>Cloud Sync</h1>
        <div style={{ width: 48 }} />
      </header>

      <div className="container">
        {!configured && (
          <div className="card mb-4">
            <h2 style={{ marginTop: 0 }}>Supabase not configured</h2>
            <p className="text-secondary">
              Cloud sync is optional. To enable it, set
              {' '}<code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code>,
              then restart the dev server.
            </p>
            <p className="text-secondary">
              See <code>supabase/README.md</code> for full setup instructions.
            </p>
          </div>
        )}

        {configured && loading && (
          <div className="card mb-4">
            <p className="text-secondary">Loading…</p>
          </div>
        )}

        {configured && !loading && !user && (
          <form className="card mb-4" onSubmit={handleSubmit}>
            <h2 style={{ marginTop: 0 }}>
              {mode === 'signin' ? 'Sign in to sync' : 'Create an account'}
            </h2>
            <p className="text-secondary mb-2">
              All of your existing local data — including the test clients —
              will upload automatically once you sign in.
            </p>
            <div className="input-group">
              <label htmlFor="sync-email">Email</label>
              <input
                id="sync-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="sync-password">Password</label>
              <input
                id="sync-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
            >
              {submitting ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-block mt-2"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? 'Need an account? Sign up' : 'Already have one? Sign in'}
            </button>
          </form>
        )}

        {configured && user && (
          <>
            <div className="card mb-4">
              <h2 style={{ marginTop: 0 }}>Sync status</h2>
              <p className="mb-1"><strong>Account:</strong> {user.email}</p>
              <p className="mb-1">
                <strong>Network:</strong> {status.online ? 'online' : 'offline'}
              </p>
              <p className="mb-1">
                <strong>Pending uploads:</strong> {status.pending}
              </p>
              <p className="mb-1">
                <strong>Last sync:</strong> {lastSyncLabel}
              </p>
              {status.error && (
                <p style={{ color: 'var(--danger)' }}>
                  <strong>Error:</strong> {status.error}
                </p>
              )}
              <button
                className="btn btn-primary btn-block mt-2"
                onClick={() => runSync()}
                disabled={status.syncing || !status.online}
              >
                {status.syncing ? 'Syncing…' : 'Sync now'}
              </button>
            </div>

            <button className="btn btn-outline btn-block" onClick={handleSignOut}>
              Sign out
            </button>
          </>
        )}
      </div>
    </>
  )
}
