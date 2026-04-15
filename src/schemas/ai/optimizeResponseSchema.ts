import { z } from 'zod';

const moveSchema = z.object({
  plantInstanceId: z.string(),
  fromComponentId: z.string(),
  toComponentId: z.string(),
  toPositionXInCm: z.number(),
  toPositionYInCm: z.number(),
  reason: z.string(),
});

const removalSchema = z.object({
  plantInstanceId: z.string(),
  reason: z.string(),
});

const scoreSchema = z.object({
  before: z.number(),
  after: z.number(),
  delta: z.number(),
});

const diagnosticsSchema = z.object({
  modelWarnings: z.array(z.string()),
});

export const optimizeResponseSchema = z.object({
  moves: z.array(moveSchema),
  removals: z.array(removalSchema),
  additions: z.array(z.never()).max(0),
  score: scoreSchema,
  summary: z.string(),
  diagnostics: diagnosticsSchema,
});

export type OptimizeResponse = z.infer<typeof optimizeResponseSchema>;
