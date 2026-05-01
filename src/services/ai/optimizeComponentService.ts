import { AiInvalidResponseError } from '@/services/ai/AiError';
import { aiHttpClient } from '@/services/ai/aiHttpClient';
import { optimizeComponentResponseSchema } from '@/schemas/ai/optimizeComponentResponseSchema';
import type { OptimizeComponentRequest } from '@/schemas/ai/optimizeComponentRequestSchema';
import type { OptimizeComponentResponse } from '@/schemas/ai/optimizeComponentResponseSchema';

export const optimizeComponentService = {
  async requestOptimization(
    request: OptimizeComponentRequest,
  ): Promise<OptimizeComponentResponse> {
    const response = await aiHttpClient('/v1/ai/optimize-component', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(request),
    });

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new AiInvalidResponseError('Optimize response is not valid JSON');
    }

    const parsed = optimizeComponentResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new AiInvalidResponseError('Optimize response failed schema validation');
    }

    const requestedIds = new Set(
      request.snapshot.components
        .flatMap((c) => c.plants)
        .map((p) => p.id),
    );

    for (const alt of parsed.data.alternatives) {
      for (const pos of alt.positions) {
        if (!requestedIds.has(pos.plantInstanceId)) {
          throw new AiInvalidResponseError(
            'Optimize response contains unknown plantInstanceId: ' + pos.plantInstanceId,
          );
        }
      }
    }

    return parsed.data;
  },
};