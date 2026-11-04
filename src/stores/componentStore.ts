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
import * as Planning from '@/domain/planning';
import { generateId } from '@/utils/idGenerator';
import {
  migrateComponentState,
  mergePersistedComponentState,
  COMPONENT_STORE_VERSION,
  type PlantCatalogLookup,
} from './migrations/componentStoreMigrations';
import { usePlantStore } from './plantStore';
import { useEnvironmentStore } from './environmentStore';
import { usePlanningStore } from './planningStore';

const catalogLookup: PlantCatalogLookup = (plantId) => usePlantStore.getState().getPlantById(plantId);

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
  togglePlantLock: (componentId: string, plantInstanceId: string) => void;
  lockAllPlants: (componentId: string) => void;
  unlockAllPlants: (componentId: string) => void;
  updatePatchDimensions: (
    componentId: string,
    plantInstanceId: string,
    patchWidthInCm: number,
    patchHeightInCm: number,
    patchRotationDeg: number,
  ) => void;

  // Actions - Planning
  addPlantsToPlan: (componentId: string, plantId: string, quantity: number, year: number, layerIndex?: number) => void;
  removePlantToPlan: (componentId: string, plantToPlanId: string) => void;
  /** Rearrange: auto-places the plants of a year/layer; placed plants keep their period. Null when the component is gone. */
  rearrangePlanting: (componentId: string, year: number, layerIndex?: number) => Planning.PlanningRunCounts | null;
  /** Start over: auto-places the plants of a year/layer from scratch; locked plants stay. Null when the component is gone. */
  startPlantingOver: (componentId: string, year: number, layerIndex?: number) => Planning.PlanningRunCounts | null;

  // Selectors
  getComponentById: (id: string) => ComponentData | undefined;
  getComponentsByType: (type: ComponentType) => ComponentData[];
}

/**
 * What the planning use cases need besides the component: the plant catalog,
 * the garden's last spring frost day and the current time.
 */
function planningInputFor(component: ComponentData, year: number, layerIndex?: number): Planning.ComponentPlanningInput {
  return {
    component,
    year,
    layerIndex,
    plantOf: (plantId) => usePlantStore.getState().getPlantById(plantId),
    lastSpringFrost: Planning.frostDayOf(useEnvironmentStore.getState().lastSpringFrost),
    now: new Date(),
  };
}

function withOutcome(
  components: ComponentData[],
  componentId: string,
  outcome: Planning.ComponentPlanningOutcome,
): ComponentData[] {
  return components.map((comp) =>
    comp.id === componentId ? { ...comp, plants: outcome.plants, plantsToPlan: outcome.plantsToPlan } : comp
  );
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

      // Toggle the locked state of a single plant inside a component
      togglePlantLock: (componentId, plantInstanceId) => {
        set((state) => ({
          components: state.components.map((comp) => {
            if (comp.id !== componentId) return comp;
            return {
              ...comp,
              plants: comp.plants.map((p) =>
                p.id === plantInstanceId ? { ...p, locked: !p.locked } : p
              ),
            };
          }),
        }));
      },

      // Lock every plant inside a component
      lockAllPlants: (componentId) => {
        set((state) => ({
          components: state.components.map((comp) => {
            if (comp.id !== componentId) return comp;
            return {
              ...comp,
              plants: comp.plants.map((p) => ({ ...p, locked: true })),
            };
          }),
        }));
      },

      // Unlock every plant inside a component
      unlockAllPlants: (componentId) => {
        set((state) => ({
          components: state.components.map((comp) => {
            if (comp.id !== componentId) return comp;
            return {
              ...comp,
              plants: comp.plants.map((p) => ({ ...p, locked: false })),
            };
          }),
        }));
      },

      // Update patch dimensions for a placed plant
      updatePatchDimensions: (componentId, plantInstanceId, patchWidthInCm, patchHeightInCm, patchRotationDeg) => {
        set((state) => ({
          components: state.components.map((comp) => {
            if (comp.id !== componentId) return comp;
            return {
              ...comp,
              plants: comp.plants.map((p) =>
                p.id === plantInstanceId
                  ? { ...p, patchWidthInCm, patchHeightInCm, patchRotationDeg }
                  : p
              ),
            };
          }),
        }));
      },

      // Add plants to the "to plan" list of a component for a year (and tower layer)
      addPlantsToPlan: (componentId, plantId, quantity, year, layerIndex) => {
        const added = Array.from({ length: Math.max(0, Math.floor(quantity)) }, () => ({
          id: generateId(),
          plantId,
          year,
          ...(layerIndex !== undefined ? { layerIndex } : {}),
        }));
        set((state) => ({
          components: state.components.map((comp) =>
            comp.id === componentId ? { ...comp, plantsToPlan: [...comp.plantsToPlan, ...added] } : comp
          ),
        }));
      },

      // Remove one plant from the "to plan" list
      removePlantToPlan: (componentId, plantToPlanId) => {
        set((state) => ({
          components: state.components.map((comp) =>
            comp.id === componentId
              ? { ...comp, plantsToPlan: comp.plantsToPlan.filter((p) => p.id !== plantToPlanId) }
              : comp
          ),
        }));
        usePlanningStore.getState().forgetPlantToPlan(componentId, plantToPlanId);
      },

      // Auto-place a year/layer keeping the periods of placed plants
      rearrangePlanting: (componentId, year, layerIndex) => {
        const component = get().getComponentById(componentId);
        if (!component) return null;
        const outcome = Planning.rearrangePlanting(planningInputFor(component, year, layerIndex));
        set((state) => ({ components: withOutcome(state.components, componentId, outcome) }));
        usePlanningStore.getState().setLastRun({ componentId, year, layerIndex }, outcome.unplaced);
        return outcome.counts;
      },

      // Auto-place a year/layer from scratch; locked plants stay
      startPlantingOver: (componentId, year, layerIndex) => {
        const component = get().getComponentById(componentId);
        if (!component) return null;
        const outcome = Planning.startPlantingOver(planningInputFor(component, year, layerIndex));
        set((state) => ({ components: withOutcome(state.components, componentId, outcome) }));
        usePlanningStore.getState().setLastRun({ componentId, year, layerIndex }, outcome.unplaced);
        return outcome.counts;
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
      migrate: (persistedState, version) =>
        migrateComponentState(persistedState, version, catalogLookup) as unknown as ComponentState,
      merge: (persistedState, currentState) =>
        mergePersistedComponentState(persistedState, currentState, catalogLookup),
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
      togglePlantLock: state.togglePlantLock,
      lockAllPlants: state.lockAllPlants,
      unlockAllPlants: state.unlockAllPlants,
      updatePatchDimensions: state.updatePatchDimensions,
      addPlantsToPlan: state.addPlantsToPlan,
      removePlantToPlan: state.removePlantToPlan,
      rearrangePlanting: state.rearrangePlanting,
      startPlantingOver: state.startPlantingOver,
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
