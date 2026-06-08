import { create } from 'zustand'
import type { AISignal } from '@arbitex/types'

interface SignalsState {
  signals: AISignal[]
  isGenerating: boolean
  setSignals: (signals: AISignal[]) => void
  setIsGenerating: (isGenerating: boolean) => void
  addSignal: (signal: AISignal) => void
}

export const useSignalsStore = create<SignalsState>((set) => ({
  signals: [],
  isGenerating: false,
  setSignals: (signals) => set({ signals }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  addSignal: (signal) => set((s) => ({ signals: [signal, ...s.signals] })),
}))
