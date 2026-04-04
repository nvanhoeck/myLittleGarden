import { z } from 'zod';

export const gardenSizeSchema = z.object({
  width: z.number().positive('Breedte moet positief zijn'),
  height: z.number().positive('Hoogte moet positief zijn'),
});

export const sunDirectionSchema = z.enum([
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
]);

export const frostDatesSchema = z.object({
  springFrostDate: z.date(),
  fallFrostDate: z.date(),
}).refine(
  (data) => data.springFrostDate < data.fallFrostDate,
  { message: 'Lentevorst datum moet voor herfstvorst datum zijn' }
);

export type GardenSize = z.infer<typeof gardenSizeSchema>;
export type SunDirection = z.infer<typeof sunDirectionSchema>;
export type FrostDates = z.infer<typeof frostDatesSchema>;
