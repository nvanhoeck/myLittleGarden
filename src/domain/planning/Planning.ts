import type { AreaData, AreaPiece, PlantingData, PlanningData, Season, SeasonPlanData, SeasonStatus } from '../../types/planning.types.ts';
import { layerBounds } from './FreeSpace.ts';
import type { PlantingCalendar } from './PlantCalendar.ts';
import type { PlantingArea } from './PlantingArea.ts';
import { SEASONS } from './Season.ts';

const EMPTY_SEASON: SeasonPlanData = { ratios: {}, areas: [], status: 'notPlanned' };
const EMPTY_DATA: PlanningData = {
  plants: [],
  plantings: [],
  seasons: { spring: EMPTY_SEASON, summer: EMPTY_SEASON, autumn: EMPTY_SEASON, winter: EMPTY_SEASON },
};

/** Tolerance for rounding: pieces that only touch do not overlap, a piece on the wall is inside */
const EPSILON_CM = 1e-6;

/** The shape of a layer by its index (0 = bottom; boxes and pots have only layer 0) */
export type LayerBounds = (layerIndex: number) => PlantingArea;

/**
 * Planning is the entity for what grows in one component during one year:
 * the plant list and its plantings. A planting starts in one season, gets
 * an area there and is carried into the later seasons it grows in. A plant
 * has at most one planting per start season, a planting at most one area.
 * Ratios and areas belong to plantings. A season whose inputs change after
 * it was laid out becomes outdated. Immutable: every change returns a new Planning.
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

  /** Areas of the plantings that start in the season */
  areasIn(season: Season): readonly AreaData[] {
    return this.data.seasons[season].areas;
  }

  /** A planting's area, in its start season */
  areaOf(plantingId: string): AreaData | undefined {
    const planting = this.plantingById(plantingId);
    return planting === undefined ? undefined : this.areasIn(planting.startSeason).find((a) => a.plantingId === plantingId);
  }

  /** A planting is placed when it has an area */
  isPlaced(plantingId: string): boolean {
    return this.areaOf(plantingId) !== undefined;
  }

  /** Areas of the plantings carried into the season, from their start season */
  carriedAreasIn(season: Season): AreaData[] {
    return this.plantingsCarriedInto(season).flatMap((p) => this.areaOf(p.id) ?? []);
  }

  /** What the optimizer must leave where it is: carried areas and locked areas of the season */
  fixedAreasIn(season: Season): AreaData[] {
    return [...this.carriedAreasIn(season), ...this.areasIn(season).filter((a) => a.locked === true)];
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
   * Moves a planting to another season: its area goes, it starts at ratio 1.
   * @throws Error when the planting is not placed or the season is not available
   */
  movePlanting(plantingId: string, season: Season): Planning {
    const planting = this.placedPlanting(plantingId, season);
    return this.withoutPlanting(plantingId).withPlanting({ id: planting.id, plantId: planting.plantId, startSeason: season });
  }

  /**
   * The result of a layout run: unlocked areas are replaced, locked ones
   * stay (a new area for a planting with a locked area is ignored). Placed
   * plantings starting here keep their growing seasons from now on; unplaced
   * ones follow the calendar again. Later seasons they grow in become outdated.
   */
  applyAreas(season: Season, areas: readonly AreaData[]): Planning {
    const before = this.plantingsStartingIn(season);
    const placed = this.withSeason(season, (plan) => {
      const locked = plan.areas.filter((a) => a.locked === true);
      const lockedPlantings = new Set(locked.map((a) => a.plantingId));
      return { ...plan, areas: [...locked, ...areas.filter((a) => !lockedPlantings.has(a.plantingId))], status: 'planned' };
    });
    const next = placed.with({
      plantings: placed.data.plantings.map((p) => (p.startSeason === season ? placed.withFrozenSeasons(p) : p)),
    });
    const carried = [
      ...before.flatMap((p) => this.growingSeasonsOf(p)),
      ...next.plantingsStartingIn(season).flatMap((p) => next.growingSeasonsOf(p)),
    ].filter((s) => s !== season);
    return next.markedOutdated(carried);
  }

  /**
   * Moves all pieces of an area. Refused (this planning is returned) when a
   * piece would leave its layer's bounding box or overlap another area of
   * the season or an area carried into it.
   */
  moveArea(season: Season, areaId: string, dxCm: number, dyCm: number, bounds: LayerBounds): Planning {
    return this.changeArea(season, areaId, bounds, (area) => ({
      ...area,
      pieces: area.pieces.map((p) => ({ ...p, xCm: p.xCm + dxCm, yCm: p.yCm + dyCm })),
    }));
  }

  /**
   * Gives one piece of an area a new size, keeping its top-left corner.
   * Refused like moveArea, and when the size is not positive or the piece
   * does not exist; the area's own pieces may not overlap either.
   */
  resizeArea(season: Season, areaId: string, pieceIndex: number, widthCm: number, lengthCm: number, bounds: LayerBounds): Planning {
    if (!(widthCm > 0) || !(lengthCm > 0)) {
      return this;
    }
    return this.changeArea(season, areaId, bounds, (area) =>
      pieceIndex >= 0 && pieceIndex < area.pieces.length
        ? { ...area, pieces: area.pieces.map((p, i) => (i === pieceIndex ? { ...p, widthCm, lengthCm } : p)) }
        : area);
  }

  /** Removes an area; its planting stays, unplaced */
  removeArea(season: Season, areaId: string): Planning {
    const area = this.areasIn(season).find((a) => a.id === areaId);
    if (area === undefined) {
      return this;
    }
    return this.withSeason(season, (plan) => ({ ...plan, areas: plan.areas.filter((a) => a.id !== areaId) }))
      .markedOutdated(this.laterSeasonsOf(area.plantingId));
  }

  toggleLock(season: Season, areaId: string): Planning {
    return this.withSeason(season, (plan) => ({
      ...plan,
      areas: plan.areas.map((a) => (a.id === areaId ? { ...a, locked: !(a.locked ?? false) } : a)),
    }));
  }

  setAllLocked(season: Season, locked: boolean): Planning {
    return this.withSeason(season, (plan) => ({ ...plan, areas: plan.areas.map((a) => ({ ...a, locked })) }));
  }

  /**
   * Brings the planning in line with the calendar, on every load and after
   * a new frost date. Placed plantings keep everything (missing fixed
   * seasons are filled in). Exception: a placed planting without fixed
   * seasons (migrated, never frozen) whose start season the plant cannot
   * reach (and the plant reaches some season) is treated as unplaced: its
   * area and ratio go and it follows the rule below. An unplaced planting loses its fixed seasons; when
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

  /** Removes a planting with its ratio and area; the seasons it touched become outdated */
  private withoutPlanting(plantingId: string): Planning {
    const planting = this.plantingById(plantingId);
    if (planting === undefined) {
      return this;
    }
    const touched = [planting.startSeason, ...this.growingSeasonsOf(planting)];
    return this.with({ plantings: this.data.plantings.filter((p) => p.id !== plantingId) })
      .withSeason(planting.startSeason, (plan) => {
        const { [plantingId]: _removed, ...ratios } = plan.ratios;
        return { ...plan, ratios, areas: plan.areas.filter((a) => a.plantingId !== plantingId) };
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

  /** Applies a change to one area when the result is valid (see moveArea); later seasons it grows in become outdated */
  private changeArea(season: Season, areaId: string, bounds: LayerBounds, change: (area: AreaData) => AreaData): Planning {
    const area = this.areasIn(season).find((a) => a.id === areaId);
    if (area === undefined) {
      return this;
    }
    const changed = change(area);
    if (changed === area || !this.fitsBeside(season, changed, bounds)) {
      return this;
    }
    return this.withSeason(season, (plan) => ({
      ...plan,
      areas: plan.areas.map((a) => (a.id === areaId ? changed : a)),
    })).markedOutdated(this.laterSeasonsOf(area.plantingId));
  }

  /** Whether the area lies inside its layer's bounding box, clear of its own other pieces and every other area in the season */
  private fitsBeside(season: Season, area: AreaData, bounds: LayerBounds): boolean {
    const layerIndex = area.layerIndex ?? 0;
    const box = layerBounds(bounds(layerIndex));
    const others = [...this.carriedAreasIn(season), ...this.areasIn(season)]
      .filter((a) => a.id !== area.id && (a.layerIndex ?? 0) === layerIndex)
      .flatMap((a) => a.pieces);
    return area.pieces.every((piece, index) =>
      isInside(piece, box)
      && area.pieces.every((sibling, i) => i === index || !piecesOverlap(piece, sibling))
      && others.every((other) => !piecesOverlap(piece, other)));
  }
}

function isInside(piece: AreaPiece, box: { readonly widthCm: number; readonly lengthCm: number }): boolean {
  return piece.xCm >= -EPSILON_CM && piece.yCm >= -EPSILON_CM
    && piece.xCm + piece.widthCm <= box.widthCm + EPSILON_CM && piece.yCm + piece.lengthCm <= box.lengthCm + EPSILON_CM;
}

function piecesOverlap(a: AreaPiece, b: AreaPiece): boolean {
  return a.xCm + EPSILON_CM < b.xCm + b.widthCm && b.xCm + EPSILON_CM < a.xCm + a.widthCm
    && a.yCm + EPSILON_CM < b.yCm + b.lengthCm && b.yCm + EPSILON_CM < a.yCm + a.lengthCm;
}
