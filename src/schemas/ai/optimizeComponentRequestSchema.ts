import { z } from 'zod';
import { gardenSnapshotSchema } from '@/schemas/ai/optimizeRequestSchema';

const componentObjectiveSchema = z
  .enum(['maximize-companions', 'minimize-harm', 'balanced'])
  .default('balanced');

export const optimizeComponentRequestSchema = z.object({
  componentId: z.string(),
  objective: componentObjectiveSchema,
  numberOfAlternatives: z.number().int().min(5).max(5).default(5),
  snapshot: gardenSnapshotSchema,
});

export type OptimizeComponentRequest = z.infer<typeof optimizeComponentRequestSchema>;
