import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './ErrorState'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary caught an error]', error, errorInfo)
    }

    // Tangani kegagalan lazy chunk setelah update versi baru
    const isChunkError =
      error.message?.includes('dynamically imported module') ||
      error.message?.includes('Failed to fetch') ||
      error.name === 'ChunkLoadError'

    const RELOAD_KEY = 'qaryapp:chunk_reload'
    if (isChunkError && typeof window !== 'undefined') {
      try {
        if (!sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, 'true')
          window.location.reload()
          return
        }
      } catch {
        // Abaikan bila sessionStorage tidak tersedia
      }
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-bg text-text">
          <ErrorState
            title="Terjadi kesalahan"
            description="Terjadi kendala yang tidak terduga pada halaman ini. Anda dapat mencoba memuat ulang aplikasi."
            onRetry={this.handleReload}
            retryText="Muat ulang halaman"
          />
        </div>
      )
    }

    return this.props.children
  }
}
