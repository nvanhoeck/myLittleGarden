/**
 * Plant type definitions for garden plants
 * These types define the data structures used for plant information,
 * companion relationships, and growing calendar data.
 */

/**
 * Sun exposure requirements
 */
export type SunRequirement = 'full' | 'partial' | 'shade';

/**
 * Water requirements
 */
export type WaterRequirement = 'low' | 'moderate' | 'high';

/**
 * Frost tolerance levels
 * - tender: Cannot tolerate any frost
 * - semi-hardy: Can tolerate light frost
 * - hardy: Can tolerate hard frost
 */
export type FrostTolerance = 'tender' | 'semi-hardy' | 'hardy';

/**
 * Plant categories in Dutch
 */
export type PlantCategory =
  | 'vruchtgroenten'
  | 'bladgroenten'
  | 'wortelgroenten'
  | 'koolgewassen'
  | 'peulvruchten'
  | 'kruiden';

/**
 * Types of benefits from companion planting
 */
export type CompanionBenefit =
  | 'detersPests'
  | 'attractsPollinators'
  | 'growthBoost'
  | 'improvesFlavor'
  | 'fixesNitrogen';

/**
 * Types of harm from combative planting
 */
export type CombativeHarm =
  | 'inhibitsGrowth'
  | 'attractsPests'
  | 'depletesNutrients'
  | 'diseaseRisk';

/**
 * Range of days for germination or harvest
 */
export interface DayRange {
  readonly min: number;
  readonly max: number;
}

/**
 * Companion plant relationship
 */
export interface CompanionRelationship {
  readonly plantId: string;
  readonly benefit: CompanionBenefit;
}

/**
 * Combative plant relationship
 */
export interface CombativeRelationship {
  readonly plantId: string;
  readonly harm: CombativeHarm;
}

/**
 * Complete plant data structure
 */
export interface PlantData {
  readonly id: string;
  readonly nameNl: string;
  readonly scientificName: string;
  readonly category: PlantCategory;
  readonly description: string;
  readonly spacingRadiusCm: number;
  readonly plantingDepthCm: number;
  readonly sun: SunRequirement;
  readonly water: WaterRequirement;
  readonly frostTolerance: FrostTolerance;
  readonly germinationDays: DayRange;
  readonly daysToHarvest: DayRange;
  // Growing calendar - weeks relative to last spring frost
  // Negative = before frost date, Positive = after frost date
  readonly indoorStartWeeks: number | null;
  readonly transplantWeeks: number | null;
  readonly directSowWeeks: number | null;
  readonly companions: readonly CompanionRelationship[];
  readonly combatives: readonly CombativeRelationship[];
}

/**
 * Plant database structure for JSON file
 */
export interface PlantDatabase {
  readonly version: string;
  readonly plants: readonly PlantData[];
}

/**
 * Placed plant instance in a garden component
 */
export interface PlacedPlantData {
  readonly id: string;
  readonly plantId: string;
  readonly positionX: number; // Position within component in cm
  readonly positionY: number; // Position within component in cm
  readonly placedAt: string; // ISO date string
  readonly layerIndex?: number; // Layer index for towers (0 = bottom layer), undefined for non-towers
}

/**
 * Category display information for UI
 */
export interface PlantCategoryInfo {
  readonly key: PlantCategory;
  readonly labelNl: string;
  readonly icon: string;
}

/**
 * All plant categories with display information
 */
export const PLANT_CATEGORIES: readonly PlantCategoryInfo[] = [
  { key: 'vruchtgroenten', labelNl: 'Vruchtgroenten', icon: '🍅' },
  { key: 'bladgroenten', labelNl: 'Bladgroenten', icon: '🥬' },
  { key: 'wortelgroenten', labelNl: 'Wortelgroenten', icon: '🥕' },
  { key: 'koolgewassen', labelNl: 'Koolgewassen', icon: '🥦' },
  { key: 'peulvruchten', labelNl: 'Peulvruchten', icon: '🫘' },
  { key: 'kruiden', labelNl: 'Kruiden', icon: '🌿' },
] as const;
