import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { PlantData, PlantCategory } from '@/types/plant.types';
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
  getCompanionsFor: (plantId: string) => readonly PlantData[];
  getCombativesFor: (plantId: string) => readonly PlantData[];
  searchPlants: (query: string) => readonly PlantData[];
}

/**
 * Load and validate plant data from JSON
 */
function loadPlantData(): { plants: PlantData[]; version: string; error: string | null } {
  try {
    const validated = validatePlantDatabase(plantsJson);
    return {
      plants: validated.plants as PlantData[],
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

  // Get companion plants for a given plant
  getCompanionsFor: (plantId: string): readonly PlantData[] => {
    const plant = get().getPlantById(plantId);
    if (!plant) return [];

    const companionIds = plant.companions.map((c) => c.plantId);
    return get().plants.filter((p) => companionIds.includes(p.id));
  },

  // Get combative plants for a given plant
  getCombativesFor: (plantId: string): readonly PlantData[] => {
    const plant = get().getPlantById(plantId);
    if (!plant) return [];

    const combativeIds = plant.combatives.map((c) => c.plantId);
    return get().plants.filter((p) => combativeIds.includes(p.id));
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
