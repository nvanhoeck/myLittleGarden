import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAiChatStore } from '@/stores/ai/aiChatStore';
import { useGardenStore } from '@/stores/gardenStore';
import { useComponentStore } from '@/stores/componentStore';
import { usePlantStore } from '@/stores/plantStore';
import type { PlantSpecSnapshot } from '@/domain/ai/GardenSnapshot';
import { buildGardenSnapshot } from '@/domain/ai/buildGardenSnapshot';
import { chatService } from '@/services/ai/chatService';
import type { ChatHistoryMessage } from '@/services/ai/chatService';
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
  turnCount: number;
  summaryContext: string | null;
  sendMessage: (text: string) => Promise<void>;
  compactMessages: () => Promise<void>;
}

export function useAiChat(): UseAiChatResult {
  const { t } = useTranslation();
  const messages = useAiChatStore((s) => s.messages);
  const status = useAiChatStore((s) => s.status);
  const error = useAiChatStore((s) => s.error);
  const turnCount = useAiChatStore((s) => s.turnCount);
  const summaryContext = useAiChatStore((s) => s.summaryContext);
  const addMessage = useAiChatStore((s) => s.addMessage);
  const setStatus = useAiChatStore((s) => s.setStatus);
  const setError = useAiChatStore((s) => s.setError);
  const incrementTurnCount = useAiChatStore((s) => s.incrementTurnCount);
  const resetForCompact = useAiChatStore((s) => s.resetForCompact);

  const translateError = useCallback(
    (e: unknown): string => {
      const detail = e instanceof AiError
        ? ' (' + e.code + ': ' + e.message + ')'
        : e instanceof Error ? ' (' + e.message + ')' : '';
      if (e instanceof AiNetworkError) return t('ai.shared.errors.network') + detail;
      if (e instanceof AiTimeoutError) return t('ai.shared.errors.timeout') + detail;
      if (e instanceof AiServerDownError) return t('ai.shared.errors.serverDown') + detail;
      if (e instanceof AiInvalidResponseError) return t('ai.shared.errors.invalidResponse') + detail;
      if (e instanceof AiError) return t('ai.shared.errors.unknown') + detail;
      return t('ai.shared.errors.unknown') + detail;
    },
    [t],
  );

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const gardenState = useGardenStore.getState();
      const componentsState = useComponentStore.getState();
      const plantState = usePlantStore.getState();

      const uniquePlantIds = new Set(
        componentsState.components.flatMap((c) => c.plants.map((p) => p.plantId)),
      );
      const plantSpecs: PlantSpecSnapshot[] = [...uniquePlantIds].flatMap((id) => {
        const plant = plantState.getPlantById(id);
        if (!plant) return [];
        return [{
          plantId: plant.id,
          name: plant.nameNl,
          sunRequirement: plant.sun === 'full' ? 'fullSun' : plant.sun === 'partial' ? 'partialShade' : 'fullShade',
          spacingInCm: plant.spacingRadiusCm,
          heightInCm: null,
          waterNeeds: plant.water === 'moderate' ? 'medium' : plant.water,
          frostTolerant: plant.frostTolerance !== 'tender',
          plantingStyle: plant.plantingStyle ?? null,
          goodCompanions: plant.companions.map((c) => c.plantId),
          badCompanions: plant.combatives.map((c) => c.plantId),
        } satisfies PlantSpecSnapshot];
      });

      const snapshot = buildGardenSnapshot(
        {
          gardenWidth: gardenState.gardenWidth,
          gardenHeight: gardenState.gardenHeight,
          sunDirection: gardenState.sunDirection,
          springFrostDate: gardenState.springFrostDate,
          fallFrostDate: gardenState.fallFrostDate,
        },
        componentsState.components,
        plantSpecs,
      );

      addMessage('user', trimmed);
      setStatus('loading');
      setError(null);

      // Read fresh state AFTER addMessage so the new user message is included.
      const rawHistory: ChatHistoryMessage[] = useAiChatStore
        .getState()
        .messages.map((m) => ({ role: m.role, content: m.content }));

      // Prefix summary context as a synthetic exchange so the AI retains
      // awareness of compacted earlier turns without resending the full log.
      const currentSummary = useAiChatStore.getState().summaryContext;
      const history: ChatHistoryMessage[] = currentSummary
        ? [
            { role: 'user', content: '[Samenvatting van eerdere gesprekken]' },
            { role: 'assistant', content: currentSummary },
            ...rawHistory,
          ]
        : rawHistory;

      try {
        const reply = await chatService.sendMessage({
          message: trimmed,
          snapshot,
          history,
        });
        addMessage('assistant', reply);
        incrementTurnCount();
        setStatus('idle');
      } catch (e) {
        console.error('mylittlegarden: sendMessage failed', e);
        setError(translateError(e));
        setStatus('error');
      }
    },
    [addMessage, setStatus, setError, incrementTurnCount, translateError],
  );

  const compactMessages = useCallback(async (): Promise<void> => {
    const currentMessages = useAiChatStore.getState().messages;
    if (currentMessages.length === 0) return;
    setStatus('compacting');
    setError(null);
    try {
      const history: ChatHistoryMessage[] = currentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const summary = await chatService.compactConversation(history);
      resetForCompact(summary);
    } catch (e) {
      console.error('mylittlegarden: compactMessages failed', e);
      setError(translateError(e));
      setStatus('error');
    }
  }, [setStatus, setError, resetForCompact, translateError]);

  return { messages, status, error, turnCount, summaryContext, sendMessage, compactMessages };
}
