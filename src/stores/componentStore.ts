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
  SunDirection,
} from '@/types';
import {
  GardenBox,
  Pot,
  RectangularTower,
  CircularTower,
} from '@/domain/component';
import { generateId } from '@/utils/idGenerator';

/**
 * Current store version for migrations
 */
const STORE_VERSION = 1;

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
  }) => string;
  addCircularTower: (params: {
    name: string;
    sunDirection: SunDirection;
    diameterInCm: number;
    borderWidthInCm: number;
    numberOfLayers: number;
  }) => string;
  updateComponent: (id: string, data: Partial<ComponentData>) => void;
  removeComponent: (id: string) => void;
  moveComponent: (id: string, x: number, y: number) => void;
  rotateComponent: (id: string, degrees: number) => void;
  clearAllComponents: () => void;

  // Selectors
  getComponentById: (id: string) => ComponentData | undefined;
  getComponentsByType: (type: ComponentType) => ComponentData[];
  getPlacedComponents: () => ComponentData[];
  getUnplacedComponents: () => ComponentData[];
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
      },

      // Move a component to new position
      moveComponent: (id, x, y) => {
        set((state) => ({
          components: state.components.map((comp) =>
            comp.id === id
              ? { ...comp, positionX: x, positionY: y }
              : comp
          ),
        }));
      },

      // Rotate a component
      rotateComponent: (id, degrees) => {
        // Snap to 15-degree increments
        const snapped = Math.round(degrees / 15) * 15;
        const normalized = ((snapped % 360) + 360) % 360;
        set((state) => ({
          components: state.components.map((comp) =>
            comp.id === id ? { ...comp, rotation: normalized } : comp
          ),
        }));
      },

      // Clear all components
      clearAllComponents: () => {
        set({ components: [] });
      },

      // Get a component by ID
      getComponentById: (id) => {
        return get().components.find((comp) => comp.id === id);
      },

      // Get components by type
      getComponentsByType: (type) => {
        return get().components.filter((comp) => comp.type === type);
      },

      // Get placed components (on canvas)
      getPlacedComponents: () => {
        return get().components.filter(
          (comp) => comp.positionX !== 0 || comp.positionY !== 0 || comp.rotation !== 0
        );
      },

      // Get unplaced components (in inventory)
      getUnplacedComponents: () => {
        return get().components.filter(
          (comp) => comp.positionX === 0 && comp.positionY === 0 && comp.rotation === 0
        );
      },
    }),
    {
      name: 'component-storage',
      storage: createJSONStorage(() => AsyncStorage as StateStorage),
      version: STORE_VERSION,
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
 * Select placed components (on canvas)
 */
export function usePlacedComponents(): ComponentData[] {
  return useComponentStore(
    useShallow((state) =>
      state.components.filter(
        (comp) => comp.positionX !== 0 || comp.positionY !== 0 || comp.rotation !== 0
      )
    )
  );
}

/**
 * Select unplaced components (in inventory)
 */
export function useUnplacedComponents(): ComponentData[] {
  return useComponentStore(
    useShallow((state) =>
      state.components.filter(
        (comp) => comp.positionX === 0 && comp.positionY === 0 && comp.rotation === 0
      )
    )
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
      moveComponent: state.moveComponent,
      rotateComponent: state.rotateComponent,
      clearAllComponents: state.clearAllComponents,
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
