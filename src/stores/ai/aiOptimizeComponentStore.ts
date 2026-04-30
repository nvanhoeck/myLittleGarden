import { create } from 'zustand';
import type { OptimizeComponentAlternative } from '@/schemas/ai/optimizeComponentResponseSchema';

export type AiOptimizeComponentStatus = 'idle' | 'loading' | 'error' | 'success';

interface AiOptimizeComponentState {
  status: AiOptimizeComponentStatus;
  alternatives: OptimizeComponentAlternative[] | null;
  selectedIndex: number;
  error: string | null;
  setLoading: () => void;
  setSuccess: (alternatives: OptimizeComponentAlternative[]) => void;
  setError: (message: string) => void;
  setSelectedIndex: (index: number) => void;
  reset: () => void;
}

/**
 * Non-persisted Zustand store for the per-component placement optimization
 * flow. State is intentionally ephemeral so each session starts clean.
 */
export const useAiOptimizeComponentStore = create<AiOptimizeComponentState>((set) => ({
  status: 'idle',
  alternatives: null,
  selectedIndex: 0,
  error: null,
  setLoading: () =>
    set({ status: 'loading', alternatives: null, selectedIndex: 0, error: null }),
  setSuccess: (alternatives) =>
    set({ status: 'success', alternatives, selectedIndex: 0, error: null }),
  setError: (message) =>
    set({ status: 'error', error: message }),
  setSelectedIndex: (index) => set({ selectedIndex: index }),
  reset: () =>
    set({ status: 'idle', alternatives: null, selectedIndex: 0, error: null }),
}));
