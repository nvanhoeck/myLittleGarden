import { z } from 'zod';
import { SUN_DIRECTIONS } from '@/types/environment.types';

/**
 * Validation constants for garden dimensions
 */
const MIN_DIMENSION_METERS = 0.1;
const MAX_DIMENSION_METERS = 100;

/**
 * Validation constants for frost period
 */
const MIN_GROWING_SEASON_DAYS = 60;
const MAX_GROWING_SEASON_DAYS = 365;
const DATE_RANGE_YEARS = 1; // Dates must be within current year +/- this value

/**
 * Schema for validating sun direction
 * Must be one of the 8 cardinal/intercardinal directions
 * Note: This schema is exported for use by Component validation
 */
export const sunDirectionSchema = z.enum(SUN_DIRECTIONS, {
  errorMap: () => ({ message: 'Ongeldige zonrichting' }),
});

/**
 * Schema for validating garden dimensions
 * Width and height must be between 0.1m and 100m
 */
export const gardenDimensionsSchema = z.object({
  widthInMeters: z
    .number({
      required_error: 'Breedte is verplicht',
      invalid_type_error: 'Breedte moet een getal zijn',
    })
    .min(MIN_DIMENSION_METERS, `Breedte moet minimaal ${MIN_DIMENSION_METERS} meter zijn`)
    .max(MAX_DIMENSION_METERS, `Breedte mag maximaal ${MAX_DIMENSION_METERS} meter zijn`),
  heightInMeters: z
    .number({
      required_error: 'Hoogte is verplicht',
      invalid_type_error: 'Hoogte moet een getal zijn',
    })
    .min(MIN_DIMENSION_METERS, `Hoogte moet minimaal ${MIN_DIMENSION_METERS} meter zijn`)
    .max(MAX_DIMENSION_METERS, `Hoogte mag maximaal ${MAX_DIMENSION_METERS} meter zijn`),
});

/**
 * Schema for validating a single date string in ISO format
 * Dates must be within current year +/- DATE_RANGE_YEARS
 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet in YYYY-MM-DD formaat zijn')
  .refine(
    (dateStr) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    },
    { message: 'Ongeldige datum' }
  )
  .refine(
    (dateStr) => {
      const date = new Date(dateStr);
      const currentYear = new Date().getFullYear();
      const minYear = currentYear - DATE_RANGE_YEARS;
      const maxYear = currentYear + DATE_RANGE_YEARS;
      const dateYear = date.getFullYear();
      return dateYear >= minYear && dateYear <= maxYear;
    },
    {
      message: `Datum moet binnen ${DATE_RANGE_YEARS} jaar van het huidige jaar zijn`,
    }
  );

/**
 * Schema for validating frost period
 * Spring frost date must be before fall frost date
 * Growing season must be between MIN_GROWING_SEASON_DAYS and MAX_GROWING_SEASON_DAYS
 */
export const frostPeriodSchema = z
  .object({
    lastSpringFrost: dateStringSchema,
    firstFallFrost: dateStringSchema,
  })
  .refine(
    (data) => {
      const springDate = new Date(data.lastSpringFrost);
      const fallDate = new Date(data.firstFallFrost);
      return springDate < fallDate;
    },
    {
      message: 'Laatste lentevorst moet voor eerste herfstvorst zijn',
      path: ['lastSpringFrost'],
    }
  )
  .refine(
    (data) => {
      const springDate = new Date(data.lastSpringFrost);
      const fallDate = new Date(data.firstFallFrost);
      const diffTime = fallDate.getTime() - springDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= MIN_GROWING_SEASON_DAYS;
    },
    {
      message: `Groeiseizoen moet minimaal ${MIN_GROWING_SEASON_DAYS} dagen zijn`,
      path: ['firstFallFrost'],
    }
  )
  .refine(
    (data) => {
      const springDate = new Date(data.lastSpringFrost);
      const fallDate = new Date(data.firstFallFrost);
      const diffTime = fallDate.getTime() - springDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= MAX_GROWING_SEASON_DAYS;
    },
    {
      message: `Groeiseizoen mag maximaal ${MAX_GROWING_SEASON_DAYS} dagen zijn`,
      path: ['firstFallFrost'],
    }
  );

/**
 * Schema for validating complete garden environment storage data
 * Note: sunDirection is now stored at the Component level, not Environment level
 */
export const gardenEnvironmentStorageSchema = z.object({
  widthInMeters: z.number().nullable(),
  heightInMeters: z.number().nullable(),
  lastSpringFrost: z.string().nullable(),
  firstFallFrost: z.string().nullable(),
});

/**
 * Inferred types from schemas
 */
export type SunDirectionType = z.infer<typeof sunDirectionSchema>;
export type GardenDimensionsType = z.infer<typeof gardenDimensionsSchema>;
export type FrostPeriodType = z.infer<typeof frostPeriodSchema>;
export type GardenEnvironmentStorageType = z.infer<typeof gardenEnvironmentStorageSchema>;

/**
 * Validation helper functions
 */
export function validateSunDirection(direction: unknown): SunDirectionType {
  return sunDirectionSchema.parse(direction);
}

export function validateGardenDimensions(dimensions: unknown): GardenDimensionsType {
  return gardenDimensionsSchema.parse(dimensions);
}

export function validateFrostPeriod(frostPeriod: unknown): FrostPeriodType {
  return frostPeriodSchema.parse(frostPeriod);
}

export function safeValidateSunDirection(direction: unknown) {
  return sunDirectionSchema.safeParse(direction);
}

export function safeValidateGardenDimensions(dimensions: unknown) {
  return gardenDimensionsSchema.safeParse(dimensions);
}

export function safeValidateFrostPeriod(frostPeriod: unknown) {
  return frostPeriodSchema.safeParse(frostPeriod);
}
