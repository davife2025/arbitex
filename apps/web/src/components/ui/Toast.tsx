'use client'
import { create } from 'zustand'
import { useEffect } from 'react'
import { clsx } from 'clsx'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  add: (toast: Omit<Toast, 'id'>) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (toast) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, toast.duration ?? 4000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// Hook
export const toast = {
  success: (message: string) => useToastStore.getState().add({ type: 'success', message }),
  error: (message: string) => useToastStore.getState().add({ type: 'error', message }),
  warning: (message: string) => useToastStore.getState().add({ type: 'warning', message }),
  info: (message: string) => useToastStore.getState().add({ type: 'info', message }),
}

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const styles: Record<ToastType, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-danger/30 bg-danger/10 text-danger',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-brand/30 bg-brand/10 text-brand',
}

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: () => void }) {
  return (
    <div
      className={clsx(
        'flex items-start gap-3 px-4 py-3 rounded-xl border text-sm font-mono',
        'animate-slide-up shadow-xl backdrop-blur-sm cursor-pointer',
        styles[t.type]
      )}
      onClick={onRemove}
    >
      <span className="font-bold mt-0.5">{icons[t.type]}</span>
      <span className="text-tx-primary flex-1">{t.message}</span>
    </div>
  )
}

export function Toaster() {
  const { toasts, remove } = useToastStore()

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => remove(t.id)} />
      ))}
    </div>
  )
}
