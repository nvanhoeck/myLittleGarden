import type { Planning } from '../../domain/planning/Planning.ts';
import { SEASONS } from '../../domain/planning/Season.ts';
import type { PlantShare } from '../../domain/planning/SeasonPlacement.ts';
import type { Season } from '../../types/planning.types.ts';
import type { CarriedRowView, RatioRowView, SeasonSectionView } from '../../types/planningViews.types.ts';
import { seasonLabel, seasonMonthsLabel } from '../shared/seasonLabels.ts';
import type { Translate } from '../shared/seasonLabels.ts';

export interface PlantListItemView {
  readonly plantId: string;
  readonly name: string;
  readonly seasonLabels: readonly string[];
  readonly hasCalendar: boolean;
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
    const status = planning.statusOf(season);
    // The last run only says something about a season that is still planned
    const shares = status === 'planned' ? sharesOf(season) : undefined;

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
