// Zod validation schemas

// Garden schema exports (legacy - keep for backwards compatibility)
export { gardenSizeSchema, GardenSize } from './gardenSchema';

// Environment schema exports (new implementation)
export {
  sunDirectionSchema,
  gardenDimensionsSchema,
  dateStringSchema,
  frostPeriodSchema,
  gardenEnvironmentStorageSchema,
  SunDirectionType,
  GardenDimensionsType,
  FrostPeriodType,
  GardenEnvironmentStorageType,
  validateSunDirection,
  validateGardenDimensions,
  validateFrostPeriod,
  safeValidateSunDirection,
  safeValidateGardenDimensions,
  safeValidateFrostPeriod,
} from './environmentSchema';

// Plant schema exports
export {
  sunRequirementSchema,
  waterRequirementSchema,
  frostToleranceSchema,
  plantCategorySchema,
  companionBenefitSchema,
  combativeHarmSchema,
  dayRangeSchema,
  companionRelationshipSchema,
  combativeRelationshipSchema,
  plantDataSchema,
  plantDatabaseSchema,
  validatePlantData,
  safeValidatePlantData,
  validatePlantDatabase,
  safeValidatePlantDatabase,
} from './plantSchema';
export { placementDataSchema, plantingDataSchema, planningDataSchema, seasonSchema } from './planningSchema';
export type {
  SunRequirementType,
  WaterRequirementType,
  FrostToleranceType,
  PlantCategoryType,
  CompanionBenefitType,
  CombativeHarmType,
  DayRangeType,
  CompanionRelationshipType,
  CombativeRelationshipType,
  PlantDataType,
  PlantDatabaseType,
} from './plantSchema';
