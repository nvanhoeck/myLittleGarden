import { AI_HEALTH_CACHE_MS } from '@/services/ai/aiConfig';
import { AiInvalidResponseError } from '@/services/ai/AiError';
import { aiHttpClient } from '@/services/ai/aiHttpClient';
import { withRetry } from '@/services/ai/aiRetry';
import {
  healthResponseSchema,
  type HealthResponse,
} from '@/schemas/ai/healthResponseSchema';

let cachedHealth: HealthResponse | null = null;
let cacheExpiresAt = 0;

export async function getHealth(): Promise<HealthResponse> {
  if (cachedHealth && Date.now() < cacheExpiresAt) {
    return cachedHealth;
  }

  const response = await withRetry(() => aiHttpClient('/v1/ai/health'));

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new AiInvalidResponseError('Health response is not valid JSON');
  }

  const parsed = healthResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new AiInvalidResponseError('Health response failed schema validation');
  }

  cachedHealth = parsed.data;
  cacheExpiresAt = Date.now() + AI_HEALTH_CACHE_MS;
  return cachedHealth;
}
