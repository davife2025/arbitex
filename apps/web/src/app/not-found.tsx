import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4 animate-slide-up">
        <div className="text-6xl font-mono font-bold text-tx-tertiary">404</div>
        <h1 className="text-xl font-display font-bold text-tx-primary">Page not found</h1>
        <p className="text-sm font-mono text-tx-tertiary">This route doesn't exist in Arbitex.</p>
        <Link
          href="/dashboard"
          className="inline-block px-5 py-2.5 bg-brand text-surface text-sm font-semibold rounded-xl hover:bg-brand/90 transition-all"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  )
}
