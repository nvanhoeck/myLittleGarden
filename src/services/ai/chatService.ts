import type { GardenSnapshot } from '@/domain/ai/GardenSnapshot';
import { GARDEN_SNAPSHOT_VERSION } from '@/domain/ai/GardenSnapshot';
import { AiInvalidResponseError } from '@/services/ai/AiError';
import { aiHttpClient } from '@/services/ai/aiHttpClient';
import { withRetry } from '@/services/ai/aiRetry';
import { chatResponseSchema } from '@/schemas/ai/chatResponseSchema';
import type { ChatRequest } from '@/schemas/ai/chatRequestSchema';

/**
 * A single message in the chat conversation history.
 */
export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Arguments for sending a chat message.
 *
 * - message: the new user message (already added to the store).
 * - snapshot: a serialized snapshot of the garden for context.
 * - history: the full ordered conversation history including the new
 *   user message. The backend uses this to maintain conversation context.
 */
export interface SendChatMessageArgs {
  message: string;
  snapshot: GardenSnapshot;
  history: ChatHistoryMessage[];
}

// Minimal valid snapshot used for compact calls — the backend requires the
// field but the compaction prompt does not need real garden data.
const COMPACT_SNAPSHOT_STUB: GardenSnapshot = {
  snapshotVersion: GARDEN_SNAPSHOT_VERSION,
  garden: {
    widthInMeters: 0,
    heightInMeters: 0,
    sunDirection: null,
    springFrostDate: null,
    fallFrostDate: null,
  },
  components: [],
};

/**
 * Real chat service. POSTs to /v1/ai/chat with the garden snapshot and the
 * full conversation history. Retries network/timeout failures and validates
 * the response with Zod.
 */
export const chatService = {
  async sendMessage({
    snapshot,
    history,
  }: SendChatMessageArgs): Promise<string> {
    const body: ChatRequest = {
      snapshot,
      messages: history,
      stream: false,
      locale: 'nl',
    };

    const response = await withRetry(() =>
      aiHttpClient('/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      }),
    );

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      console.error('mylittlegarden: chat response is not valid JSON');
      throw new AiInvalidResponseError('Chat response is not valid JSON');
    }

    const parsed = chatResponseSchema.safeParse(json);
    if (!parsed.success) {
      console.error('mylittlegarden: chat response failed schema validation', parsed.error);
      throw new AiInvalidResponseError('Chat response failed schema validation');
    }

    return parsed.data.reply;
  },

  async compactConversation(messages: ChatHistoryMessage[]): Promise<string> {
    const summarizeInstruction: ChatHistoryMessage = {
      role: 'user',
      content:
        'Maak een beknopte Nederlandse samenvatting van dit gesprek. ' +
        'Geef alleen de samenvatting terug, zonder inleiding of afsluiting.',
    };
    const body: ChatRequest = {
      snapshot: COMPACT_SNAPSHOT_STUB,
      messages: [...messages, summarizeInstruction],
      stream: false,
      locale: 'nl',
    };

    const response = await withRetry(() =>
      aiHttpClient('/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      }),
    );

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      console.error('mylittlegarden: compact response is not valid JSON');
      throw new AiInvalidResponseError('Compact response is not valid JSON');
    }

    const parsed = chatResponseSchema.safeParse(json);
    if (!parsed.success) {
      console.error('mylittlegarden: compact response failed schema validation', parsed.error);
      throw new AiInvalidResponseError('Compact response failed schema validation');
    }

    return parsed.data.reply;
  },
};
