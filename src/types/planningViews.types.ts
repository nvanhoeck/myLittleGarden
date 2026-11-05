import type { Season, SeasonStatus } from './planning.types.ts';

/**
 * View-model output types of the planning screens: what the components draw
 */

export interface RatioRowView {
  readonly plantId: string;
  readonly name: string;
  readonly ratio: number;
  /** "25%": the share the ratio asks for */
  readonly targetLabel: string;
  /** What the last optimization gave; null when the season is not planned or was not optimized in this session */
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
