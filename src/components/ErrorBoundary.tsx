import { Component, type ReactNode } from 'react'

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

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
