import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: 32,
          gap: 16,
          textAlign: 'center',
          background: 'var(--background)',
          color: 'var(--text-primary)',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 300 }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{ marginTop: 8 }}
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
