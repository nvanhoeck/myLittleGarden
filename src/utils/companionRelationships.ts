/**
 * Companion Relationship Utilities
 * Functions for calculating and displaying companion/combative plant relationships
 */

import type {
  PlacedPlantData,
  PlantData,
  CompanionBenefit,
  CombativeHarm,
} from '@/types';

/**
 * Type of relationship between two plants
 */
export type RelationshipType = 'companion' | 'combative' | 'neutral';

/**
 * A relationship between two placed plants.
 * benefits/harms are aggregated from both directions (A→B and B→A).
 */
export interface PlantRelationship {
  readonly plant1Id: string;
  readonly plant2Id: string;
  readonly plant1Position: { x: number; y: number };
  readonly plant2Position: { x: number; y: number };
  readonly type: RelationshipType;
  readonly benefits?: readonly CompanionBenefit[];
  readonly harms?: readonly CombativeHarm[];
  readonly plant1Name: string;
  readonly plant2Name: string;
}

/**
 * Check if two plants are within interaction range
 * Plants are considered "nearby" if their spacing circles could overlap or touch
 */
export function areWithinRange(
  plant1: PlacedPlantData,
  plant1Spacing: number,
  plant2: PlacedPlantData,
  plant2Spacing: number,
  interactionMultiplier: number = 1.5
): boolean {
  const dx = plant1.positionX - plant2.positionX;
  const dy = plant1.positionY - plant2.positionY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  // Plants interact when within 1.5x their combined spacing radius
  const interactionRange = (plant1Spacing + plant2Spacing) * interactionMultiplier;
  return distance <= interactionRange;
}

/**
 * Get companion benefits from plant1 toward plant2
 * Returns all benefits if plant1 lists plant2 as a companion
 */
export function getCompanionBenefits(
  plant1Data: PlantData,
  plant2Id: string
): readonly CompanionBenefit[] {
  const relationship = plant1Data.companions.find(
    (c) => c.plantId === plant2Id
  );
  return relationship?.benefits ?? [];
}

/**
 * Get combative harms from plant1 toward plant2
 * Returns all harms if plant1 lists plant2 as combative
 */
export function getCombativeHarms(
  plant1Data: PlantData,
  plant2Id: string
): readonly CombativeHarm[] {
  const relationship = plant1Data.combatives.find(
    (c) => c.plantId === plant2Id
  );
  return relationship?.harms ?? [];
}

/**
 * Merge two arrays of unique values
 */
function mergeUnique<T>(a: readonly T[], b: readonly T[]): readonly T[] {
  return Array.from(new Set([...a, ...b]));
}

/**
 * Calculate all relationships between plants in a component.
 * Benefits and harms are aggregated from both directions.
 * Combative takes precedence over companion when both exist.
 */
export function calculatePlantRelationships(
  plants: readonly PlacedPlantData[],
  getPlantById: (id: string) => PlantData | undefined
): PlantRelationship[] {
  const relationships: PlantRelationship[] = [];
  const processedPairs = new Set<string>();

  plants.forEach((plant1) => {
    const plant1Data = getPlantById(plant1.plantId);
    if (!plant1Data) return;

    plants.forEach((plant2) => {
      if (plant1.id === plant2.id) return;

      // Create a unique key for this pair (regardless of order)
      const pairKey = [plant1.id, plant2.id].sort().join('-');
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      const plant2Data = getPlantById(plant2.plantId);
      if (!plant2Data) return;

      // Check if plants are within interaction range
      if (
        !areWithinRange(
          plant1,
          plant1Data.spacingRadiusCm,
          plant2,
          plant2Data.spacingRadiusCm
        )
      ) {
        return;
      }

      // Aggregate benefits and harms from both directions
      const benefits = mergeUnique(
        getCompanionBenefits(plant1Data, plant2.plantId),
        getCompanionBenefits(plant2Data, plant1.plantId)
      );
      const harms = mergeUnique(
        getCombativeHarms(plant1Data, plant2.plantId),
        getCombativeHarms(plant2Data, plant1.plantId)
      );

      // Combative takes precedence
      if (harms.length > 0) {
        relationships.push({
          plant1Id: plant1.id,
          plant2Id: plant2.id,
          plant1Position: { x: plant1.positionX, y: plant1.positionY },
          plant2Position: { x: plant2.positionX, y: plant2.positionY },
          type: 'combative',
          harms,
          plant1Name: plant1Data.nameNl,
          plant2Name: plant2Data.nameNl,
        });
      } else if (benefits.length > 0) {
        relationships.push({
          plant1Id: plant1.id,
          plant2Id: plant2.id,
          plant1Position: { x: plant1.positionX, y: plant1.positionY },
          plant2Position: { x: plant2.positionX, y: plant2.positionY },
          type: 'companion',
          benefits,
          plant1Name: plant1Data.nameNl,
          plant2Name: plant2Data.nameNl,
        });
      }
    });
  });

  return relationships;
}

/**
 * Get all relationships for a specific plant
 */
export function getRelationshipsForPlant(
  plantId: string,
  relationships: PlantRelationship[]
): PlantRelationship[] {
  return relationships.filter(
    (r) => r.plant1Id === plantId || r.plant2Id === plantId
  );
}

/**
 * Count companions and combatives for a plant
 */
export function countRelationships(
  plantId: string,
  relationships: PlantRelationship[]
): { companions: number; combatives: number } {
  const plantRelations = getRelationshipsForPlant(plantId, relationships);
  return {
    companions: plantRelations.filter((r) => r.type === 'companion').length,
    combatives: plantRelations.filter((r) => r.type === 'combative').length,
  };
}
