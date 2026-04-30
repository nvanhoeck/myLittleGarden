import { z } from 'zod';

const positionSchema = z.object({
  plantInstanceId: z.string(),
  positionXInCm: z.number().finite().nonnegative(),
  positionYInCm: z.number().finite().nonnegative(),
});

const scoreSchema = z.object({
  companion: z.number().min(0).max(100),
  spacing: z.number().min(0).max(100),
  sun: z.number().min(0).max(100),
  combative: z.number().min(0).max(100),
  total: z.number().min(0).max(100),
});

const alternativeSchema = z.object({
  id: z.string(),
  label: z.string(),
  summary: z.string(),
  score: scoreSchema,
  positions: z.array(positionSchema),
});

const diagnosticsSchema = z.object({
  warnings: z.array(z.string()),
});

export const optimizeComponentResponseSchema = z.object({
  componentId: z.string(),
  alternatives: z.array(alternativeSchema).min(1).max(5),
  diagnostics: diagnosticsSchema,
});

export type OptimizeComponentResponse = z.infer<typeof optimizeComponentResponseSchema>;
export type OptimizeComponentAlternative = z.infer<typeof alternativeSchema>;
