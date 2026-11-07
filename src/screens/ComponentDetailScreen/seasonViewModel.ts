import type { Planning } from '../../domain/planning/Planning.ts';
import { SEASONS } from '../../domain/planning/Season.ts';
import type { AreaShare } from '../../domain/planning/AreaLayout.ts';
import type { Season, SeasonStatus } from '../../types/planning.types.ts';
import { seasonLabel, seasonMonthsLabel } from '../shared/seasonLabels.ts';
import type { Translate } from '../shared/seasonLabels.ts';

export interface SeasonTabView {
  readonly season: Season;
  readonly label: string;
  readonly monthsLabel: string;
  readonly status: SeasonStatus;
  /** Plants that start in this season and can be placed here */
  readonly startingCount: number;
  /** Plants still in the ground from an earlier season */
  readonly carriedCount: number;
  readonly a11yLabel: string;
}

/** Today's season in the current planning year; spring in any other year */
export function defaultSeasonFor(year: number, today: { readonly year: number; readonly season: Season }): Season {
  return year === today.year ? today.season : 'spring';
}

/** The years the year bar can show: one around the current year, and every year with a planning */
export function planningYearRange(currentYear: number, plannedYears: readonly number[]): { first: number; last: number } {
  return {
    first: Math.min(currentYear - 1, ...plannedYears),
    last: Math.max(currentYear + 1, ...plannedYears),
  };
}

export function buildSeasonTabs(planning: Planning, t: Translate): SeasonTabView[] {
  return SEASONS.map((season) => {
    const status = planning.statusOf(season);
    const startingCount = planning.plantingsStartingIn(season).length;
    const carriedCount = planning.plantingsCarriedInto(season).length;
    const label = seasonLabel(season, t);
    const monthsLabel = seasonMonthsLabel(season, t);
    return {
      season,
      label,
      monthsLabel,
      status,
      startingCount,
      carriedCount,
      a11yLabel: t('componentDetail.tabA11y', {
        season: label,
        months: monthsLabel,
        status: t(`season.status.${status}`),
        count: startingCount,
        carried: carriedCount,
      }),
    };
  });
}

/** "792 planten geplaatst · 1 zaaivlak · Tomaat past niet" */
export function optimizeResultMessage(shares: readonly AreaShare[], nameOf: (plantId: string) => string, t: Translate): string {
  const placed = shares.filter((share) => share.fits);
  const plants = placed.reduce((sum, share) => sum + (share.plantCount ?? 0), 0);
  const sown = placed.filter((share) => share.plantCount === null).length;
  const notFitting = shares.filter((share) => !share.fits).map((share) => nameOf(share.plantId));
  const parts = [t('componentDetail.optimized', { count: plants })];
  if (sown > 0) parts.push(t('componentDetail.sownAreas', { count: sown }));
  if (notFitting.length > 0) parts.push(t('componentDetail.doesNotFit', { names: notFitting.join(', ') }));
  return parts.join(' · ');
}
