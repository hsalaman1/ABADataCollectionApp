import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const colorMap: Record<ToastType, string> = {
    success: 'var(--success)',
    error: 'var(--danger)',
    info: 'var(--primary)',
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 80, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 9999, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              background: colorMap[t.type],
              color: '#fff',
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              maxWidth: 340,
              textAlign: 'center',
              pointerEvents: 'auto',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
