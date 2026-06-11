import { Sidebar } from '@/components/Sidebar'
import { MobileNav } from '@/components/MobileNav'
import { TickerBar } from '@/components/trading/TickerBar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-screen">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TickerBar />
        {/* pb-20 on mobile to clear bottom nav */}
        <main className="flex-1 p-3 sm:p-4 lg:p-5 overflow-auto pb-20 lg:pb-5">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
