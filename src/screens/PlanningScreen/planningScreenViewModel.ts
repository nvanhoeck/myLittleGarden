import type { Planning } from '../../domain/planning/Planning.ts';
import { SEASONS, seasonMonths } from '../../domain/planning/Season.ts';
import type { PlantShare } from '../../domain/planning/SeasonPlacement.ts';
import type { Season, SeasonStatus } from '../../types/planning.types.ts';

/** i18next's t, narrowed to what the view models use */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface PlantListItemView {
  readonly plantId: string;
  readonly name: string;
  readonly seasonLabels: readonly string[];
  readonly hasCalendar: boolean;
}

export interface RatioRowView {
  readonly plantId: string;
  readonly name: string;
  readonly ratio: number;
  /** "25%": the share the ratio asks for */
  readonly targetLabel: string;
  /** What the last optimization gave; null when the season was not optimized in this session */
  readonly resultLabel: string | null;
  readonly fits: boolean;
}

export interface CarriedRowView {
  readonly plantId: string;
  readonly name: string;
  readonly label: string;
}

export interface SeasonSectionView {
  readonly season: Season;
  readonly title: string;
  readonly monthsLabel: string;
  readonly status: SeasonStatus;
  readonly statusLabel: string;
  readonly ratioRows: readonly RatioRowView[];
  readonly carriedRows: readonly CarriedRowView[];
  readonly isEmpty: boolean;
}

export function seasonLabel(season: Season, t: Translate): string {
  return t(`season.${season}`);
}

/** "mrt–mei" */
export function seasonMonthsLabel(season: Season, t: Translate): string {
  const { first, last } = seasonMonths(season);
  return t('season.months', { first: t(`planning.month.short.${first}`), last: t(`planning.month.short.${last}`) });
}

export function buildPlantList(planning: Planning, nameOf: (plantId: string) => string, t: Translate): PlantListItemView[] {
  return planning.plants.map((plantId) => {
    const seasons = planning.seasonsOfPlant(plantId);
    return { plantId, name: nameOf(plantId), seasonLabels: seasons.map((s) => seasonLabel(s, t)), hasCalendar: seasons.length > 0 };
  });
}

export function buildSeasonSections(
  planning: Planning,
  nameOf: (plantId: string) => string,
  sharesOf: (season: Season) => readonly PlantShare[] | undefined,
  t: Translate,
): SeasonSectionView[] {
  return SEASONS.map((season) => {
    const starting = planning.plantsStartingIn(season);
    const totalRatio = starting.reduce((sum, plantId) => sum + planning.ratioOf(season, plantId), 0);
    const shares = sharesOf(season);

    const ratioRows = starting.map((plantId): RatioRowView => {
      const ratio = planning.ratioOf(season, plantId);
      const share = shares?.find((s) => s.plantId === plantId);
      const fits = share === undefined || share.count > 0;
      return {
        plantId,
        name: nameOf(plantId),
        ratio,
        targetLabel: t('seasonPlanning.target', { percent: Math.round((ratio / totalRatio) * 100) }),
        resultLabel:
          share === undefined
            ? null
            : fits
              ? t('seasonPlanning.result', {
                  count: share.count,
                  actual: Math.round(share.actualShare * 100),
                  target: Math.round(share.targetShare * 100),
                })
              : t('seasonPlanning.doesNotFit'),
        fits,
      };
    });

    const carriedRows = planning.plantsCarriedInto(season).map((plantId): CarriedRowView => {
      const start = planning.startSeasonOf(plantId) ?? season;
      return { plantId, name: nameOf(plantId), label: t('seasonPlanning.carried', { season: seasonLabel(start, t) }) };
    });

    const status = planning.statusOf(season);
    return {
      season,
      title: seasonLabel(season, t),
      monthsLabel: seasonMonthsLabel(season, t),
      status,
      statusLabel: t(`season.status.${status}`),
      ratioRows,
      carriedRows,
      isEmpty: ratioRows.length === 0 && carriedRows.length === 0,
    };
  });
}
