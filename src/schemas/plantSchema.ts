/**
 * Zod validation schemas for plant data
 * Used for validating plant JSON data at runtime
 */

import {z} from 'zod';

/**
 * Sun requirement schema
 */
export const sunRequirementSchema = z.enum(['full', 'partial', 'shade']);
export type SunRequirementType = z.infer<typeof sunRequirementSchema>;

/**
 * Water requirement schema
 */
export const waterRequirementSchema = z.enum(['low', 'moderate', 'high']);
export type WaterRequirementType = z.infer<typeof waterRequirementSchema>;

/**
 * Frost tolerance schema
 */
export const frostToleranceSchema = z.enum(['tender', 'semi-hardy', 'hardy']);
export type FrostToleranceType = z.infer<typeof frostToleranceSchema>;


/**
 * Growth habit schema
 */
export const growthHabitSchema = z.enum(['upright', 'climbing', 'spreading', 'bush']);
export type GrowthHabitType = z.infer<typeof growthHabitSchema>;

/**
 * Plant type schema
 */
export const plantTypeSchema = z.enum(['vegetable', 'herb', 'shrub', 'tree']);
export type PlantTypeType = z.infer<typeof plantTypeSchema>;

/**
 * Planting style schema
 */
export const plantingStyleSchema = z.enum(['individual', 'patch']);
export type PlantingStyleType = z.infer<typeof plantingStyleSchema>;

/**
 * Plant category schema
 */
export const plantCategorySchema = z.enum([
    'vruchtgroenten',
    'bladgroenten',
    'wortelgroenten',
    'koolgewassen',
    'peulvruchten',
    'kruiden',
    'fruit',
    'groenten',
    'graan',

]);
export type PlantCategoryType = z.infer<typeof plantCategorySchema>;

/**
 * Companion benefit schema
 */
export const companionBenefitSchema = z.enum([
    'detersPests',
    'attractsPollinators',
    'growthBoost',
    'improvesFlavor',
    'fixesNitrogen',
]);
export type CompanionBenefitType = z.infer<typeof companionBenefitSchema>;

/**
 * Combative harm schema
 */
export const combativeHarmSchema = z.enum([
    'inhibitsGrowth',
    'attractsPests',
    'depletesNutrients',
    'diseaseRisk',
]);
export type CombativeHarmType = z.infer<typeof combativeHarmSchema>;

/**
 * Day range schema for germination/harvest periods
 */
export const dayRangeSchema = z.object({
    min: z.number().int().min(0),
    max: z.number().int().min(0),
}).refine(
    (data) => data.max >= data.min,
    {message: 'max moet groter of gelijk zijn aan min'}
);
export type DayRangeType = z.infer<typeof dayRangeSchema>;

/**
 * Companion relationship schema
 */
export const companionRelationshipSchema = z.object({
    plantId: z.string().min(1),
    benefits: z.array(companionBenefitSchema).min(1),
});
export type CompanionRelationshipType = z.infer<typeof companionRelationshipSchema>;

/**
 * Combative relationship schema
 */
export const combativeRelationshipSchema = z.object({
    plantId: z.string().min(1),
    harms: z.array(combativeHarmSchema).min(1),
});
export type CombativeRelationshipType = z.infer<typeof combativeRelationshipSchema>;

/**
 * Complete plant data schema
 */
export const plantDataSchema = z.object({
    id: z.string().min(1),
    nameNl: z.string().min(1),
    scientificName: z.string().min(1),
    category: plantCategorySchema,
    description: z.string(),
    spacingRadiusCm: z.number().positive(),
    rootSpacingRadiusCm: z.number().positive().optional(),
    growthHabit: growthHabitSchema,
    plantType: plantTypeSchema,
    spreadsViaRunners: z.boolean(),
    plantingStyle: plantingStyleSchema,
    plantingDepthCm: z.number().nonnegative(),
    sun: sunRequirementSchema,
    water: waterRequirementSchema,
    frostTolerance: frostToleranceSchema,
    germinationDays: dayRangeSchema,
    daysToHarvest: dayRangeSchema,
    indoorStartWeeks: z.number().int().nullable(),
    transplantWeeks: z.number().int().nullable(),
    directSowWeeks: z.number().int().nullable(),
    companions: z.array(companionRelationshipSchema),
    combatives: z.array(combativeRelationshipSchema),
});
export type PlantDataType = z.infer<typeof plantDataSchema>;

/**
 * Plant database schema
 */
export const plantDatabaseSchema = z.object({
    version: z.string(),
    plants: z.array(plantDataSchema),
});
export type PlantDatabaseType = z.infer<typeof plantDatabaseSchema>;

/**
 * Placed plant instance schema
 */
export const placedPlantDataSchema = z.object({
    id: z.string().uuid(),
    plantId: z.string().min(1),
    positionX: z.number(),
    positionY: z.number(),
    placedAt: z.string().datetime(),
});
export type PlacedPlantDataType = z.infer<typeof placedPlantDataSchema>;

// ===== Validation Functions =====

/**
 * Validate plant data, throws on failure
 */
export function validatePlantData(data: unknown): PlantDataType {
    return plantDataSchema.parse(data);
}

/**
 * Safely validate plant data, returns result object
 */
export function safeValidatePlantData(data: unknown) {
    return plantDataSchema.safeParse(data);
}

/**
 * Validate entire plant database, throws on failure
 */
export function validatePlantDatabase(data: unknown): PlantDatabaseType {
    return plantDatabaseSchema.parse(data);
}

/**
 * Safely validate plant database, returns result object
 */
export function safeValidatePlantDatabase(data: unknown) {
    return plantDatabaseSchema.safeParse(data);
}

/**
 * Validate placed plant data, throws on failure
 */
export function validatePlacedPlant(data: unknown): PlacedPlantDataType {
    return placedPlantDataSchema.parse(data);
}

/**
 * Safely validate placed plant data, returns result object
 */
export function safeValidatePlacedPlant(data: unknown) {
    return placedPlantDataSchema.safeParse(data);
}
