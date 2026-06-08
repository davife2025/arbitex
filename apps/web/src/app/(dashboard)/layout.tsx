import { Sidebar } from '@/components/Sidebar'
import { TickerBar } from '@/components/trading/TickerBar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TickerBar />
        <main className="flex-1 p-5 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
