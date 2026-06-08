export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
        <span className="text-xs font-mono text-tx-tertiary">Loading Arbitex...</span>
      </div>
    </div>
  )
}
