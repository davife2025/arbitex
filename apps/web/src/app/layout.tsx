import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Arbitex — AI Trading Infrastructure',
  description: 'AI-powered trading platform built on Bitget',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface text-white antialiased">{children}</body>
    </html>
  )
}
