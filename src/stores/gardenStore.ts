import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SunDirection } from '@/types/environment.types';

interface GardenState {
  gardenWidth: number;
  gardenHeight: number;
  sunDirection: SunDirection | null;
  springFrostDate: Date | null;
  fallFrostDate: Date | null;
  setGardenSize: (width: number, height: number) => void;
  setSunDirection: (direction: SunDirection) => void;
  setFrostDates: (spring: Date, fall: Date) => void;
}

export const useGardenStore = create<GardenState>()(
  persist(
    (set) => ({
      gardenWidth: 0,
      gardenHeight: 0,
      sunDirection: null,
      springFrostDate: null,
      fallFrostDate: null,
      setGardenSize: (width, height) =>
        set({ gardenWidth: width, gardenHeight: height }),
      setSunDirection: (direction) => set({ sunDirection: direction }),
      setFrostDates: (spring, fall) =>
        set({ springFrostDate: spring, fallFrostDate: fall }),
    }),
    {
      name: 'garden-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
