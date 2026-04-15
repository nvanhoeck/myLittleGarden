import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  model: z.string(),
  features: z.object({
    chat: z.boolean(),
    optimize: z.boolean(),
  }),
  maxSnapshotPlants: z.number().int().positive(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
