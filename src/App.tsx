import { useEffect, useState, type ReactNode } from 'react'
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom'
import ClientsPage from './pages/ClientsPage'
import SessionPage from './pages/SessionPage'
import DataPage from './pages/DataPage'
import ClientFormPage from './pages/ClientFormPage'
import SelectClientPage from './pages/SelectClientPage'
import SessionDetailPage from './pages/SessionDetailPage'
import LoginPage from './pages/LoginPage'
import { useAuth } from './lib/useAuth'
import { migrateLocalToCloud, pullAll, flushQueue } from './lib/sync'
import { isSupabaseConfigured } from './lib/supabase'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (!isSupabaseConfigured) {
    // Fall back to local-only mode when Supabase is not configured so
    // developers can still work on unrelated UI without env vars.
    return <>{children}</>
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

function App() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const hideNav =
    location.pathname === '/login' ||
    (location.pathname.includes('/session/') && !location.pathname.includes('/session/select'))

  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return

    let cancelled = false
    const run = async () => {
      setSyncing(true)
      try {
        await migrateLocalToCloud(user.id)
        await flushQueue()
        await pullAll(user.id)
      } finally {
        if (!cancelled) setSyncing(false)
      }
    }
    run()

    const onOnline = () => {
      flushQueue().then(() => pullAll(user.id))
    }
    window.addEventListener('online', onOnline)

    return () => {
      cancelled = true
      window.removeEventListener('online', onOnline)
    }
  }, [user])

  return (
    <>
      {syncing && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: '#2563eb',
            color: 'white',
            padding: '4px 12px',
            fontSize: 12,
            textAlign: 'center',
            zIndex: 1000,
          }}
        >
          Syncing…
        </div>
      )}

      <main className="main-content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireAuth><ClientsPage /></RequireAuth>} />
          <Route path="/clients" element={<RequireAuth><ClientsPage /></RequireAuth>} />
          <Route path="/clients/new" element={<RequireAuth><ClientFormPage /></RequireAuth>} />
          <Route path="/clients/:id/edit" element={<RequireAuth><ClientFormPage /></RequireAuth>} />
          <Route path="/session/select" element={<RequireAuth><SelectClientPage /></RequireAuth>} />
          <Route path="/session/:clientId" element={<RequireAuth><SessionPage /></RequireAuth>} />
          <Route path="/data" element={<RequireAuth><DataPage /></RequireAuth>} />
          <Route path="/data/:clientId" element={<RequireAuth><DataPage /></RequireAuth>} />
          <Route
            path="/data/:clientId/session/:sessionId"
            element={<RequireAuth><SessionDetailPage /></RequireAuth>}
          />
        </Routes>
      </main>

      {!hideNav && (
        <nav className="bottom-nav">
          <NavLink to="/clients" className={({ isActive }) => isActive ? 'active' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Clients
          </NavLink>
          <NavLink to="/session/select" className={({ isActive }) => isActive ? 'active' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Session
          </NavLink>
          <NavLink to="/data" className={({ isActive }) => isActive ? 'active' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Data
          </NavLink>
          {user && isSupabaseConfigured && (
            <button
              type="button"
              onClick={() => { signOut() }}
              className="sign-out-btn"
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                padding: 0,
                font: 'inherit',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          )}
        </nav>
      )}
    </>
  )
}

export default App
