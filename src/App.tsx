import { useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import ClientsPage from './pages/ClientsPage'
import SessionPage from './pages/SessionPage'
import DataPage from './pages/DataPage'
import ClientFormPage from './pages/ClientFormPage'
import SelectClientPage from './pages/SelectClientPage'
import SessionDetailPage from './pages/SessionDetailPage'
import SyncPage from './pages/SyncPage'
import { useTheme } from './hooks/useTheme'
import { useToast } from './components/Toast'
import { useAuth } from './hooks/useAuth'
import { useSyncStatus } from './hooks/useSyncStatus'
import { startSync } from './services/sync'
import { isBackupDue } from './utils/backup'

function App() {
  const location = useLocation()
  const hideNav = location.pathname.includes('/session/') && !location.pathname.includes('/session/select')
  const { theme, toggle } = useTheme()
  const toast = useToast()
  const { user, configured } = useAuth()
  const sync = useSyncStatus()

  useEffect(() => {
    if (user) void startSync(user.id)
  }, [user])

  useEffect(() => {
    if (!isBackupDue()) return
    const id = setTimeout(() => {
      toast.info('Back up your data — tap to download')
    }, 2000)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ClientsPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/new" element={<ClientFormPage />} />
          <Route path="/clients/:id/edit" element={<ClientFormPage />} />
          <Route path="/session/select" element={<SelectClientPage />} />
          <Route path="/session/:clientId" element={<SessionPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/data/:clientId" element={<DataPage />} />
          <Route path="/data/:clientId/session/:sessionId" element={<SessionDetailPage />} />
          <Route path="/sync" element={<SyncPage />} />
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
          {configured && (
            <NavLink to="/sync" className={({ isActive }) => isActive ? 'active' : ''}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                {user && sync.pending > 0 && (
                  <span
                    aria-label={`${sync.pending} pending`}
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -8,
                      background: 'var(--danger)',
                      color: 'white',
                      borderRadius: 10,
                      fontSize: 10,
                      lineHeight: 1,
                      padding: '2px 5px',
                      fontWeight: 700,
                    }}
                  >
                    {sync.pending}
                  </span>
                )}
                {user && sync.pending === 0 && !sync.error && (
                  <span
                    aria-label="synced"
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: -4,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: sync.online ? 'var(--success)' : 'var(--text-secondary)',
                    }}
                  />
                )}
              </span>
              Sync
            </NavLink>
          )}
          <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 64, minHeight: 'var(--touch-target)', padding: '4px 12px', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', gap: 4 }}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </nav>
      )}
    </>
  )
}

export default App
