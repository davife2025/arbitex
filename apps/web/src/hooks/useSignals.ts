// TODO Session 3: generate + fetch AI signals
import { useSignalsStore } from '@/store/signals'

export function useSignals() {
  const { signals, isGenerating } = useSignalsStore()
  return { signals, isGenerating }
}
