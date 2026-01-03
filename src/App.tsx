import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import ClientsPage from './pages/ClientsPage'
import SessionPage from './pages/SessionPage'
import DataPage from './pages/DataPage'
import ClientFormPage from './pages/ClientFormPage'
import SelectClientPage from './pages/SelectClientPage'
import SessionDetailPage from './pages/SessionDetailPage'

function App() {
  const location = useLocation()
  const hideNav = location.pathname.includes('/session/') && !location.pathname.includes('/session/select')

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
        </nav>
      )}
    </>
  )
}

export default App
