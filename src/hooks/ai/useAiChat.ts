import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAiChatStore } from '@/stores/ai/aiChatStore';
import { useGardenStore } from '@/stores/gardenStore';
import { useComponentStore } from '@/stores/componentStore';
import { buildGardenSnapshot } from '@/domain/ai/buildGardenSnapshot';
import { chatService } from '@/services/ai/chatService';
import {
  AiError,
  AiNetworkError,
  AiTimeoutError,
  AiServerDownError,
  AiInvalidResponseError,
} from '@/services/ai/AiError';

interface UseAiChatResult {
  messages: ReturnType<typeof useAiChatStore.getState>['messages'];
  status: ReturnType<typeof useAiChatStore.getState>['status'];
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
}

/**
 * Hook that owns the chat side-effects: snapshotting the garden, calling
 * the chat service, and updating the non-persisted chat store.
 */
export function useAiChat(): UseAiChatResult {
  const { t } = useTranslation();
  const messages = useAiChatStore((s) => s.messages);
  const status = useAiChatStore((s) => s.status);
  const error = useAiChatStore((s) => s.error);
  const addMessage = useAiChatStore((s) => s.addMessage);
  const setStatus = useAiChatStore((s) => s.setStatus);
  const setError = useAiChatStore((s) => s.setError);

  const translateError = useCallback(
    (e: unknown): string => {
      if (e instanceof AiNetworkError) return t('ai.shared.errors.network');
      if (e instanceof AiTimeoutError) return t('ai.shared.errors.timeout');
      if (e instanceof AiServerDownError) return t('ai.shared.errors.serverDown');
      if (e instanceof AiInvalidResponseError) return t('ai.shared.errors.invalidResponse');
      if (e instanceof AiError) return t('ai.shared.errors.unknown');
      return t('ai.shared.errors.unknown');
    },
    [t],
  );

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const gardenState = useGardenStore.getState();
      const componentsState = useComponentStore.getState();
      const snapshot = buildGardenSnapshot(
        {
          gardenWidth: gardenState.gardenWidth,
          gardenHeight: gardenState.gardenHeight,
          sunDirection: gardenState.sunDirection,
          springFrostDate: gardenState.springFrostDate,
          fallFrostDate: gardenState.fallFrostDate,
        },
        componentsState.components,
      );

      addMessage('user', trimmed);
      setStatus('loading');
      setError(null);

      try {
        const reply = await chatService.sendMessage({ message: trimmed, snapshot });
        addMessage('assistant', reply);
        setStatus('idle');
      } catch (e) {
        setError(translateError(e));
        setStatus('error');
      }
    },
    [addMessage, setStatus, setError, translateError],
  );

  return { messages, status, error, sendMessage };
}
