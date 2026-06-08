import { create } from 'zustand'
import type { AISignal } from '@arbitex/types'

interface SignalsState {
  signals: AISignal[]
  isGenerating: boolean
  setSignals: (signals: AISignal[]) => void
  setIsGenerating: (isGenerating: boolean) => void
  addSignal: (signal: AISignal) => void
  updateSignal: (id: string, patch: Partial<AISignal>) => void
}

export const useSignalsStore = create<SignalsState>((set) => ({
  signals: [],
  isGenerating: false,
  setSignals: (signals) => set({ signals }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  addSignal: (signal) =>
    set((s) => ({
      // Deduplicate by id
      signals: [signal, ...s.signals.filter((x) => x.id !== signal.id)],
    })),
  updateSignal: (id, patch) =>
    set((s) => ({
      signals: s.signals.map((sig) => (sig.id === id ? { ...sig, ...patch } : sig)),
    })),
}))
