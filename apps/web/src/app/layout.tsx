import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'Arbitex — AI Trading Infrastructure',
  description: 'AI-powered trading platform built on Bitget',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
