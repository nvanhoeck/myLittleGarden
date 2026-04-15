import { AI_BASE_URL, AI_REQUEST_TIMEOUT_MS } from '@/services/ai/aiConfig';
import {
  AiNetworkError,
  AiTimeoutError,
  AiServerDownError,
} from '@/services/ai/AiError';

export async function aiHttpClient(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  let didTimeout = false;
  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, AI_REQUEST_TIMEOUT_MS);

  try {
    const url = AI_BASE_URL + path;
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (response.status >= 500 && response.status < 600) {
      throw new AiServerDownError('Server error: ' + response.status);
    }

    return response;
  } catch (error) {
    if (error instanceof AiServerDownError) {
      throw error;
    }
    if (didTimeout) {
      throw new AiTimeoutError('Request timed out');
    }
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('abort'))
    ) {
      throw new AiTimeoutError('Request aborted');
    }
    throw new AiNetworkError(
      error instanceof Error ? error.message : 'Network request failed',
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
