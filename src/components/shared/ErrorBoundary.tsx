import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-window)',
        }}>
          <div style={{
            textAlign: 'center',
            padding: 40,
            maxWidth: 400,
          }}>
            <h1 style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 8,
            }}>
              Something went wrong
            </h1>
            <p style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginBottom: 24,
            }}>
              Please restart the app to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-on-accent)',
                background: 'var(--color-accent)',
                border: 'none',
                borderRadius: 6,
                cursor: 'default',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
