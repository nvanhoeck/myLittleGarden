import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GardenEnvironmentStorageData } from '@/types/environment.types';
import { GardenEnvironment } from '@/domain/environment';
import { frostPeriodSchema } from '@/schemas/environmentSchema';

/**
 * Current store version for migrations
 * Version 3: Removed garden dimensions (canvas is now infinite/Miro-style)
 */
const STORE_VERSION = 3;

/**
 * Environment store state interface
 * Contains all persisted environment configuration and actions
 * Note: sunDirection is stored at Component level, dimensions removed (infinite canvas)
 */
interface EnvironmentState {
  // State (persisted)
  lastSpringFrost: string | null;
  firstFallFrost: string | null;

  // Actions
  setFrostPeriod: (lastSpringFrost: string, firstFallFrost: string) => void;
  clearEnvironment: () => void;

  // Computed/Derived (non-persisted helpers)
  isConfigured: () => boolean;
  getStorageData: () => GardenEnvironmentStorageData;
  getGardenEnvironment: () => GardenEnvironment;
}

/**
 * Environment store with persistence to AsyncStorage
 * Manages garden environment configuration (frost dates)
 * Note: Garden dimensions removed (infinite canvas), sunDirection at Component level
 */
export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set, get) => ({
      // Initial state
      lastSpringFrost: null,
      firstFallFrost: null,

      // Actions with validation
      setFrostPeriod: (lastSpringFrost: string, firstFallFrost: string) => {
        const result = frostPeriodSchema.safeParse({ lastSpringFrost, firstFallFrost });
        if (!result.success) {
          throw new Error(result.error.errors[0]?.message ?? 'Ongeldige vorstperiode');
        }
        set({
          lastSpringFrost: result.data.lastSpringFrost,
          firstFallFrost: result.data.firstFallFrost,
        });
      },

      clearEnvironment: () => {
        set({
          lastSpringFrost: null,
          firstFallFrost: null,
        });
      },

      // Computed helpers
      isConfigured: () => {
        const state = get();
        return (
          state.lastSpringFrost !== null &&
          state.firstFallFrost !== null
        );
      },

      getStorageData: (): GardenEnvironmentStorageData => {
        const state = get();
        return {
          lastSpringFrost: state.lastSpringFrost,
          firstFallFrost: state.firstFallFrost,
        };
      },

      getGardenEnvironment: (): GardenEnvironment => {
        return GardenEnvironment.fromStorageData(get().getStorageData());
      },
    }),
    {
      name: 'environment-storage',
      storage: createJSONStorage(() => AsyncStorage as StateStorage),
      version: STORE_VERSION,
      // Only persist the state values, not actions
      partialize: (state) => ({
        lastSpringFrost: state.lastSpringFrost,
        firstFallFrost: state.firstFallFrost,
      }),
      // Migration function for version updates
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;

        // Version 1 -> 2: Remove sunDirection from environment storage
        if (version === 1) {
          const { sunDirection: _, ...rest } = state;
          return rest as unknown as EnvironmentState;
        }

        // Version 2 -> 3: Remove dimensions from environment storage
        if (version === 2) {
          const { widthInMeters: _, heightInMeters: __, ...rest } = state;
          return rest as unknown as EnvironmentState;
        }

        return persistedState as EnvironmentState;
      },
    }
  )
);

// ===== Selector Hooks =====
// These provide optimized subscriptions to specific state slices
// Using useShallow to prevent infinite loops from object reference changes

/**
 * Select frost dates from the store
 */
export function useFrostDates(): { spring: string | null; fall: string | null } {
  return useEnvironmentStore(
    useShallow((state) => ({
      spring: state.lastSpringFrost,
      fall: state.firstFallFrost,
    }))
  );
}

/**
 * Select whether the environment is fully configured
 */
export function useIsConfigured(): boolean {
  return useEnvironmentStore((state) =>
    state.lastSpringFrost !== null &&
    state.firstFallFrost !== null
  );
}

/**
 * Select actions only (stable references, no re-renders on state change)
 */
export function useEnvironmentActions() {
  return useEnvironmentStore(
    useShallow((state) => ({
      setFrostPeriod: state.setFrostPeriod,
      clearEnvironment: state.clearEnvironment,
    }))
  );
}
