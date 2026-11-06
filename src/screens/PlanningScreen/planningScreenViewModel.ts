import type { Planning } from '../../domain/planning/Planning.ts';
import { SEASONS } from '../../domain/planning/Season.ts';
import type { PlantingShare } from '../../domain/planning/SeasonOptimization.ts';
import type { PlantingData, Season } from '../../types/planning.types.ts';
import type { CarriedRowView, PlantingMenuItemView, PlantingMenuView, RatioRowView, SeasonSectionView } from '../../types/planningViews.types.ts';
import { seasonLabel, seasonMonthsLabel } from '../shared/seasonLabels.ts';
import type { Translate } from '../shared/seasonLabels.ts';

export interface PlantListItemView {
  readonly plantId: string;
  readonly name: string;
  /** "Lente · Zomer (2e teelt)", or the reason the plant has no plantings */
  readonly detail: string;
  readonly detailKind: 'plantings' | 'noCalendar' | 'outsideYear';
}

/** "Sla" for a plant's first planting, "Sla (2e teelt)" for the next */
export function plantingName(planning: Planning, plantingId: string, nameOf: (plantId: string) => string, t: Translate): string {
  const planting = planning.plantingById(plantingId);
  if (planting === undefined) {
    return plantingId;
  }
  const number = planning.plantingNumberOf(plantingId);
  const name = nameOf(planting.plantId);
  return number > 1 ? t('seasonPlanning.plantingNumber', { name, number }) : name;
}

export function buildPlantList(planning: Planning, nameOf: (plantId: string) => string, t: Translate): PlantListItemView[] {
  return planning.plants.map((plantId) => {
    const plantings = planning.plantingsOf(plantId);
    if (plantings.length > 0) {
      const detail = plantings
        .map((p, index) => (index === 0 ? seasonLabel(p.startSeason, t) : `${seasonLabel(p.startSeason, t)} (${index + 1}e teelt)`))
        .join(' · ');
      return { plantId, name: nameOf(plantId), detail, detailKind: 'plantings' };
    }
    return planning.hasCalendar(plantId)
      ? { plantId, name: nameOf(plantId), detail: t('seasonPlanning.outsideYear'), detailKind: 'outsideYear' }
      : { plantId, name: nameOf(plantId), detail: t('seasonPlanning.noCalendar'), detailKind: 'noCalendar' };
  });
}

/** Duplicate and move to every available season (placed plantings only), and remove */
function menuOf(planning: Planning, planting: PlantingData, t: Translate): PlantingMenuView {
  const isPlaced = planning.isPlaced(planting.id);
  const available = isPlaced ? planning.seasonsAvailableFor(planting.id) : [];
  const lower = (season: Season): string => seasonLabel(season, t).toLowerCase();
  const items: PlantingMenuItemView[] = [
    ...available.map((season): PlantingMenuItemView => ({
      key: `duplicate-${season}`,
      label: t('seasonPlanning.duplicateTo', { season: lower(season) }),
      kind: 'duplicate',
      season,
      testID: `planting-action-duplicate-${season}`,
    })),
    ...available.map((season): PlantingMenuItemView => ({
      key: `move-${season}`,
      label: t('seasonPlanning.moveTo', { season: lower(season) }),
      kind: 'move',
      season,
      testID: `planting-action-move-${season}`,
    })),
    {
      key: 'remove',
      label: t('seasonPlanning.removeFrom', { season: lower(planting.startSeason) }),
      kind: 'remove',
      season: planting.startSeason,
      testID: 'planting-action-remove',
    },
  ];
  return { isPlaced, isLastPlanting: planning.plantingsOf(planting.plantId).length === 1, items };
}

export function buildSeasonSections(
  planning: Planning,
  nameOf: (plantId: string) => string,
  sharesOf: (season: Season) => readonly PlantingShare[] | undefined,
  t: Translate,
): SeasonSectionView[] {
  return SEASONS.map((season) => {
    const starting = planning.plantingsStartingIn(season);
    const totalRatio = starting.reduce((sum, p) => sum + planning.ratioOf(season, p.id), 0);
    const status = planning.statusOf(season);
    // The last run only says something about a season that is still planned
    const shares = status === 'planned' ? sharesOf(season) : undefined;

    const ratioRows = starting.map((planting): RatioRowView => {
      const ratio = planning.ratioOf(season, planting.id);
      const share = shares?.find((s) => s.plantingId === planting.id);
      const fits = share === undefined || share.count > 0;
      return {
        plantingId: planting.id,
        plantId: planting.plantId,
        name: plantingName(planning, planting.id, nameOf, t),
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
        menu: menuOf(planning, planting, t),
      };
    });

    const carriedRows = planning.plantingsCarriedInto(season).map((planting): CarriedRowView => ({
      plantingId: planting.id,
      plantId: planting.plantId,
      name: plantingName(planning, planting.id, nameOf, t),
      label: t('seasonPlanning.carried', { season: seasonLabel(planting.startSeason, t) }),
    }));

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
