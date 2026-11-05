import type { PlacementData, PlanningData, Season, SeasonPlanData, SeasonStatus } from '../../types/planning.types.ts';
import { SEASONS, seasonsAfter } from './Season.ts';
import type { SeasonsOf } from './Season.ts';

const EMPTY_SEASON: SeasonPlanData = { ratios: {}, placements: [], status: 'notPlanned' };

/**
 * Planning is the entity for what grows in one component during one year:
 * the plant list and, per season, the ratios and placements of the plants
 * that start in that season. A plant's seasons come from its calendar
 * (seasonsOf): it is placed in its first season and stays put in the later
 * ones. A season whose inputs change after it was placed becomes outdated.
 * Immutable: every change returns a new Planning.
 */
export class Planning {
  private readonly data: PlanningData;
  private readonly seasonsOf: SeasonsOf;

  private constructor(data: PlanningData, seasonsOf: SeasonsOf) {
    this.data = data;
    this.seasonsOf = seasonsOf;
  }

  static empty(seasonsOf: SeasonsOf): Planning {
    return new Planning(
      { plants: [], seasons: { spring: EMPTY_SEASON, summer: EMPTY_SEASON, autumn: EMPTY_SEASON, winter: EMPTY_SEASON } },
      seasonsOf,
    );
  }

  /** A stored planning; a year without one is an empty planning */
  static from(data: PlanningData | undefined, seasonsOf: SeasonsOf): Planning {
    return data === undefined ? Planning.empty(seasonsOf) : new Planning(data, seasonsOf);
  }

  toData(): PlanningData {
    return this.data;
  }

  get plants(): readonly string[] {
    return this.data.plants;
  }

  seasonsOfPlant(plantId: string): readonly Season[] {
    return this.seasonsOf(plantId);
  }

  /** The season the plant is placed in; null when it has no calendar */
  startSeasonOf(plantId: string): Season | null {
    return this.seasonsOf(plantId)[0] ?? null;
  }

  plantsStartingIn(season: Season): string[] {
    return this.data.plants.filter((plantId) => this.startSeasonOf(plantId) === season);
  }

  /** Plants still in the ground from an earlier season */
  plantsCarriedInto(season: Season): string[] {
    return this.data.plants.filter(
      (plantId) => this.startSeasonOf(plantId) !== season && this.seasonsOf(plantId).includes(season),
    );
  }

  statusOf(season: Season): SeasonStatus {
    return this.data.seasons[season].status;
  }

  ratioOf(season: Season, plantId: string): number {
    return this.data.seasons[season].ratios[plantId] ?? 1;
  }

  /** Placements of the plants that start in the season */
  placementsIn(season: Season): readonly PlacementData[] {
    return this.data.seasons[season].placements;
  }

  /** Placements of the plants carried into the season, from their start season */
  carriedPlacementsIn(season: Season): PlacementData[] {
    return this.plantsCarriedInto(season).flatMap((plantId) => {
      const start = this.startSeasonOf(plantId);
      return start === null ? [] : this.data.seasons[start].placements.filter((p) => p.plantId === plantId);
    });
  }

  /** What the optimizer must leave where it is: carried placements and locked placements of the season */
  fixedPlacementsIn(season: Season): PlacementData[] {
    return [...this.carriedPlacementsIn(season), ...this.placementsIn(season).filter((p) => p.locked === true)];
  }

  addPlants(plantIds: readonly string[]): Planning {
    const added = plantIds.filter((id, index) => !this.data.plants.includes(id) && plantIds.indexOf(id) === index);
    if (added.length === 0) {
      return this;
    }
    let next = this.with({ plants: [...this.data.plants, ...added] });
    for (const plantId of added) {
      const start = next.startSeasonOf(plantId);
      if (start !== null) {
        next = next.withSeason(start, (plan) => ({ ...plan, ratios: { ...plan.ratios, [plantId]: 1 } })).markedOutdated([start]);
      }
    }
    return next;
  }

  removePlant(plantId: string): Planning {
    if (!this.data.plants.includes(plantId)) {
      return this;
    }
    const withoutPlant = (plan: SeasonPlanData): SeasonPlanData => {
      const { [plantId]: _removed, ...ratios } = plan.ratios;
      return { ...plan, ratios, placements: plan.placements.filter((p) => p.plantId !== plantId) };
    };
    const seasons: Record<Season, SeasonPlanData> = {
      spring: withoutPlant(this.data.seasons.spring),
      summer: withoutPlant(this.data.seasons.summer),
      autumn: withoutPlant(this.data.seasons.autumn),
      winter: withoutPlant(this.data.seasons.winter),
    };
    return new Planning({ plants: this.data.plants.filter((id) => id !== plantId), seasons }, this.seasonsOf).markedOutdated(
      this.seasonsOf(plantId),
    );
  }

  /**
   * @throws Error when the plant does not start in the season or the ratio
   * is not a whole number of at least 1
   */
  setRatio(season: Season, plantId: string, ratio: number): Planning {
    if (!Number.isInteger(ratio) || ratio < 1) {
      throw new Error(`Ongeldige verhouding ${ratio}`);
    }
    if (!this.data.plants.includes(plantId) || this.startSeasonOf(plantId) !== season) {
      throw new Error(`${plantId} start niet in ${season}`);
    }
    if (this.ratioOf(season, plantId) === ratio) {
      return this;
    }
    return this.withSeason(season, (plan) => ({ ...plan, ratios: { ...plan.ratios, [plantId]: ratio } })).markedOutdated([season]);
  }

  /** The result of a placement run: unlocked placements are replaced, locked ones stay */
  applyPlacement(season: Season, placements: readonly PlacementData[]): Planning {
    return this.withSeason(season, (plan) => ({
      ...plan,
      placements: [...plan.placements.filter((p) => p.locked === true), ...placements],
      status: 'planned',
    })).markedOutdated(this.seasonsCarriedFrom(season));
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
      .markedOutdated(this.laterSeasonsOf(placement.plantId));
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
   * After the plants' seasons changed (a new frost date): a ratio kept under
   * a season that is no longer the plant's start season moves to the new
   * start season, its placements there are dropped, and the seasons
   * involved become outdated. Afterwards every planned season that holds
   * plants becomes outdated too, because its plants' seasons may have moved.
   * Returns this planning when nothing changes.
   */
  reconciled(): Planning {
    let next: Planning = this;
    for (const season of SEASONS) {
      const plan = this.data.seasons[season];
      const misplaced = new Set(
        [...Object.keys(plan.ratios), ...plan.placements.map((p) => p.plantId)].filter(
          (plantId) => this.startSeasonOf(plantId) !== season,
        ),
      );
      for (const plantId of misplaced) {
        const ratio = plan.ratios[plantId];
        const start = this.startSeasonOf(plantId);
        next = next.withSeason(season, (current) => {
          const { [plantId]: _moved, ...ratios } = current.ratios;
          return { ...current, ratios, placements: current.placements.filter((p) => p.plantId !== plantId) };
        });
        if (start !== null && ratio !== undefined && this.data.plants.includes(plantId)) {
          // A ratio already set in the new start season wins
          next = next.withSeason(start, (current) => ({ ...current, ratios: { [plantId]: ratio, ...current.ratios } }));
        }
        next = next.markedOutdated([season, ...seasonsAfter(season), ...this.seasonsOf(plantId)]);
      }
    }
    for (const plantId of this.data.plants) {
      next = next.markedOutdated(this.seasonsOf(plantId));
    }
    return next;
  }

  private with(changes: Partial<PlanningData>): Planning {
    return new Planning({ ...this.data, ...changes }, this.seasonsOf);
  }

  private withSeason(season: Season, change: (plan: SeasonPlanData) => SeasonPlanData): Planning {
    return this.with({ seasons: { ...this.data.seasons, [season]: change(this.data.seasons[season]) } });
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

  /** The seasons a plant grows in after its start season */
  private laterSeasonsOf(plantId: string): Season[] {
    return this.seasonsOf(plantId).slice(1);
  }

  /** The later seasons holding plants that start in this season */
  private seasonsCarriedFrom(season: Season): Season[] {
    return this.plantsStartingIn(season).flatMap((plantId) => this.laterSeasonsOf(plantId));
  }

  private changePlacement(season: Season, placementId: string, change: (placement: PlacementData) => PlacementData): Planning {
    const placement = this.placementsIn(season).find((p) => p.id === placementId);
    if (placement === undefined) {
      return this;
    }
    return this.withSeason(season, (plan) => ({
      ...plan,
      placements: plan.placements.map((p) => (p.id === placementId ? change(p) : p)),
    })).markedOutdated(this.laterSeasonsOf(placement.plantId));
  }
}
