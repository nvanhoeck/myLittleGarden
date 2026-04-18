import type { GardenSnapshot } from '@/domain/ai/GardenSnapshot';
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
      throw new AiInvalidResponseError('Chat response is not valid JSON');
    }

    const parsed = chatResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new AiInvalidResponseError('Chat response failed schema validation');
    }

    return parsed.data.reply;
  },
};
