import type { PlacementData, PlantingData, PlanningData, Season, SeasonPlanData, SeasonStatus } from '../../types/planning.types.ts';
import type { PlantingCalendar } from './PlantCalendar.ts';
import { SEASONS } from './Season.ts';

const EMPTY_SEASON: SeasonPlanData = { ratios: {}, placements: [], status: 'notPlanned' };
const EMPTY_DATA: PlanningData = {
  plants: [],
  plantings: [],
  seasons: { spring: EMPTY_SEASON, summer: EMPTY_SEASON, autumn: EMPTY_SEASON, winter: EMPTY_SEASON },
};

/**
 * Planning is the entity for what grows in one component during one year:
 * the plant list and its plantings. A planting starts in one season, is
 * placed there and is carried into the later seasons it grows in. A plant
 * has at most one planting per start season. Ratios and placements belong
 * to plantings. A season whose inputs change after it was placed becomes
 * outdated. Immutable: every change returns a new Planning.
 */
export class Planning {
  private readonly data: PlanningData;
  private readonly calendar: PlantingCalendar;

  private constructor(data: PlanningData, calendar: PlantingCalendar) {
    this.data = data;
    this.calendar = calendar;
  }

  /** A stored planning brought in line with the calendar (see reconciled); a year without one is empty */
  static from(data: PlanningData | undefined, calendar: PlantingCalendar): Planning {
    return new Planning(data ?? EMPTY_DATA, calendar).reconciled();
  }

  toData(): PlanningData {
    return this.data;
  }

  get plants(): readonly string[] {
    return this.data.plants;
  }

  get plantings(): readonly PlantingData[] {
    return this.data.plantings;
  }

  /** True when the plant has a planting window at all */
  hasCalendar(plantId: string): boolean {
    return this.calendar.hasCalendar(plantId);
  }

  reachableSeasonsOf(plantId: string): readonly Season[] {
    return this.calendar.reachableSeasons(plantId);
  }

  plantingById(plantingId: string): PlantingData | undefined {
    return this.data.plantings.find((p) => p.id === plantingId);
  }

  /** The plant's plantings in season order */
  plantingsOf(plantId: string): PlantingData[] {
    return this.data.plantings
      .filter((p) => p.plantId === plantId)
      .sort((a, b) => SEASONS.indexOf(a.startSeason) - SEASONS.indexOf(b.startSeason));
  }

  /** 1 for the plant's first planting in season order, 2 for the next, … (0 when unknown) */
  plantingNumberOf(plantingId: string): number {
    const planting = this.plantingById(plantingId);
    return planting === undefined ? 0 : this.plantingsOf(planting.plantId).findIndex((p) => p.id === plantingId) + 1;
  }

  /** The seasons a planting grows in: frozen while placed, else from the calendar */
  growingSeasonsOf(planting: PlantingData): readonly Season[] {
    return planting.fixedSeasons ?? this.calendar.growingSeasons(planting.plantId, planting.startSeason);
  }

  plantingsStartingIn(season: Season): PlantingData[] {
    return this.data.plantings.filter((p) => p.startSeason === season);
  }

  /** Plantings still in the ground from an earlier season */
  plantingsCarriedInto(season: Season): PlantingData[] {
    return this.data.plantings.filter((p) => p.startSeason !== season && this.growingSeasonsOf(p).includes(season));
  }

  statusOf(season: Season): SeasonStatus {
    return this.data.seasons[season].status;
  }

  ratioOf(season: Season, plantingId: string): number {
    return this.data.seasons[season].ratios[plantingId] ?? 1;
  }

  /** Placements of the plantings that start in the season */
  placementsIn(season: Season): readonly PlacementData[] {
    return this.data.seasons[season].placements;
  }

  /** A planting's placements, in its start season */
  placementsOf(plantingId: string): PlacementData[] {
    const planting = this.plantingById(plantingId);
    return planting === undefined ? [] : this.placementsIn(planting.startSeason).filter((p) => p.plantingId === plantingId);
  }

  isPlaced(plantingId: string): boolean {
    return this.placementsOf(plantingId).length > 0;
  }

  /** Placements of the plantings carried into the season, from their start season */
  carriedPlacementsIn(season: Season): PlacementData[] {
    return this.plantingsCarriedInto(season).flatMap((p) => this.placementsOf(p.id));
  }

  /** What the optimizer must leave where it is: carried placements and locked placements of the season */
  fixedPlacementsIn(season: Season): PlacementData[] {
    return [...this.carriedPlacementsIn(season), ...this.placementsIn(season).filter((p) => p.locked === true)];
  }

  /** Seasons the plant's window reaches that have no planting of the plant yet (earlier ones too) */
  seasonsAvailableFor(plantingId: string): Season[] {
    const planting = this.plantingById(plantingId);
    if (planting === undefined) {
      return [];
    }
    const taken = new Set(this.plantingsOf(planting.plantId).map((p) => p.startSeason));
    return this.calendar.reachableSeasons(planting.plantId).filter((season) => !taken.has(season));
  }

  addPlants(plantIds: readonly string[]): Planning {
    const added = plantIds.filter((id, index) => !this.data.plants.includes(id) && plantIds.indexOf(id) === index);
    let next = this.with({ plants: [...this.data.plants, ...added] });
    for (const plantId of added) {
      next = next.withFirstPlanting(plantId);
    }
    return added.length === 0 ? this : next;
  }

  removePlant(plantId: string): Planning {
    if (!this.data.plants.includes(plantId)) {
      return this;
    }
    let next: Planning = this;
    for (const planting of this.plantingsOf(plantId)) {
      next = next.withoutPlanting(planting.id);
    }
    return next.with({ plants: next.data.plants.filter((id) => id !== plantId) });
  }

  /** Removes one planting; the plant leaves the list with its last planting */
  removePlanting(plantingId: string): Planning {
    const planting = this.plantingById(plantingId);
    if (planting === undefined) {
      return this;
    }
    const next = this.withoutPlanting(plantingId);
    return next.plantingsOf(planting.plantId).length > 0
      ? next
      : next.with({ plants: next.data.plants.filter((id) => id !== planting.plantId) });
  }

  /**
   * @throws Error when the planting does not start in the season or the
   * ratio is not a whole number of at least 1
   */
  setRatio(season: Season, plantingId: string, ratio: number): Planning {
    if (!Number.isInteger(ratio) || ratio < 1) {
      throw new Error(`Ongeldige verhouding ${ratio}`);
    }
    if (this.plantingById(plantingId)?.startSeason !== season) {
      throw new Error(`${plantingId} start niet in ${season}`);
    }
    if (this.ratioOf(season, plantingId) === ratio) {
      return this;
    }
    return this.withRatio(season, plantingId, ratio).markedOutdated([season]);
  }

  /**
   * Plants the same plant again in another season, at ratio 1.
   * @throws Error when the planting is not placed or the season is not available
   */
  duplicatePlanting(plantingId: string, season: Season): Planning {
    const planting = this.placedPlanting(plantingId, season);
    return this.withNewPlanting(planting.plantId, season);
  }

  /**
   * Moves a planting to another season: its placements go, it starts at ratio 1.
   * @throws Error when the planting is not placed or the season is not available
   */
  movePlanting(plantingId: string, season: Season): Planning {
    const planting = this.placedPlanting(plantingId, season);
    return this.withoutPlanting(plantingId).withPlanting({ id: planting.id, plantId: planting.plantId, startSeason: season });
  }

  /**
   * The result of a placement run: unlocked placements are replaced, locked
   * ones stay. Placed plantings starting here keep their growing seasons
   * from now on; unplaced ones follow the calendar again.
   */
  applyPlacement(season: Season, placements: readonly PlacementData[]): Planning {
    const before = this.plantingsStartingIn(season);
    const placed = this.withSeason(season, (plan) => ({
      ...plan,
      placements: [...plan.placements.filter((p) => p.locked === true), ...placements],
      status: 'planned',
    }));
    const next = placed.with({
      plantings: placed.data.plantings.map((p) => (p.startSeason === season ? placed.withFrozenSeasons(p) : p)),
    });
    const carried = [
      ...before.flatMap((p) => this.growingSeasonsOf(p)),
      ...next.plantingsStartingIn(season).flatMap((p) => next.growingSeasonsOf(p)),
    ].filter((s) => s !== season);
    return next.markedOutdated(carried);
  }

  movePlacement(season: Season, placementId: string, xCm: number, yCm: number): Planning {
    return this.changePlacement(season, placementId, (p) => ({ ...p, positionX: xCm, positionY: yCm }));
  }

  resizePatch(season: Season, placementId: string, widthCm: number, heightCm: number, rotationDeg: number): Planning {
    return this.changePlacement(season, placementId, (p) => ({
      ...p,
      patchWidthInCm: widthCm,
      patchHeightInCm: heightCm,
      patchRotationDeg: rotationDeg,
    }));
  }

  removePlacement(season: Season, placementId: string): Planning {
    const placement = this.placementsIn(season).find((p) => p.id === placementId);
    if (placement === undefined) {
      return this;
    }
    return this.withSeason(season, (plan) => ({ ...plan, placements: plan.placements.filter((p) => p.id !== placementId) }))
      .markedOutdated(this.laterSeasonsOf(placement.plantingId));
  }

  toggleLock(season: Season, placementId: string): Planning {
    return this.withSeason(season, (plan) => ({
      ...plan,
      placements: plan.placements.map((p) => (p.id === placementId ? { ...p, locked: !(p.locked ?? false) } : p)),
    }));
  }

  setAllLocked(season: Season, locked: boolean): Planning {
    return this.withSeason(season, (plan) => ({ ...plan, placements: plan.placements.map((p) => ({ ...p, locked })) }));
  }

  /**
   * Brings the planning in line with the calendar, on every load and after
   * a new frost date. Placed plantings keep everything (missing fixed
   * seasons are filled in). Exception: a placed planting without fixed
   * seasons (migrated, never frozen) whose start season the plant cannot
   * reach (and the plant reaches some season) is treated as unplaced: its
   * placements and ratio go and it follows the rule below. An unplaced planting loses its fixed seasons; when
   * the plant reaches some season but not the planting's start season, it
   * moves to the first available season at ratio 1, or is dropped when none
   * is left. A plant that reaches no season (no frost date, or a window
   * outside the year) keeps its plantings as they are. A plant with a
   * reachable season but no planting gets its first planting. Returns this
   * planning when nothing changes.
   */
  reconciled(): Planning {
    let next: Planning = this;
    for (const planting of this.data.plantings) {
      const reachable = this.calendar.reachableSeasons(planting.plantId);
      const stranded =
        planting.fixedSeasons === undefined && reachable.length > 0 && !reachable.includes(planting.startSeason);
      if (this.isPlaced(planting.id) && !stranded) {
        if (planting.fixedSeasons === undefined) {
          next = next.withPlantingChanged(planting.id, (p) => next.withFrozenSeasons(p));
        }
        continue;
      }
      if (planting.fixedSeasons !== undefined) {
        next = next.withPlantingChanged(planting.id, (p) => next.withFrozenSeasons(p));
      }
      if (reachable.length === 0 || reachable.includes(planting.startSeason)) {
        continue;
      }
      const target = next.seasonsAvailableFor(planting.id)[0];
      next = next.withoutPlanting(planting.id);
      if (target !== undefined) {
        next = next.withPlanting({ id: planting.id, plantId: planting.plantId, startSeason: target });
      }
    }
    for (const plantId of next.data.plants) {
      if (next.plantingsOf(plantId).length === 0) {
        next = next.withFirstPlanting(plantId);
      }
    }
    return next;
  }

  private with(changes: Partial<PlanningData>): Planning {
    return new Planning({ ...this.data, ...changes }, this.calendar);
  }

  private withSeason(season: Season, change: (plan: SeasonPlanData) => SeasonPlanData): Planning {
    return this.with({ seasons: { ...this.data.seasons, [season]: change(this.data.seasons[season]) } });
  }

  private withRatio(season: Season, plantingId: string, ratio: number): Planning {
    return this.withSeason(season, (plan) => ({ ...plan, ratios: { ...plan.ratios, [plantingId]: ratio } }));
  }

  private withPlantingChanged(plantingId: string, change: (planting: PlantingData) => PlantingData): Planning {
    return this.with({ plantings: this.data.plantings.map((p) => (p.id === plantingId ? change(p) : p)) });
  }

  /** A placed planting keeps the seasons it grows in now; an unplaced one follows the calendar */
  private withFrozenSeasons(planting: PlantingData): PlantingData {
    const { fixedSeasons: _previous, ...unfrozen } = planting;
    if (!this.isPlaced(planting.id)) {
      return unfrozen;
    }
    const derived = this.calendar.growingSeasons(planting.plantId, planting.startSeason);
    const seasons = derived.length > 0 ? derived : (planting.fixedSeasons ?? [planting.startSeason]);
    return { ...unfrozen, fixedSeasons: [...seasons] };
  }

  /** Adds a planting at ratio 1; its season becomes outdated if planned */
  private withPlanting(planting: PlantingData): Planning {
    return this.with({ plantings: [...this.data.plantings, planting] })
      .withRatio(planting.startSeason, planting.id, 1)
      .markedOutdated([planting.startSeason]);
  }

  private withNewPlanting(plantId: string, season: Season): Planning {
    return this.withPlanting({ id: this.newPlantingId(plantId, season), plantId, startSeason: season });
  }

  private withFirstPlanting(plantId: string): Planning {
    const season = this.calendar.reachableSeasons(plantId)[0];
    return season === undefined ? this : this.withNewPlanting(plantId, season);
  }

  /** Removes a planting with its ratio and placements; the seasons it touched become outdated */
  private withoutPlanting(plantingId: string): Planning {
    const planting = this.plantingById(plantingId);
    if (planting === undefined) {
      return this;
    }
    const touched = [planting.startSeason, ...this.growingSeasonsOf(planting)];
    return this.with({ plantings: this.data.plantings.filter((p) => p.id !== plantingId) })
      .withSeason(planting.startSeason, (plan) => {
        const { [plantingId]: _removed, ...ratios } = plan.ratios;
        return { ...plan, ratios, placements: plan.placements.filter((p) => p.plantingId !== plantingId) };
      })
      .markedOutdated(touched);
  }

  /** "<plantId>-<season>", with -2, -3, … when taken (a moved planting keeps its old id) */
  private newPlantingId(plantId: string, season: Season): string {
    const taken = new Set(this.data.plantings.map((p) => p.id));
    const base = `${plantId}-${season}`;
    let id = base;
    for (let n = 2; taken.has(id); n++) {
      id = `${base}-${n}`;
    }
    return id;
  }

  /** @throws Error when the planting is not placed or the season is not available for it */
  private placedPlanting(plantingId: string, season: Season): PlantingData {
    const planting = this.plantingById(plantingId);
    if (planting === undefined || !this.isPlaced(plantingId)) {
      throw new Error(`${plantingId} is niet geplaatst`);
    }
    if (!this.seasonsAvailableFor(plantingId).includes(season)) {
      throw new Error(`${season} is niet beschikbaar voor ${plantingId}`);
    }
    return planting;
  }

  /** Planned seasons become outdated; seasons not placed yet stay as they are */
  private markedOutdated(seasons: readonly Season[]): Planning {
    let next: Planning = this;
    for (const season of new Set(seasons)) {
      if (next.statusOf(season) === 'planned') {
        next = next.withSeason(season, (plan) => ({ ...plan, status: 'outdated' }));
      }
    }
    return next;
  }

  /** The seasons a planting grows in after its start season */
  private laterSeasonsOf(plantingId: string): Season[] {
    const planting = this.plantingById(plantingId);
    return planting === undefined ? [] : this.growingSeasonsOf(planting).filter((s) => s !== planting.startSeason);
  }

  private changePlacement(season: Season, placementId: string, change: (placement: PlacementData) => PlacementData): Planning {
    const placement = this.placementsIn(season).find((p) => p.id === placementId);
    if (placement === undefined) {
      return this;
    }
    return this.withSeason(season, (plan) => ({
      ...plan,
      placements: plan.placements.map((p) => (p.id === placementId ? change(p) : p)),
    })).markedOutdated(this.laterSeasonsOf(placement.plantingId));
  }
}
