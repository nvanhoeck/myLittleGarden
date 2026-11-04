import type { PlantData } from '../../types/plant.types.ts';

/** How two plants affect each other when they grow side by side */
export type PlantRelation = 'companion' | 'combative' | 'neutral';

export type PlantRelations = (plantIdA: string, plantIdB: string) => PlantRelation;

/**
 * Builds the relation lookup from the catalog. A relation holds both ways
 * when either plant lists the other; combative wins over companion.
 */
export function relationsFromCatalog(
  plants: readonly Pick<PlantData, 'id' | 'companions' | 'combatives'>[],
): PlantRelations {
  const companions = new Set<string>();
  const combatives = new Set<string>();
  for (const plant of plants) {
    plant.companions.forEach((c) => companions.add(pairKey(plant.id, c.plantId)));
    plant.combatives.forEach((c) => combatives.add(pairKey(plant.id, c.plantId)));
  }

  return (plantIdA, plantIdB) => {
    const key = pairKey(plantIdA, plantIdB);
    if (combatives.has(key)) return 'combative';
    if (companions.has(key)) return 'companion';
    return 'neutral';
  };
}

function pairKey(plantIdA: string, plantIdB: string): string {
  return plantIdA < plantIdB ? `${plantIdA}|${plantIdB}` : `${plantIdB}|${plantIdA}`;
}
