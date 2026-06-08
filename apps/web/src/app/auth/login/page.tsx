'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm your account.')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">

      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(var(--brand) 1px, transparent 1px), linear-gradient(90deg, var(--brand) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative w-full max-w-sm space-y-6 animate-slide-up">

        {/* Logo */}
        <div className="text-center">
          <div className="font-display font-extrabold text-4xl tracking-tight mb-2">
            <span className="text-brand text-glow-brand">Arbi</span>
            <span className="text-tx-primary">tex</span>
          </div>
          <p className="text-xs font-mono text-tx-tertiary">AI-Powered Trading Infrastructure</p>
        </div>

        {/* Card */}
        <div className="card p-6 space-y-4">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-surface rounded-lg">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className={`py-2 rounded-md text-sm font-medium transition-all ${
                  mode === m ? 'bg-surface-elevated text-tx-primary' : 'text-tx-tertiary hover:text-tx-secondary'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="trader@arbitex.io"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />

          {error && (
            <div className="text-xs font-mono text-danger bg-danger/10 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          {message && (
            <div className="text-xs font-mono text-success bg-success/10 px-3 py-2 rounded-lg">
              {message}
            </div>
          )}

          <Button className="w-full" loading={loading} onClick={handleSubmit}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </div>

        <p className="text-center text-xs font-mono text-tx-tertiary">
          Bitget AI Challenge · Built with Kimi K2
        </p>
      </div>
    </main>
  )
}
