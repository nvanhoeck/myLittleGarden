import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { PlantData, PlantCategory, CompanionRelationship, CombativeRelationship, CompanionBenefit, CombativeHarm } from '@/types/plant.types';
import { validatePlantDatabase } from '@/schemas/plantSchema';
import plantsJson from '@/data/plants.json';

/**
 * Plant store state interface
 * Read-only store for plant data loaded from JSON
 */
interface PlantState {
  // State
  readonly plants: readonly PlantData[];
  readonly version: string;
  readonly isLoaded: boolean;
  readonly error: string | null;

  // Selectors
  getPlantById: (id: string) => PlantData | undefined;
  getPlantsByCategory: (category: PlantCategory) => readonly PlantData[];
  /**
   * Returns companions considering both directions:
   * plants this plant lists as companions + plants that list this plant as companion.
   * Benefits from both directions are merged per plant pair.
   */
  getEffectiveCompanionsFor: (plantId: string) => readonly CompanionRelationship[];
  /**
   * Returns combatives considering both directions:
   * plants this plant lists as combative + plants that list this plant as combative.
   * Harms from both directions are merged per plant pair.
   */
  getEffectiveCombativesFor: (plantId: string) => readonly CombativeRelationship[];
  searchPlants: (query: string) => readonly PlantData[];
}

/**
 * Load and validate plant data from JSON
 */
function loadPlantData(): { plants: PlantData[]; version: string; error: string | null } {
  try {
    const validated = validatePlantDatabase(plantsJson);
    return {
      plants: validated.plants as unknown as PlantData[],
      version: validated.version,
      error: null,
    };
  } catch (err) {
    console.error('Failed to validate plant database:', err);
    return {
      plants: [],
      version: '0.0.0',
      error: err instanceof Error ? err.message : 'Onbekende fout bij laden planten',
    };
  }
}

// Load plant data at module initialization
const initialData = loadPlantData();

/**
 * Plant store - read-only access to plant data
 * Plants are loaded from JSON and validated at startup
 */
export const usePlantStore = create<PlantState>()((set, get) => ({
  // Initial state
  plants: initialData.plants,
  version: initialData.version,
  isLoaded: initialData.error === null,
  error: initialData.error,

  // Get a single plant by ID
  getPlantById: (id: string): PlantData | undefined => {
    return get().plants.find((plant) => plant.id === id);
  },

  // Get all plants in a category
  getPlantsByCategory: (category: PlantCategory): readonly PlantData[] => {
    return get().plants.filter((plant) => plant.category === category);
  },

  // Get effective companion relationships considering both directions
  getEffectiveCompanionsFor: (plantId: string): readonly CompanionRelationship[] => {
    const plants = get().plants;
    const plant = plants.find((p) => p.id === plantId);

    // Map from partnerId → merged Set of benefits
    const benefitsMap = new Map<string, Set<CompanionBenefit>>();

    const addBenefits = (partnerId: string, benefits: readonly CompanionBenefit[]) => {
      if (!benefitsMap.has(partnerId)) benefitsMap.set(partnerId, new Set());
      benefits.forEach((b) => benefitsMap.get(partnerId)!.add(b));
    };

    // Forward: this plant lists others as companions
    plant?.companions.forEach((c) => addBenefits(c.plantId, c.benefits));

    // Reverse: other plants list this plant as companion
    plants.forEach((p) => {
      if (p.id === plantId) return;
      p.companions.forEach((c) => {
        if (c.plantId === plantId) addBenefits(p.id, c.benefits);
      });
    });

    return Array.from(benefitsMap.entries()).map(([id, benefits]) => ({
      plantId: id,
      benefits: Array.from(benefits),
    }));
  },

  // Get effective combative relationships considering both directions
  getEffectiveCombativesFor: (plantId: string): readonly CombativeRelationship[] => {
    const plants = get().plants;
    const plant = plants.find((p) => p.id === plantId);

    const harmsMap = new Map<string, Set<CombativeHarm>>();

    const addHarms = (partnerId: string, harms: readonly CombativeHarm[]) => {
      if (!harmsMap.has(partnerId)) harmsMap.set(partnerId, new Set());
      harms.forEach((h) => harmsMap.get(partnerId)!.add(h));
    };

    plant?.combatives.forEach((c) => addHarms(c.plantId, c.harms));

    plants.forEach((p) => {
      if (p.id === plantId) return;
      p.combatives.forEach((c) => {
        if (c.plantId === plantId) addHarms(p.id, c.harms);
      });
    });

    return Array.from(harmsMap.entries()).map(([id, harms]) => ({
      plantId: id,
      harms: Array.from(harms),
    }));
  },

  // Search plants by name or description
  searchPlants: (query: string): readonly PlantData[] => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return get().plants;

    return get().plants.filter(
      (plant) =>
        plant.nameNl.toLowerCase().includes(normalizedQuery) ||
        plant.scientificName.toLowerCase().includes(normalizedQuery) ||
        plant.description.toLowerCase().includes(normalizedQuery)
    );
  },
}));

// ===== Selector Hooks =====
// Using useShallow to prevent infinite loops from reference changes

/**
 * Select all plants
 */
export function useAllPlants(): readonly PlantData[] {
  return usePlantStore((state) => state.plants);
}

/**
 * Select a single plant by ID
 */
export function usePlant(id: string): PlantData | undefined {
  return usePlantStore((state) =>
    state.plants.find((plant) => plant.id === id)
  );
}

/**
 * Select plants by category
 */
export function usePlantsByCategory(category: PlantCategory): readonly PlantData[] {
  return usePlantStore(
    useShallow((state) => state.plants.filter((plant) => plant.category === category))
  );
}

/**
 * Select plant store loading state
 */
export function usePlantStoreStatus(): { isLoaded: boolean; error: string | null } {
  return usePlantStore(
    useShallow((state) => ({
      isLoaded: state.isLoaded,
      error: state.error,
    }))
  );
}
