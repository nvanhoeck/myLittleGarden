import type { GardenSnapshot } from '@/domain/ai/GardenSnapshot';

/**
 * Arguments for sending a chat message.
 */
export interface SendChatMessageArgs {
  message: string;
  snapshot: GardenSnapshot;
}

const MOCK_DELAY_MS = 500;

/**
 * Mock chat service. Returns a deterministic reply after a short delay.
 * Will be replaced in step D12 with a real POST /v1/ai/chat call.
 */
export const chatService = {
  async sendMessage({ message }: SendChatMessageArgs): Promise<string> {
    await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    return `Mock antwoord voor: ${message}`;
  },
};
