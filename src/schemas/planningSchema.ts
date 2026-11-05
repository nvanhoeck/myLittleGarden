import { z } from 'zod';
import type { PlacementData, PlanningData } from '../types/planning.types';

/**
 * Planning schemas: what a component's planning per year looks like in storage
 */

export const seasonSchema = z.enum(['spring', 'summer', 'autumn', 'winter']);

export const placementDataSchema = z.object({
  id: z.string().min(1),
  plantId: z.string().min(1),
  positionX: z.number(),
  positionY: z.number(),
  layerIndex: z.number().int().min(0).optional(),
  locked: z.boolean().optional(),
  patchWidthInCm: z.number().positive().optional(),
  patchHeightInCm: z.number().positive().optional(),
  patchRotationDeg: z.number().min(0).max(359).optional(),
}) satisfies z.ZodType<PlacementData>;

const seasonPlanDataSchema = z.object({
  ratios: z.record(z.string(), z.number().int().min(1)),
  placements: z.array(placementDataSchema),
  status: z.enum(['notPlanned', 'planned', 'outdated']),
});

export const planningDataSchema = z.object({
  plants: z.array(z.string().min(1)),
  seasons: z.object({
    spring: seasonPlanDataSchema,
    summer: seasonPlanDataSchema,
    autumn: seasonPlanDataSchema,
    winter: seasonPlanDataSchema,
  }),
}) satisfies z.ZodType<PlanningData>;
