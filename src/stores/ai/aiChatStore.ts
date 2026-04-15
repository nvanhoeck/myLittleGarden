import { create } from 'zustand';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type AiChatStatus = 'idle' | 'loading' | 'error';

interface AiChatState {
  messages: ChatMessage[];
  status: AiChatStatus;
  error: string | null;
  addMessage: (role: ChatRole, content: string) => void;
  setStatus: (status: AiChatStatus) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

/**
 * Non-persisted Zustand store for the AI chat conversation state.
 * Intentionally ephemeral: each session starts with an empty history.
 */
export const useAiChatStore = create<AiChatState>((set) => ({
  messages: [],
  status: 'idle',
  error: null,
  addMessage: (role, content) =>
    set((state) => ({ messages: [...state.messages, { role, content }] })),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [], status: 'idle', error: null }),
}));
