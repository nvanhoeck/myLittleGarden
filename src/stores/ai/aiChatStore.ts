import { create } from 'zustand';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type AiChatStatus = 'idle' | 'loading' | 'error' | 'compacting';
export type AiChatMode = 'normal' | 'optimization' | null;

interface AiChatState {
  messages: ChatMessage[];
  status: AiChatStatus;
  error: string | null;
  turnCount: number;
  summaryContext: string | null;
  chatMode: AiChatMode;
  addMessage: (role: ChatRole, content: string) => void;
  setStatus: (status: AiChatStatus) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  incrementTurnCount: () => void;
  resetForCompact: (summary: string) => void;
  setChatMode: (mode: 'normal' | 'optimization') => void;
}

/**
 * Non-persisted Zustand store for the AI chat conversation state.
 * Intentionally ephemeral: each session starts with an empty history.
 */
export const useAiChatStore = create<AiChatState>((set) => ({
  messages: [],
  status: 'idle',
  error: null,
  turnCount: 0,
  summaryContext: null,
  chatMode: null,
  addMessage: (role, content) =>
    set((state) => ({ messages: [...state.messages, { role, content }] })),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [], status: 'idle', error: null, turnCount: 0, summaryContext: null }),
  setChatMode: (mode) => set({ chatMode: mode }),
  incrementTurnCount: () => set((state) => ({ turnCount: state.turnCount + 1 })),
  resetForCompact: (summary) => set({ messages: [], status: 'idle', error: null, turnCount: 0, summaryContext: summary }),
}));
