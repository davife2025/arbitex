'use client'
import { Button } from '@/components/ui/Button'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm animate-slide-up">
        <div className="text-4xl font-mono text-danger">⚠</div>
        <h1 className="text-xl font-display font-bold text-tx-primary">Something went wrong</h1>
        <p className="text-sm font-mono text-tx-tertiary">{error.message}</p>
        {error.digest && (
          <p className="text-xs font-mono text-tx-tertiary">Digest: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <Button size="sm" onClick={reset}>Try again</Button>
          <Button size="sm" variant="secondary" onClick={() => window.location.href = '/dashboard'}>
            Dashboard
          </Button>
        </div>
      </div>
    </main>
  )
}
