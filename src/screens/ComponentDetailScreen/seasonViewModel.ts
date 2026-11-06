import type { Planning } from '../../domain/planning/Planning.ts';
import { SEASONS } from '../../domain/planning/Season.ts';
import type { PlantingShare } from '../../domain/planning/SeasonOptimization.ts';
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

/** "12 planten geplaatst · Tomaat past niet" */
export function optimizeResultMessage(shares: readonly PlantingShare[], nameOf: (plantId: string) => string, t: Translate): string {
  const placed = shares.reduce((sum, share) => sum + share.count, 0);
  const notFitting = shares.filter((share) => share.count === 0).map((share) => nameOf(share.plantId));
  const message = t('componentDetail.optimized', { count: placed });
  return notFitting.length === 0 ? message : `${message} · ${t('componentDetail.doesNotFit', { names: notFitting.join(', ') })}`;
}
