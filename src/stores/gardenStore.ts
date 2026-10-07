import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SunDirection } from '@/types/environment.types';
import { migrateGardenState, GARDEN_STORE_VERSION } from './migrations/gardenStoreMigrations';

interface GardenState {
  sunDirection: SunDirection | null;
  springFrostDate: Date | null;
  fallFrostDate: Date | null;
  setSunDirection: (direction: SunDirection) => void;
  setFrostDates: (spring: Date, fall: Date) => void;
}

export const useGardenStore = create<GardenState>()(
  persist(
    (set) => ({
      sunDirection: null,
      springFrostDate: null,
      fallFrostDate: null,
      setSunDirection: (direction) => set({ sunDirection: direction }),
      setFrostDates: (spring, fall) =>
        set({ springFrostDate: spring, fallFrostDate: fall }),
    }),
    {
      name: 'garden-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: GARDEN_STORE_VERSION,
      migrate: (persistedState, version) =>
        migrateGardenState(persistedState, version) as unknown as GardenState,
    }
  )
);
