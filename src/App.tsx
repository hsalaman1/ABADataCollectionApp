import { lazy, Suspense } from 'react'
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

const ClientsPage = lazy(() => import('./pages/ClientsPage'))
const SessionPage = lazy(() => import('./pages/SessionPage'))
const DataPage = lazy(() => import('./pages/DataPage'))
const ClientFormPage = lazy(() => import('./pages/ClientFormPage'))
const SelectClientPage = lazy(() => import('./pages/SelectClientPage'))
const SessionDetailPage = lazy(() => import('./pages/SessionDetailPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const BackfillSessionPage = lazy(() => import('./pages/BackfillSessionPage'))

// Parent portal pages (Milestone 5)
const ParentDashboardPage = lazy(() => import('./pages/parent/ParentDashboardPage'))

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--text-secondary)' }}>Loading…</div>
    </div>
  )
}

function ClinicianRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ClientsPage />} />
      <Route path="/clients" element={<ClientsPage />} />
      <Route path="/clients/new" element={<ClientFormPage />} />
      <Route path="/clients/:id/edit" element={<ClientFormPage />} />
      <Route path="/session/select" element={<SelectClientPage />} />
      <Route path="/session/:clientId" element={<SessionPage />} />
      <Route path="/session/:clientId/backfill" element={<BackfillSessionPage />} />
      <Route path="/data" element={<DataPage />} />
      <Route path="/data/:clientId" element={<DataPage />} />
      <Route path="/data/:clientId/session/:sessionId" element={<SessionDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ParentRoutes() {
  return (
    <Routes>
      <Route path="/parent" element={<ParentDashboardPage />} />
      <Route path="*" element={<Navigate to="/parent" replace />} />
    </Routes>
  )
}

function ClinicianNav({ hideNav }: { hideNav: boolean }) {
  if (hideNav) return null
  return (
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
  )
}

function AppRoutes() {
  const location = useLocation()
  const { user, role, loading } = useAuth()
  const hideNav = location.pathname.includes('/session/') && !location.pathname.includes('/session/select')

  if (loading) return <PageLoader />

  // Unauthenticated: show auth pages
  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    )
  }

  if (role === 'parent') {
    return (
      <Suspense fallback={<PageLoader />}>
        <main className="main-content">
          <ParentRoutes />
        </main>
      </Suspense>
    )
  }

  return (
    <>
      <main className="main-content">
        <Suspense fallback={<PageLoader />}>
          <ClinicianRoutes />
        </Suspense>
      </main>
      <ClinicianNav hideNav={hideNav} />
    </>
  )
}

export default function App() {
  return <AppRoutes />
}
