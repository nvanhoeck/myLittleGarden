import type { Planning } from '../../domain/planning/Planning.ts';
import { SEASONS } from '../../domain/planning/Season.ts';
import type { AreaShare } from '../../domain/planning/AreaLayout.ts';
import type { AreaData, PlantingData, Season } from '../../types/planning.types.ts';
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

/** "0,4" below 10 m², "13" above */
export function formatSquareMetres(squareCm: number): string {
  const m2 = squareCm / 10000;
  return m2 < 10 ? String(Math.round(m2 * 10) / 10).replace('.', ',') : String(Math.round(m2));
}

function squareCmOf(area: AreaData): number {
  return area.pieces.reduce((sum, piece) => sum + piece.widthCm * piece.lengthCm, 0);
}

/**
 * A locked area was not laid out again, so it has no share: it says
 * "vergrendeld" with what its area holds. Otherwise the last run's share,
 * with the plants (or the sown m²) of the planting's current area.
 */
function resultLabelOf(
  share: AreaShare | undefined,
  area: AreaData | undefined,
  plantCountOfArea: (area: AreaData) => number | null,
  t: Translate,
): string | null {
  if (area?.locked === true) {
    const count = plantCountOfArea(area);
    return count === null
      ? t('seasonPlanning.lockedSown', { m2: formatSquareMetres(squareCmOf(area)) })
      : t('seasonPlanning.locked', { count });
  }
  if (share === undefined) return null;
  if (!share.fits) return t('seasonPlanning.doesNotFit');
  const count = area === undefined ? share.plantCount : plantCountOfArea(area);
  if (count === null) return t('seasonPlanning.resultSown', { m2: formatSquareMetres(area === undefined ? 0 : squareCmOf(area)) });
  return t('seasonPlanning.result', {
    count,
    actual: Math.round(share.actualShare * 100),
    target: Math.round(share.targetShare * 100),
  });
}

export function buildSeasonSections(
  planning: Planning,
  nameOf: (plantId: string) => string,
  sharesOf: (season: Season) => readonly AreaShare[] | undefined,
  plantCountOfArea: (area: AreaData) => number | null,
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
      const area = planning.areaOf(planting.id);
      const fits = area?.locked === true || share === undefined || share.fits;
      return {
        plantingId: planting.id,
        plantId: planting.plantId,
        name: plantingName(planning, planting.id, nameOf, t),
        ratio,
        targetLabel: t('seasonPlanning.target', { percent: Math.round((ratio / totalRatio) * 100) }),
        resultLabel: resultLabelOf(share, area, plantCountOfArea, t),
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
