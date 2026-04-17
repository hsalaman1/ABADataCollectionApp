import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const COLORS: Record<ToastKind, string> = {
  success: 'var(--success)',
  error: 'var(--danger)',
  info: 'var(--primary)',
}

const ICONS: Record<ToastKind, ReactNode> = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const t = timers.current.get(id)
    if (t) { clearTimeout(t); timers.current.delete(id) }
  }, [])

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++
    setToasts(prev => [...prev, { id, kind, message }])
    timers.current.set(id, setTimeout(() => dismiss(id), 4000))
  }, [dismiss])

  const ctx: ToastContextValue = {
    success: (msg) => show('success', msg),
    error: (msg) => show('error', msg),
    info: (msg) => show('info', msg),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div
        role="log"
        aria-live="polite"
        aria-label="Notifications"
        style={{
          position: 'fixed',
          bottom: 72, // above bottom nav
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '0 16px',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--surface)',
              color: COLORS[toast.kind],
              border: `1.5px solid ${COLORS[toast.kind]}`,
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 500,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              pointerEvents: 'auto',
              maxWidth: 360,
              width: '100%',
              animation: 'toast-in 0.2s ease',
            }}
          >
            <span style={{ flexShrink: 0 }}>{ICONS[toast.kind]}</span>
            <span style={{ flex: 1, color: 'var(--text-primary)' }}>{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: 2,
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
