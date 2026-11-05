import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ComponentData,
  ComponentType,
  GardenBoxData,
  PotData,
  RectangularTowerData,
  CircularTowerData,
  RectangularLayerDimensions,
  CircularLayerDimensions,
  SunDirection,
} from '@/types';
import {
  GardenBox,
  Pot,
  RectangularTower,
  CircularTower,
} from '@/domain/component';
import { Planning, optimizeSeason as optimizeSeasonOf, plantingAreasOf } from '@/domain/planning';
import type { PlantShare, Season } from '@/domain/planning';
import { generateId } from '@/utils/idGenerator';
import {
  migrateComponentState,
  mergePersistedComponentState,
  COMPONENT_STORE_VERSION,
} from './migrations/componentStoreMigrations';
import { usePlantStore } from './plantStore';
import { useEnvironmentStore } from './environmentStore';
import { usePlanningStore } from './planningStore';
import { seasonsOfYear } from './planningContext';

/**
 * Component store state interface
 */
interface ComponentState {
  // State
  components: ComponentData[];

  // Actions - CRUD
  addGardenBox: (params: {
    name: string;
    sunDirection: SunDirection;
    widthInCm: number;
    lengthInCm: number;
    borderWidthInCm: number;
  }) => string;
  addPot: (params: {
    name: string;
    sunDirection: SunDirection;
    diameterInCm: number;
    borderWidthInCm: number;
  }) => string;
  addRectangularTower: (params: {
    name: string;
    sunDirection: SunDirection;
    widthInCm: number;
    lengthInCm: number;
    borderWidthInCm: number;
    numberOfLayers: number;
    customLayers?: readonly RectangularLayerDimensions[];
  }) => string;
  addCircularTower: (params: {
    name: string;
    sunDirection: SunDirection;
    diameterInCm: number;
    borderWidthInCm: number;
    numberOfLayers: number;
    customLayers?: readonly CircularLayerDimensions[];
  }) => string;
  updateComponent: (id: string, data: Partial<ComponentData>) => void;
  removeComponent: (id: string) => void;
  clearAllComponents: () => void;

  // Actions - Planning (per component, year and season)
  addPlantsToPlanning: (componentId: string, year: number, plantIds: readonly string[]) => void;
  removePlantFromPlanning: (componentId: string, year: number, plantId: string) => void;
  setRatio: (componentId: string, year: number, season: Season, plantId: string, ratio: number) => void;
  /** Places the plants starting in the season by ratio; null when the component is gone */
  optimizeSeason: (componentId: string, year: number, season: Season) => readonly PlantShare[] | null;
  movePlacement: (componentId: string, year: number, season: Season, placementId: string, xCm: number, yCm: number) => void;
  removePlacement: (componentId: string, year: number, season: Season, placementId: string) => void;
  togglePlacementLock: (componentId: string, year: number, season: Season, placementId: string) => void;
  setAllPlacementsLocked: (componentId: string, year: number, season: Season, locked: boolean) => void;
  resizePatch: (
    componentId: string,
    year: number,
    season: Season,
    placementId: string,
    widthCm: number,
    heightCm: number,
    rotationDeg: number,
  ) => void;
  /** After a new frost date: moves ratios to the plants' new start seasons */
  reconcilePlannings: () => void;

  // Selectors
  getComponentById: (id: string) => ComponentData | undefined;
  getComponentsByType: (type: ComponentType) => ComponentData[];
}

function planningOf(component: ComponentData, year: number): Planning {
  return Planning.from(component.plannings[String(year)], seasonsOfYear(year));
}

/** Applies a change to one component's planning of a year; unchanged plannings keep the component as it is */
function withPlanning(
  components: ComponentData[],
  componentId: string,
  year: number,
  change: (planning: Planning) => Planning,
): ComponentData[] {
  return components.map((comp) => {
    if (comp.id !== componentId) return comp;
    const current = planningOf(comp, year);
    const next = change(current);
    return next === current ? comp : { ...comp, plannings: { ...comp.plannings, [String(year)]: next.toData() } };
  });
}

/**
 * Component store with persistence to AsyncStorage
 * Manages garden components (boxes, pots, towers)
 */
export const useComponentStore = create<ComponentState>()(
  persist(
    (set, get) => ({
      // Initial state
      components: [],

      // Add a new garden box
      addGardenBox: (params) => {
        const id = generateId();
        const box = GardenBox.create({
          id,
          name: params.name,
          sunDirection: params.sunDirection,
          widthInCm: params.widthInCm,
          lengthInCm: params.lengthInCm,
          borderWidthInCm: params.borderWidthInCm,
        });
        set((state) => ({
          components: [...state.components, box.toData()],
        }));
        return id;
      },

      // Add a new pot
      addPot: (params) => {
        const id = generateId();
        const pot = Pot.create({
          id,
          name: params.name,
          sunDirection: params.sunDirection,
          diameterInCm: params.diameterInCm,
          borderWidthInCm: params.borderWidthInCm,
        });
        set((state) => ({
          components: [...state.components, pot.toData()],
        }));
        return id;
      },

      // Add a new rectangular tower
      addRectangularTower: (params) => {
        const id = generateId();
        const tower = RectangularTower.create({
          id,
          name: params.name,
          sunDirection: params.sunDirection,
          widthInCm: params.widthInCm,
          lengthInCm: params.lengthInCm,
          borderWidthInCm: params.borderWidthInCm,
          numberOfLayers: params.numberOfLayers,
          customLayers: params.customLayers,
        });
        set((state) => ({
          components: [...state.components, tower.toData()],
        }));
        return id;
      },

      // Add a new circular tower
      addCircularTower: (params) => {
        const id = generateId();
        const tower = CircularTower.create({
          id,
          name: params.name,
          sunDirection: params.sunDirection,
          diameterInCm: params.diameterInCm,
          borderWidthInCm: params.borderWidthInCm,
          numberOfLayers: params.numberOfLayers,
          customLayers: params.customLayers,
        });
        set((state) => ({
          components: [...state.components, tower.toData()],
        }));
        return id;
      },

      // Update an existing component
      updateComponent: (id, data) => {
        set((state) => ({
          components: state.components.map((comp) => {
            if (comp.id === id) {
              // Return updated component with same type
              return { ...comp, ...data } as ComponentData;
            }
            return comp;
          }),
        }));
      },

      // Remove a component
      removeComponent: (id) => {
        set((state) => ({
          components: state.components.filter((comp) => comp.id !== id),
        }));
        usePlanningStore.getState().forgetComponent(id);
      },

      // Clear all components
      clearAllComponents: () => {
        set({ components: [] });
      },

      addPlantsToPlanning: (componentId, year, plantIds) => {
        set((state) => ({ components: withPlanning(state.components, componentId, year, (p) => p.addPlants(plantIds)) }));
      },

      removePlantFromPlanning: (componentId, year, plantId) => {
        set((state) => ({ components: withPlanning(state.components, componentId, year, (p) => p.removePlant(plantId)) }));
      },

      setRatio: (componentId, year, season, plantId, ratio) => {
        set((state) => ({ components: withPlanning(state.components, componentId, year, (p) => p.setRatio(season, plantId, ratio)) }));
      },

      optimizeSeason: (componentId, year, season) => {
        const component = get().getComponentById(componentId);
        if (!component) return null;
        const outcome = optimizeSeasonOf({
          planning: planningOf(component, year),
          season,
          areas: plantingAreasOf(component),
          hasLayers: isTower(component),
          plantOf: (plantId) => usePlantStore.getState().getPlantById(plantId),
          newId: generateId,
        });
        set((state) => ({ components: withPlanning(state.components, componentId, year, () => outcome.planning) }));
        usePlanningStore.getState().setLastShares({ componentId, year, season }, outcome.shares);
        return outcome.shares;
      },

      movePlacement: (componentId, year, season, placementId, xCm, yCm) => {
        set((state) => ({
          components: withPlanning(state.components, componentId, year, (p) => p.movePlacement(season, placementId, xCm, yCm)),
        }));
      },

      removePlacement: (componentId, year, season, placementId) => {
        set((state) => ({
          components: withPlanning(state.components, componentId, year, (p) => p.removePlacement(season, placementId)),
        }));
      },

      togglePlacementLock: (componentId, year, season, placementId) => {
        set((state) => ({
          components: withPlanning(state.components, componentId, year, (p) => p.toggleLock(season, placementId)),
        }));
      },

      setAllPlacementsLocked: (componentId, year, season, locked) => {
        set((state) => ({
          components: withPlanning(state.components, componentId, year, (p) => p.setAllLocked(season, locked)),
        }));
      },

      resizePatch: (componentId, year, season, placementId, widthCm, heightCm, rotationDeg) => {
        set((state) => ({
          components: withPlanning(state.components, componentId, year, (p) =>
            p.resizePatch(season, placementId, widthCm, heightCm, rotationDeg),
          ),
        }));
      },

      reconcilePlannings: () => {
        set((state) => ({
          components: state.components.map((comp) => {
            const years = Object.keys(comp.plannings);
            const reconciled = years.map((year) => [year, planningOf(comp, Number(year)).reconciled().toData()] as const);
            const changed = reconciled.some(([year, data]) => data !== comp.plannings[year]);
            return changed ? { ...comp, plannings: Object.fromEntries(reconciled) } : comp;
          }),
        }));
      },

      // Get a component by ID
      getComponentById: (id) => {
        return get().components.find((comp) => comp.id === id);
      },

      // Get components by type
      getComponentsByType: (type) => {
        return get().components.filter((comp) => comp.type === type);
      },
    }),
    {
      name: 'component-storage',
      storage: createJSONStorage(() => AsyncStorage as StateStorage),
      version: COMPONENT_STORE_VERSION,
      migrate: (persistedState, version) => migrateComponentState(persistedState, version) as unknown as ComponentState,
      merge: (persistedState, currentState) => mergePersistedComponentState(persistedState, currentState),
      // Only persist the components array
      partialize: (state) => ({
        components: state.components,
      }),
    }
  )
);

// ===== Selector Hooks =====
// Using useShallow to prevent infinite loops from reference changes

/**
 * Select all components
 */
export function useAllComponents(): ComponentData[] {
  return useComponentStore(useShallow((state) => state.components));
}

/**
 * Select a single component by ID
 */
export function useComponent(id: string): ComponentData | undefined {
  return useComponentStore((state) =>
    state.components.find((comp) => comp.id === id)
  );
}

/**
 * Select components by type
 */
export function useComponentsByType(type: ComponentType): ComponentData[] {
  return useComponentStore(
    useShallow((state) => state.components.filter((comp) => comp.type === type))
  );
}

/**
 * Select component count
 */
export function useComponentCount(): number {
  return useComponentStore((state) => state.components.length);
}

/**
 * Select component actions (stable references)
 */
export function useComponentActions() {
  return useComponentStore(
    useShallow((state) => ({
      addGardenBox: state.addGardenBox,
      addPot: state.addPot,
      addRectangularTower: state.addRectangularTower,
      addCircularTower: state.addCircularTower,
      updateComponent: state.updateComponent,
      removeComponent: state.removeComponent,
      clearAllComponents: state.clearAllComponents,
      addPlantsToPlanning: state.addPlantsToPlanning,
      removePlantFromPlanning: state.removePlantFromPlanning,
      setRatio: state.setRatio,
      optimizeSeason: state.optimizeSeason,
      movePlacement: state.movePlacement,
      removePlacement: state.removePlacement,
      togglePlacementLock: state.togglePlacementLock,
      setAllPlacementsLocked: state.setAllPlacementsLocked,
      resizePatch: state.resizePatch,
    }))
  );
}

// ===== Type Guards =====

export function isGardenBox(component: ComponentData): component is GardenBoxData {
  return component.type === 'gardenBox';
}

export function isPot(component: ComponentData): component is PotData {
  return component.type === 'pot';
}

export function isRectangularTower(
  component: ComponentData
): component is RectangularTowerData {
  return component.type === 'rectangularTower';
}

export function isCircularTower(
  component: ComponentData
): component is CircularTowerData {
  return component.type === 'circularTower';
}

export function isTower(
  component: ComponentData
): component is RectangularTowerData | CircularTowerData {
  return isRectangularTower(component) || isCircularTower(component);
}

// A new last-frost date can move plants to other seasons. Only a change from one
// date to another reconciles: the first date, or the stored date loading at app
// start (null to date), must not outdate the seasons.
useEnvironmentStore.subscribe((state, previous) => {
  if (previous.lastSpringFrost !== null && state.lastSpringFrost !== null && state.lastSpringFrost !== previous.lastSpringFrost) {
    useComponentStore.getState().reconcilePlannings();
  }
});
