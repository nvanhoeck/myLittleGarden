import { z } from 'zod';
import type { RoadData } from '../types/component.types';

/** What a road of a garden box looks like in storage: a rectangle in cm inside the box */
export const roadDataSchema = z.object({
  id: z.string().min(1),
  xCm: z.number().min(0),
  yCm: z.number().min(0),
  widthCm: z.number().positive(),
  lengthCm: z.number().positive(),
  locked: z.boolean().optional(),
}) satisfies z.ZodType<RoadData>;
