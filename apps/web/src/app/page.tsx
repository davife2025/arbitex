import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">

      {/* Grid bg */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(var(--brand) 1px, transparent 1px), linear-gradient(90deg, var(--brand) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Glow orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-[500px] h-48 sm:h-[300px] rounded-full blur-[80px] sm:blur-[120px] opacity-10"
        style={{ background: 'radial-gradient(circle, var(--brand) 0%, transparent 70%)' }}
      />

      <div className="relative text-center space-y-6 sm:space-y-8 animate-slide-up max-w-lg w-full">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/20 bg-brand/5 text-xs font-mono text-brand">
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-brand" />
          Bitget AI Challenge · Kimi K2
        </div>

        {/* Logo */}
        <div>
          <h1 className="text-5xl sm:text-7xl font-display font-extrabold tracking-tight">
            <span className="text-brand text-glow-brand">Arbi</span>
            <span className="text-tx-primary">tex</span>
          </h1>
          <p className="mt-3 text-tx-secondary text-base sm:text-lg font-light max-w-sm mx-auto leading-relaxed">
            AI-powered trading infrastructure.<br />
            Signals by Kimi K2. Executed on Bitget.
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-2 text-xs font-mono">
          {['Live Data','AI Signals','Paper Trade','Alerts','Analytics'].map(f => (
            <span key={f} className="px-2.5 py-1.5 rounded-full bg-surface-card border border-surface-border text-tx-secondary">
              {f}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/dashboard"
            className="px-5 sm:px-6 py-2.5 sm:py-3 bg-brand text-surface font-semibold rounded-xl hover:bg-brand/90 transition-all active:scale-[0.98] text-sm"
          >
            Open Dashboard →
          </Link>
          <Link
            href="/auth/login"
            className="px-5 sm:px-6 py-2.5 sm:py-3 border border-surface-border text-tx-secondary rounded-xl hover:border-surface-border-bright hover:text-tx-primary transition-all text-sm"
          >
            Sign In
          </Link>
        </div>

        <p className="text-xs font-mono text-tx-tertiary">
          Next.js · Fastify · Supabase · Kimi K2
        </p>
      </div>
    </main>
  )
}
