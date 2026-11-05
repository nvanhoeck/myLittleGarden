import { seasonMonths } from '../../domain/planning/Season.ts';
import type { Season } from '../../types/planning.types.ts';

/** i18next's t, narrowed to what the view models use */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

export function seasonLabel(season: Season, t: Translate): string {
  return t(`season.${season}`);
}

/** "mrt–mei" */
export function seasonMonthsLabel(season: Season, t: Translate): string {
  const { first, last } = seasonMonths(season);
  return t('season.months', { first: t(`planning.month.short.${first}`), last: t(`planning.month.short.${last}`) });
}
