/**
 * Environment type definitions for garden configuration
 * These types define the data structures used for sun direction and frost periods.
 *
 * Note: Garden dimensions have been removed as the canvas is infinite (Miro-style).
 * Sun direction is now stored at the Component level for microclimate considerations.
 */

export const SUN_DIRECTIONS = [
  'N', 'NE', 'E', 'SE',
  'S', 'SW', 'W', 'NW',
] as const;

export type SunDirection = typeof SUN_DIRECTIONS[number];

/**
 * Immutable data structure for frost period dates
 * Dates are stored as ISO date strings for serialization
 */
export interface FrostPeriodData {
  readonly lastSpringFrost: string; // ISO date string (YYYY-MM-DD)
  readonly firstFallFrost: string;  // ISO date string (YYYY-MM-DD)
}

/**
 * Storage data structure for garden environment
 * Used for persistence with Zustand/AsyncStorage
 * All fields are nullable to represent incomplete configuration
 *
 * Note: Garden dimensions removed (infinite canvas), sunDirection at Component level
 */
export interface GardenEnvironmentStorageData {
  lastSpringFrost: string | null;
  firstFallFrost: string | null;
}
