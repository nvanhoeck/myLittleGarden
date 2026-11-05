import { PlantingWeek } from '../../domain/planning/PlantingWeek.ts';
import type { TimeZone } from '../../domain/planning/TimeZone.ts';
import type { UnplacedCandidate } from '../../domain/planning/AutoPlacement.ts';
import type { PlanningRunCounts } from '../../domain/planning/ComponentPlanning.ts';
import type { PlantToPlanData } from '../../types/planning.types.ts';

/**
 * View models for the time planning part of the Component Detail screen:
 * the week strip, the zone band, the "to plan" list and the result of a
 * planning run. Pure, so the Dutch texts and the selection rules are unit-tested.
 */

/** i18next's `t`, narrowed to what the view models need */
export type Translate = (key: string, options?: Record<string, string | number>) => string;

/** What the user selected in the timeline: a single week, or a time zone by its first week */
export type PlanningSelection =
  | { readonly kind: 'week'; readonly week: number }
  | { readonly kind: 'zone'; readonly startWeek: number };

export interface WeekSlotView {
  /** "{year}-{week}", also used in the testID */
  readonly id: string;
  readonly week: number;
  readonly weekLabel: string;
  readonly dateLabel: string;
  readonly hasPlants: boolean;
  readonly isCurrent: boolean;
  readonly isSelected: boolean;
  readonly isInZone: boolean;
  readonly accessibilityLabel: string;
}

export interface ZoneSegmentView {
  readonly startWeek: number;
  readonly endWeek: number;
  readonly weekCount: number;
  readonly label: string;
  readonly isEmpty: boolean;
  readonly isSelected: boolean;
  /** The selected single week lies in this zone */
  readonly containsSelectedWeek: boolean;
  readonly tone: 0 | 1;
  readonly accessibilityLabel: string;
}

export interface WeekTimelineView {
  readonly weeks: readonly WeekSlotView[];
  readonly zones: readonly ZoneSegmentView[];
  /** Index in `weeks` or `zones` of the selection, for scrolling */
  readonly selection: { readonly kind: 'week' | 'zone'; readonly index: number };
  /** "W18 · 27 apr – 3 mei" or "W18 - W24 · 3 planten" */
  readonly caption: string;
}

export interface ToPlanGroupView {
  readonly plantId: string;
  readonly name: string;
  readonly count: number;
  readonly reasonText: string;
  /** warning after a run that could not place the plant; muted before any run */
  readonly reasonTone: 'warning' | 'muted';
  /** The item a tap on remove takes off the list: the last one added */
  readonly removeId: string;
  readonly removeAccessibilityLabel: string;
  readonly removeConfirmText: string;
}

export interface PlanningResultView {
  readonly message: string;
  /** Offer to open the "to plan" list when something did not fit */
  readonly showViewAction: boolean;
}

/** Zones narrower than this many weeks only show the plant count */
const SHORT_ZONE_LABEL_WEEKS = 2;

/** "27 apr" (short) or "27 april" (long); the month names come from i18n */
function dayLabel(date: Date, length: 'short' | 'long', t: Translate): string {
  return `${date.getUTCDate()} ${t(`planning.month.${length}.${date.getUTCMonth() + 1}`)}`;
}

/** The current week in the current year, week 1 in any other year */
export function defaultSelection(year: number, today: PlantingWeek): PlanningSelection {
  return { kind: 'week', week: today.year === year ? today.week : 1 };
}

/**
 * Keeps the selection valid for the zones of the year: a zone that no longer
 * starts at the selected week (the layout changed) becomes that week, and a
 * week beyond the year's last week becomes the last week.
 */
export function resolveSelection(selection: PlanningSelection, zones: readonly TimeZone[]): PlanningSelection {
  const lastWeek = zones[zones.length - 1]?.endWeek ?? 1;
  if (selection.kind === 'zone') {
    return zones.some((zone) => zone.startWeek === selection.startWeek)
      ? selection
      : { kind: 'week', week: Math.min(selection.startWeek, lastWeek) };
  }
  return selection.week > lastWeek ? { kind: 'week', week: lastWeek } : selection;
}

/** The week the canvas shows: the selected week, or the first week of the selected zone */
export function displayedWeekOf(selection: PlanningSelection): number {
  return selection.kind === 'week' ? selection.week : selection.startWeek;
}

/** The week strip, zone band and caption of a year; zones must cover every week of the year */
export function buildWeekTimeline(input: {
  readonly year: number;
  readonly zones: readonly TimeZone[];
  readonly selection: PlanningSelection;
  readonly today: PlantingWeek;
  readonly t: Translate;
}): WeekTimelineView {
  const { year, zones, selection, today, t } = input;
  const selectedZone = selection.kind === 'zone' ? zones.find((zone) => zone.startWeek === selection.startWeek) : undefined;
  const selectedWeek = selection.kind === 'week' ? selection.week : undefined;

  const weeks = zones.flatMap((zone) =>
    Array.from({ length: zone.endWeek - zone.startWeek + 1 }, (_, offset): WeekSlotView => {
      const weekNumber = zone.startWeek + offset;
      const week = PlantingWeek.of(year, weekNumber);
      const count = zone.plantIds.length;
      const isSelected = weekNumber === selectedWeek;
      const range = t('planning.week.range', {
        start: dayLabel(week.firstDay(), 'long', t),
        end: dayLabel(week.lastDay(), 'long', t),
      });
      const description = t('planning.week.a11y', { week: weekNumber, range, count });
      return {
        id: `${year}-${weekNumber}`,
        week: weekNumber,
        weekLabel: t('planning.week.label', { week: weekNumber }),
        dateLabel: dayLabel(week.firstDay(), 'short', t),
        hasPlants: count > 0,
        isCurrent: week.equals(today),
        isSelected,
        isInZone: zone === selectedZone,
        accessibilityLabel: isSelected ? `${description}, ${t('planning.week.selected')}` : description,
      };
    }),
  );

  const zoneViews = zones.map((zone, index): ZoneSegmentView => {
    const weekCount = zone.endWeek - zone.startWeek + 1;
    const count = zone.plantIds.length;
    const countLabel = weekCount < SHORT_ZONE_LABEL_WEEKS ? String(count) : t('planning.zone.plants', { count });
    return {
      startWeek: zone.startWeek,
      endWeek: zone.endWeek,
      weekCount,
      label: count === 0 ? t('planning.zone.empty') : countLabel,
      isEmpty: count === 0,
      isSelected: zone === selectedZone,
      containsSelectedWeek: selectedWeek !== undefined && zone.startWeek <= selectedWeek && selectedWeek <= zone.endWeek,
      tone: index % 2 === 0 ? 0 : 1,
      accessibilityLabel: t('planning.zone.a11y', { start: zone.startWeek, end: zone.endWeek, count }),
    };
  });

  return {
    weeks,
    zones: zoneViews,
    selection: selectedZone !== undefined
      ? { kind: 'zone', index: zones.indexOf(selectedZone) }
      : { kind: 'week', index: Math.max(0, weeks.findIndex((week) => week.isSelected)) },
    caption: selectedZone !== undefined
      ? t('planning.zone.caption', { start: selectedZone.startWeek, end: selectedZone.endWeek, count: selectedZone.plantIds.length })
      : weekCaption(year, displayedWeekOf(selection), t),
  };
}

function weekCaption(year: number, weekNumber: number, t: Translate): string {
  const week = PlantingWeek.of(year, weekNumber);
  return t('planning.week.caption', {
    week: weekNumber,
    start: dayLabel(week.firstDay(), 'short', t),
    end: dayLabel(week.lastDay(), 'short', t),
  });
}

/** The years the year bar can show: last year to next year, widened to every year that has plants */
export function planningYearRange(currentYear: number, plannedYears: readonly number[]): { first: number; last: number } {
  return {
    first: Math.min(currentYear - 1, ...plannedYears),
    last: Math.max(currentYear + 1, ...plannedYears),
  };
}

function reasonText(unplaced: UnplacedCandidate, t: Translate): string {
  if (unplaced.reason === 'noPlantingWindow') {
    return t('planning.reason.noPlantingWindow');
  }
  return unplaced.weeks !== undefined
    ? t('planning.reason.noSpace', { start: unplaced.weeks.startWeek, end: unplaced.weeks.endWeek })
    : t('planning.reason.noSpaceAnyWeek');
}

/**
 * The "to plan" list, one row per plant in the order the plants were added.
 * The reasons come from the last run; an item the last run did not see is not planned yet.
 */
export function buildToPlanGroups(
  items: readonly PlantToPlanData[],
  unplaced: readonly UnplacedCandidate[],
  nameOf: (plantId: string) => string,
  t: Translate,
): ToPlanGroupView[] {
  const unplacedById = new Map(unplaced.map((candidate) => [candidate.id, candidate]));
  const itemsByPlant = new Map<string, PlantToPlanData[]>();
  for (const item of items) {
    itemsByPlant.set(item.plantId, [...(itemsByPlant.get(item.plantId) ?? []), item]);
  }

  return [...itemsByPlant].map(([plantId, group]) => {
    const name = nameOf(plantId);
    const reasons = [...new Set(group.flatMap((item) => {
      const candidate = unplacedById.get(item.id);
      return candidate !== undefined ? [reasonText(candidate, t)] : [];
    }))];
    return {
      plantId,
      name,
      count: group.length,
      reasonText: reasons.length > 0 ? reasons.join(' · ') : t('planning.toPlan.notYetPlanned'),
      reasonTone: reasons.length > 0 ? 'warning' : 'muted',
      removeId: group[group.length - 1].id,
      removeAccessibilityLabel: t('planning.toPlan.remove', { name }),
      removeConfirmText: t('planning.toPlan.removeConfirm', { name }),
    };
  });
}

/** The snackbar text for the counts a run reported */
export function planningResultMessage(counts: PlanningRunCounts, t: Translate): PlanningResultView {
  const { placed, unplaced } = counts;
  if (placed === 0) {
    return { message: t('planning.result.nonePlaced'), showViewAction: unplaced > 0 };
  }
  if (unplaced === 0) {
    return { message: t('planning.result.allPlaced', { count: placed }), showViewAction: false };
  }
  return { message: t('planning.result.placed', { placed, count: unplaced }), showViewAction: true };
}
