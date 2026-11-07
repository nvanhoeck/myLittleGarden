import { z } from 'zod';
import type { AreaData, AreaPiece, PlantingData, PlanningData } from '../types/planning.types';

/**
 * Planning schemas: what a component's planning per year looks like in storage
 */

export const seasonSchema = z.enum(['spring', 'summer', 'autumn', 'winter']);

export const areaPieceSchema = z.object({
  xCm: z.number(),
  yCm: z.number(),
  widthCm: z.number().positive(),
  lengthCm: z.number().positive(),
}) satisfies z.ZodType<AreaPiece>;

export const areaDataSchema = z.object({
  id: z.string().min(1),
  plantingId: z.string().min(1),
  plantId: z.string().min(1),
  layerIndex: z.number().int().min(0).optional(),
  pieces: z.array(areaPieceSchema).min(1).max(3),
  locked: z.boolean().optional(),
}) satisfies z.ZodType<AreaData>;

export const plantingDataSchema = z.object({
  id: z.string().min(1),
  plantId: z.string().min(1),
  startSeason: seasonSchema,
  fixedSeasons: z.array(seasonSchema).optional(),
}) satisfies z.ZodType<PlantingData>;

const seasonPlanDataSchema = z.object({
  ratios: z.record(z.string(), z.number().int().min(1)),
  areas: z.array(areaDataSchema),
  status: z.enum(['notPlanned', 'planned', 'outdated']),
});

export const planningDataSchema = z.object({
  plants: z.array(z.string().min(1)),
  plantings: z.array(plantingDataSchema),
  seasons: z.object({
    spring: seasonPlanDataSchema,
    summer: seasonPlanDataSchema,
    autumn: seasonPlanDataSchema,
    winter: seasonPlanDataSchema,
  }),
}) satisfies z.ZodType<PlanningData>;
