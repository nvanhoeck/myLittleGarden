import type { ComponentData } from '../../types/component.types.ts';
import type { PlacedPlantData } from '../../types/plant.types.ts';
import type { PlantToPlanData } from '../../types/planning.types.ts';
import { GrowingPeriod } from './GrowingPeriod.ts';
import type { PlantingWeek } from './PlantingWeek.ts';
import { calculateTimeZones } from './TimeZone.ts';
import type { TimeZone } from './TimeZone.ts';

/**
 * Read-only questions about a component's plan, always for one year (or
 * week) and one tower layer. A component without layers is layer 0, and a
 * plant without a layerIndex lies on layer 0, as the canvas filters them.
 */

function onLayer(itemLayer: number | undefined, layerIndex: number | undefined): boolean {
  return (itemLayer ?? 0) === (layerIndex ?? 0);
}

/** Placed plants of the year on the layer */
export function plantsInScope(component: ComponentData, year: number, layerIndex?: number): PlacedPlantData[] {
  return component.plants.filter((plant) => plant.growingPeriod.year === year && onLayer(plant.layerIndex, layerIndex));
}

/** Placed plants on the layer that are in the ground during the week */
export function plantsGrowingIn(component: ComponentData, week: PlantingWeek, layerIndex?: number): PlacedPlantData[] {
  return component.plants.filter(
    (plant) => GrowingPeriod.covers(plant.growingPeriod, week) && onLayer(plant.layerIndex, layerIndex),
  );
}

/** The time zones of the layer in the year */
export function timeZonesOf(component: ComponentData, year: number, layerIndex?: number): TimeZone[] {
  const plants = plantsInScope(component, year, layerIndex).map((plant) => ({ id: plant.id, period: plant.growingPeriod }));
  return calculateTimeZones(plants, year);
}

/** Plants waiting to be planned in the year on the layer */
export function plantsToPlanIn(component: ComponentData, year: number, layerIndex?: number): PlantToPlanData[] {
  return component.plantsToPlan.filter((item) => item.year === year && onLayer(item.layerIndex, layerIndex));
}

/** Every year with placed plants or plants to plan, sorted, each once */
export function plannedYearsOf(component: ComponentData): number[] {
  const years = new Set([
    ...component.plants.map((plant) => plant.growingPeriod.year),
    ...component.plantsToPlan.map((item) => item.year),
  ]);
  return [...years].sort((a, b) => a - b);
}

/**
 * The other placed plants on the layer that are in the ground during at
 * least one week of the given plants, e.g. obstacles for an optimization of those plants
 */
export function plantsSharingWeeksWith(
  component: ComponentData,
  plants: readonly PlacedPlantData[],
  layerIndex?: number,
): PlacedPlantData[] {
  const ids = new Set(plants.map((plant) => plant.id));
  return component.plants.filter(
    (other) =>
      !ids.has(other.id) &&
      onLayer(other.layerIndex, layerIndex) &&
      plants.some((plant) => GrowingPeriod.sharedWeeks(plant.growingPeriod, other.growingPeriod) > 0),
  );
}

/** Whether Rearrange or Start over has anything to work with: a plant to plan or an unlocked placed plant */
export function hasAnythingToPlan(component: ComponentData, year: number, layerIndex?: number): boolean {
  return (
    plantsToPlanIn(component, year, layerIndex).length > 0 ||
    plantsInScope(component, year, layerIndex).some((plant) => plant.locked !== true)
  );
}
