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
 * A relationship between two placed plants
 */
export interface PlantRelationship {
  readonly plant1Id: string;
  readonly plant2Id: string;
  readonly plant1Position: { x: number; y: number };
  readonly plant2Position: { x: number; y: number };
  readonly type: RelationshipType;
  readonly benefit?: CompanionBenefit;
  readonly harm?: CombativeHarm;
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
 * Get companion relationship from plant1 to plant2
 * Returns the benefit if plant1 lists plant2 as a companion
 */
export function getCompanionBenefit(
  plant1Data: PlantData,
  plant2Id: string
): CompanionBenefit | undefined {
  const relationship = plant1Data.companions.find(
    (c) => c.plantId === plant2Id
  );
  return relationship?.benefit;
}

/**
 * Get combative relationship from plant1 to plant2
 * Returns the harm if plant1 lists plant2 as combative
 */
export function getCombativeHarm(
  plant1Data: PlantData,
  plant2Id: string
): CombativeHarm | undefined {
  const relationship = plant1Data.combatives.find(
    (c) => c.plantId === plant2Id
  );
  return relationship?.harm;
}

/**
 * Calculate all relationships between plants in a component
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

      // Check for companion relationship (either direction)
      const benefit1to2 = getCompanionBenefit(plant1Data, plant2.plantId);
      const benefit2to1 = getCompanionBenefit(plant2Data, plant1.plantId);

      // Check for combative relationship (either direction)
      const harm1to2 = getCombativeHarm(plant1Data, plant2.plantId);
      const harm2to1 = getCombativeHarm(plant2Data, plant1.plantId);

      // Determine relationship type - combative takes precedence
      if (harm1to2 || harm2to1) {
        relationships.push({
          plant1Id: plant1.id,
          plant2Id: plant2.id,
          plant1Position: { x: plant1.positionX, y: plant1.positionY },
          plant2Position: { x: plant2.positionX, y: plant2.positionY },
          type: 'combative',
          harm: harm1to2 || harm2to1,
          plant1Name: plant1Data.nameNl,
          plant2Name: plant2Data.nameNl,
        });
      } else if (benefit1to2 || benefit2to1) {
        relationships.push({
          plant1Id: plant1.id,
          plant2Id: plant2.id,
          plant1Position: { x: plant1.positionX, y: plant1.positionY },
          plant2Position: { x: plant2.positionX, y: plant2.positionY },
          type: 'companion',
          benefit: benefit1to2 || benefit2to1,
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
