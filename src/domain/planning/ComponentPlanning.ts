import type { ComponentData } from '../../types/component.types.ts';
import type { PlacedPlantData, PlantData } from '../../types/plant.types.ts';
import type { PlantToPlanData } from '../../types/planning.types.ts';
import { getTowerLayerDimensions } from '../component/towerLayerGeometry.ts';
import { placePlants } from './AutoPlacement.ts';
import type { FixedPlant, PlacementCandidate, PlacementResult, PlantingArea, UnplacedCandidate } from './AutoPlacement.ts';
import { GrowingPeriod } from './GrowingPeriod.ts';
import type { FrostDay } from './GrowingPeriod.ts';
import { periodOptionsFor } from './GrowingPeriodOptions.ts';
import { PlantFootprint } from './PlantFootprint.ts';
import { plantsInScope, plantsToPlanIn } from './PlanningQueries.ts';
import { relationsFromCatalog } from './PlantRelations.ts';

/**
 * Use cases for planning one component (or tower layer) in one year:
 * Rearrange and Start over. Both run auto-placement and return the
 * component's new plants and plants to plan. Plants of other years and
 * layers are left untouched; locked plants never move, and neither do
 * placed plants for which no period can be (re)computed.
 *
 * Coordinates: auto-placement and stored plant positions share the same
 * frame, the top-left of the inner area (border excluded), like the canvas.
 */

export interface ComponentPlanningInput {
  readonly component: ComponentData;
  readonly year: number;
  /** Tower layer; undefined for components without layers */
  readonly layerIndex?: number;
  readonly plantOf: (plantId: string) => PlantData | undefined;
  /** null when the garden has no frost date yet: plants then have no planting window */
  readonly lastSpringFrost: FrostDay | null;
  /** Placing time for plants that come from the list */
  readonly now: Date;
}

export interface ComponentPlanningOutcome {
  readonly plants: PlacedPlantData[];
  readonly plantsToPlan: PlantToPlanData[];
  /** Why candidates were not placed, for the "to plan" list */
  readonly unplaced: readonly UnplacedCandidate[];
}

/** Patch size fields, shared by placed plants and plants to plan */
type PatchFields = Pick<PlacedPlantData, 'patchWidthInCm' | 'patchHeightInCm' | 'patchRotationDeg'>;

/** Spacing the canvas assumes for plants missing from the catalog */
const DEFAULT_SPACING_RADIUS_CM = 15;

/** Rearrange: placed plants keep their period and may only move; the list gets all options */
export function rearrangePlanting(input: ComponentPlanningInput): ComponentPlanningOutcome {
  return planComponent(input, 'keepPeriods');
}

/** Start over: every unlocked plant may get any period and position */
export function startPlantingOver(input: ComponentPlanningInput): ComponentPlanningOutcome {
  return planComponent(input, 'choosePeriods');
}

/** The inner area of a component or tower layer, as the canvas draws it */
export function plantingAreaOf(component: ComponentData, layerIndex?: number): PlantingArea {
  const border = 2 * component.borderWidthInCm;
  const layer = layerIndex ?? 0;

  switch (component.type) {
    case 'gardenBox':
      return {
        shape: 'rectangle',
        widthCm: Math.max(0, component.widthInCm - border),
        lengthCm: Math.max(0, component.lengthInCm - border),
      };
    case 'pot':
      return { shape: 'circle', diameterCm: Math.max(0, component.diameterInCm - border) };
    case 'rectangularTower': {
      const dims = getTowerLayerDimensions(component.widthInCm - border, component.lengthInCm - border, layer);
      return { shape: 'rectangle', widthCm: dims.width, lengthCm: dims.height };
    }
    case 'circularTower': {
      const dims = getTowerLayerDimensions(component.diameterInCm - border, component.diameterInCm - border, layer);
      return { shape: 'circle', diameterCm: dims.width };
    }
  }
}

type PeriodChoice = 'keepPeriods' | 'choosePeriods';

function planComponent(input: ComponentPlanningInput, choice: PeriodChoice): ComponentPlanningOutcome {
  const { component, year, layerIndex } = input;
  const placedInScope = plantsInScope(component, year, layerIndex);
  const listInScope = plantsToPlanIn(component, year, layerIndex);

  const optionsFor = (plantId: string): GrowingPeriod[] => {
    const plant = input.plantOf(plantId);
    return plant !== undefined && input.lastSpringFrost !== null
      ? periodOptionsFor(plant, { year, lastSpringFrost: input.lastSpringFrost })
      : [];
  };

  // A placed plant moves only when it is unlocked and has a period to choose;
  // otherwise it stays where it is. A plant without a valid stored period
  // cannot block anything and is left alone.
  const fixed: FixedPlant[] = [];
  const candidates: PlacementCandidate[] = [];
  for (const plant of placedInScope) {
    const currentPeriod = currentPeriodOf(plant);
    const footprint = footprintOf(input.plantOf(plant.plantId), plant);
    const options = plant.locked === true ? [] : choice === 'keepPeriods' ? currentPeriod : optionsFor(plant.plantId);
    if (options.length > 0) {
      candidates.push({ id: plant.id, plantId: plant.plantId, footprint, periodOptions: options });
    } else {
      fixed.push(...currentPeriod.map((period) => ({
        id: plant.id,
        plantId: plant.plantId,
        footprint,
        period,
        xCm: plant.positionX,
        yCm: plant.positionY,
      })));
    }
  }
  for (const item of listInScope) {
    candidates.push({
      id: item.id,
      plantId: item.plantId,
      footprint: footprintOf(input.plantOf(item.plantId), item),
      periodOptions: optionsFor(item.plantId),
    });
  }

  const plantIds = new Set([...placedInScope, ...listInScope].map((p) => p.plantId));
  const result = placePlants({
    area: plantingAreaOf(component, layerIndex),
    fixed,
    candidates,
    relations: relationsFromCatalog([...plantIds].flatMap((id) => input.plantOf(id) ?? [])),
  });

  return applyPlacement(input, result, listInScope, candidates);
}

/**
 * Placed candidates get their new position (and period); plants from the
 * list become placed plants. Unlocked placed plants that no longer fit go
 * back to the list, keeping their patch size; list items that do not fit
 * stay on it.
 */
function applyPlacement(
  input: ComponentPlanningInput,
  result: PlacementResult,
  listInScope: readonly PlantToPlanData[],
  candidates: readonly PlacementCandidate[],
): ComponentPlanningOutcome {
  const { component } = input;
  const placements = new Map(result.placed.map((p) => [p.id, p]));
  const unplacedIds = new Set(result.unplaced.map((u) => u.id));
  const footprints = new Map(candidates.map((c) => [c.id, c.footprint]));

  const plantsThatStay = component.plants.flatMap((plant): PlacedPlantData[] => {
    const placement = placements.get(plant.id);
    if (placement !== undefined) {
      return [{ ...plant, positionX: placement.xCm, positionY: placement.yCm, growingPeriod: placement.period.toData() }];
    }
    return unplacedIds.has(plant.id) ? [] : [plant];
  });

  const plantsFromList = listInScope.flatMap((item): PlacedPlantData[] => {
    const placement = placements.get(item.id);
    if (placement === undefined) {
      return [];
    }
    return [
      {
        id: item.id,
        plantId: item.plantId,
        positionX: placement.xCm,
        positionY: placement.yCm,
        placedAt: input.now.toISOString(),
        ...(item.layerIndex !== undefined ? { layerIndex: item.layerIndex } : {}),
        growingPeriod: placement.period.toData(),
        ...patchOfNewPlant(input.plantOf(item.plantId), item, footprints.get(item.id)),
      },
    ];
  });

  const backToList = component.plants
    .filter((plant) => unplacedIds.has(plant.id))
    .map((plant): PlantToPlanData => ({
      id: plant.id,
      plantId: plant.plantId,
      year: plant.growingPeriod.year,
      ...(plant.layerIndex !== undefined ? { layerIndex: plant.layerIndex } : {}),
      ...patchFieldsOf(plant),
    }));

  return {
    plants: [...plantsThatStay, ...plantsFromList],
    plantsToPlan: [...component.plantsToPlan.filter((item) => !placements.has(item.id)), ...backToList],
    unplaced: result.unplaced,
  };
}

/** A patch keeps the size it had; a new patch is drawn at the size it was planned with */
function patchOfNewPlant(plant: PlantData | undefined, item: PlantToPlanData, footprint: PlantFootprint | undefined): PatchFields {
  const kept = patchFieldsOf(item);
  if (Object.keys(kept).length > 0 || plant?.plantingStyle !== 'patch' || footprint === undefined) {
    return kept;
  }
  return { patchWidthInCm: footprint.widthCm, patchHeightInCm: footprint.lengthCm, patchRotationDeg: 0 };
}

/** Only the patch fields that are set, so plain plants get no undefined keys */
function patchFieldsOf(item: PatchFields): PatchFields {
  return {
    ...(item.patchWidthInCm !== undefined ? { patchWidthInCm: item.patchWidthInCm } : {}),
    ...(item.patchHeightInCm !== undefined ? { patchHeightInCm: item.patchHeightInCm } : {}),
    ...(item.patchRotationDeg !== undefined ? { patchRotationDeg: item.patchRotationDeg } : {}),
  };
}

/** The stored period as an option; none when it is no longer valid */
function currentPeriodOf(plant: PlacedPlantData): GrowingPeriod[] {
  try {
    return [GrowingPeriod.create(plant.growingPeriod)];
  } catch {
    return [];
  }
}

function footprintOf(plant: PlantData | undefined, patchFields: PatchFields): PlantFootprint {
  const known = plant !== undefined && plant.spacingRadiusCm > 0
    ? plant
    : { spacingRadiusCm: DEFAULT_SPACING_RADIUS_CM, plantingStyle: 'individual' as const };
  const { patchWidthInCm, patchHeightInCm, patchRotationDeg } = patchFields;
  const patch = patchWidthInCm !== undefined && patchHeightInCm !== undefined
    ? { widthCm: patchWidthInCm, heightCm: patchHeightInCm, rotationDeg: patchRotationDeg ?? 0 }
    : undefined;
  return PlantFootprint.forPlant(known, patch);
}
