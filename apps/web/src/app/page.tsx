export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="font-mono text-brand text-sm tracking-widest uppercase">
          Arbitex v0.0.1
        </div>
        <h1 className="text-5xl font-bold tracking-tight">
          AI Trading Infrastructure
        </h1>
        <p className="text-white/50 text-lg">
          Powered by Bitget × Kimi K2
        </p>
        <div className="pt-4">
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-brand text-surface font-semibold rounded-lg hover:bg-brand-dark transition-colors"
          >
            Open Dashboard →
          </a>
        </div>
      </div>
    </main>
  )
}
