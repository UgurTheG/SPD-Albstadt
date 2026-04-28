import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Catches render errors from lazy-loaded children (e.g. failed chunk loads)
 * and shows a friendly fallback instead of a blank page.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="w-16 h-16 rounded-full bg-spd-red/10 dark:bg-spd-red/20 flex items-center justify-center mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Etwas ist schiefgelaufen
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
              Die Seite konnte nicht geladen werden. Bitte versuchen Sie es erneut.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-spd-red hover:bg-spd-red-dark text-white font-semibold px-6 py-3 rounded-xl transition-colors cursor-pointer"
            >
              Seite neu laden
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
