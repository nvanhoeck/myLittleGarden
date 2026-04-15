import { AI_MAX_RETRIES } from '@/services/ai/aiConfig';
import { AiNetworkError, AiTimeoutError } from '@/services/ai/AiError';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = AI_MAX_RETRIES,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof AiNetworkError || error instanceof AiTimeoutError;
      if (!retryable || attempt === maxRetries) {
        throw error;
      }
      await sleep(200 * Math.pow(2, attempt));
    }
  }
  throw lastError;
}
