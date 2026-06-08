'use client'
import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="card p-6 space-y-3 text-center">
          <div className="text-danger text-2xl">⚠</div>
          <p className="text-sm font-semibold text-tx-primary">Something went wrong</p>
          <p className="text-xs font-mono text-tx-tertiary line-clamp-2">
            {this.state.error?.message}
          </p>
          <Button size="sm" variant="secondary" onClick={() => this.setState({ hasError: false, error: null })}>
            Retry
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
