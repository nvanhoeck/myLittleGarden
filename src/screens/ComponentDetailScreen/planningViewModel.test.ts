import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildToPlanGroups,
  buildWeekTimeline,
  defaultSelection,
  planningResultMessage,
  planningYearRange,
  resolveSelection,
} from './planningViewModel.ts';
import type { Translate } from './planningViewModel.ts';
import { PlantingWeek } from '../../domain/planning/PlantingWeek.ts';
import type { TimeZone } from '../../domain/planning/TimeZone.ts';
import type { PlantToPlanData } from '../../types/planning.types.ts';

/**
 * Translates with the real Dutch texts, like i18next does: with a count it
 * picks the `_one` or `_other` plural form when the key has them.
 */
const nl = JSON.parse(readFileSync(new URL('../../i18n/nl.json', import.meta.url), 'utf8')) as Record<string, unknown>;
const lookup = (key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], nl);
const t: Translate = (key, options = {}) => {
  const plural = options.count === undefined ? undefined : lookup(`${key}_${options.count === 1 ? 'one' : 'other'}`);
  const text = plural ?? lookup(key);
  assert.equal(typeof text, 'string', `missing text ${key}`);
  return (text as string).replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options[name]));
};

const zone = (startWeek: number, endWeek: number, plantIds: string[] = []): TimeZone => ({ startWeek, endWeek, plantIds });

/** 2026 has 53 weeks: empty until week 17, three plants in weeks 18-24, then empty */
const zones2026 = [zone(1, 17), zone(18, 24, ['a', 'b', 'c']), zone(25, 53)];

const toPlan = (id: string, plantId: string, fields: Partial<PlantToPlanData> = {}): PlantToPlanData => ({
  id,
  plantId,
  year: 2026,
  ...fields,
});

describe('defaultSelection', () => {
  test('selects the current week in the current year', () => {
    assert.deepEqual(defaultSelection(2026, PlantingWeek.of(2026, 45)), { kind: 'week', week: 45 });
  });

  test('selects week 1 in another year', () => {
    assert.deepEqual(defaultSelection(2027, PlantingWeek.of(2026, 45)), { kind: 'week', week: 1 });
  });
});

describe('resolveSelection', () => {
  test('keeps a zone that still starts at the selected week', () => {
    assert.deepEqual(resolveSelection({ kind: 'zone', startWeek: 18 }, zones2026), { kind: 'zone', startWeek: 18 });
  });

  test('falls back to the week when the zone no longer exists, e.g. after a rearrange', () => {
    assert.deepEqual(resolveSelection({ kind: 'zone', startWeek: 20 }, zones2026), { kind: 'week', week: 20 });
  });

  test('keeps a week selection', () => {
    assert.deepEqual(resolveSelection({ kind: 'week', week: 30 }, zones2026), { kind: 'week', week: 30 });
  });

  test('moves a week beyond the last week of the year to the last week', () => {
    assert.deepEqual(resolveSelection({ kind: 'week', week: 53 }, [zone(1, 52)]), { kind: 'week', week: 52 });
  });
});

describe('buildWeekTimeline', () => {
  const today = PlantingWeek.of(2026, 45);

  test('has one slot per ISO week with the week label and the Monday as date', () => {
    const view = buildWeekTimeline({ year: 2026, zones: zones2026, selection: { kind: 'week', week: 18 }, today, t });

    assert.equal(view.weeks.length, 53);
    const week18 = view.weeks[17];
    assert.equal(week18.id, '2026-18');
    assert.equal(week18.weekLabel, 'W18');
    assert.equal(week18.dateLabel, '27 apr');
    assert.equal(view.weeks[0].dateLabel, '29 dec');
  });

  test('marks weeks with plants and the current week', () => {
    const view = buildWeekTimeline({ year: 2026, zones: zones2026, selection: { kind: 'week', week: 1 }, today, t });

    assert.equal(view.weeks[17].hasPlants, true);
    assert.equal(view.weeks[16].hasPlants, false);
    assert.equal(view.weeks[44].isCurrent, true);
    assert.equal(view.weeks[43].isCurrent, false);
  });

  test('does not mark a current week in another year', () => {
    const view = buildWeekTimeline({ year: 2027, zones: [zone(1, 52)], selection: { kind: 'week', week: 1 }, today, t });
    assert.equal(view.weeks.some((week) => week.isCurrent), false);
  });

  test('a selected week is the only selected slot and marks its zone', () => {
    const view = buildWeekTimeline({ year: 2026, zones: zones2026, selection: { kind: 'week', week: 20 }, today, t });

    assert.deepEqual(view.weeks.filter((week) => week.isSelected).map((week) => week.week), [20]);
    assert.equal(view.weeks.some((week) => week.isInZone), false);
    assert.deepEqual(view.zones.map((z) => z.containsSelectedWeek), [false, true, false]);
    assert.equal(view.zones.some((z) => z.isSelected), false);
    assert.deepEqual(view.selection, { kind: 'week', index: 19 });
  });

  test('a selected zone tints its weeks and is the selected segment', () => {
    const view = buildWeekTimeline({ year: 2026, zones: zones2026, selection: { kind: 'zone', startWeek: 18 }, today, t });

    assert.deepEqual(view.weeks.filter((week) => week.isInZone).map((week) => week.week), [18, 19, 20, 21, 22, 23, 24]);
    assert.equal(view.weeks.some((week) => week.isSelected), false);
    assert.deepEqual(view.zones.map((z) => z.isSelected), [false, true, false]);
    assert.deepEqual(view.selection, { kind: 'zone', index: 1 });
  });

  test('describes a slot for accessibility, including the selection', () => {
    const view = buildWeekTimeline({ year: 2026, zones: zones2026, selection: { kind: 'week', week: 18 }, today, t });

    assert.equal(view.weeks[17].accessibilityLabel, 'Week 18, 27 april tot 3 mei, 3 planten, geselecteerd');
    assert.equal(view.weeks[18].accessibilityLabel, 'Week 19, 4 mei tot 10 mei, 3 planten');
  });

  test('labels zones by their plant count, short when under 2 weeks wide, and empty zones as empty', () => {
    const view = buildWeekTimeline({
      year: 2026,
      zones: [zone(1, 17), zone(18, 18, ['a', 'b']), zone(19, 24, ['a', 'b', 'c']), zone(25, 53)],
      selection: { kind: 'week', week: 1 },
      today,
      t,
    });

    assert.deepEqual(view.zones.map((z) => z.label), ['leeg', '2', '3 planten', 'leeg']);
    assert.deepEqual(view.zones.map((z) => z.isEmpty), [true, false, false, true]);
    assert.deepEqual(view.zones.map((z) => z.weekCount), [17, 1, 6, 29]);
    assert.deepEqual(view.zones.map((z) => z.tone), [0, 1, 0, 1]);
    assert.equal(view.zones[2].accessibilityLabel, 'Zone week 19 tot 24, 3 planten');
  });

  test('captions a week with its date range and a zone with its weeks and plants', () => {
    const week = buildWeekTimeline({ year: 2026, zones: zones2026, selection: { kind: 'week', week: 18 }, today, t });
    const zoneView = buildWeekTimeline({ year: 2026, zones: zones2026, selection: { kind: 'zone', startWeek: 18 }, today, t });

    assert.equal(week.caption, 'W18 · 27 apr – 3 mei');
    assert.equal(zoneView.caption, 'W18 - W24 · 3 planten');
  });
});

describe('planningYearRange', () => {
  test('spans last year to next year without plans', () => {
    assert.deepEqual(planningYearRange(2026, []), { first: 2025, last: 2027 });
  });

  test('widens to the years that have plants', () => {
    assert.deepEqual(planningYearRange(2026, [2023, 2026, 2029]), { first: 2023, last: 2029 });
  });
});

describe('buildToPlanGroups', () => {
  const nameOf = (plantId: string): string => ({ sla: 'Sla', tomaat: 'Tomaat' })[plantId] ?? plantId;

  test('groups the items per plant in the order they were added, removing the last added one', () => {
    const groups = buildToPlanGroups([toPlan('1', 'sla'), toPlan('2', 'tomaat'), toPlan('3', 'sla')], [], nameOf, t);

    assert.deepEqual(
      groups.map((g) => [g.plantId, g.name, g.count, g.removeId]),
      [['sla', 'Sla', 2, '3'], ['tomaat', 'Tomaat', 1, '2']],
    );
    assert.equal(groups[0].removeAccessibilityLabel, 'Sla verwijderen uit te plannen lijst');
    assert.equal(groups[0].removeConfirmText, 'Sla verwijderen?');
  });

  test('shows "not yet planned" in a muted tone before any run', () => {
    const [group] = buildToPlanGroups([toPlan('1', 'sla')], [], nameOf, t);

    assert.equal(group.reasonText, 'Nog niet ingepland');
    assert.equal(group.reasonTone, 'muted');
  });

  test('shows the reasons of the last run in a warning tone', () => {
    const groups = buildToPlanGroups(
      [toPlan('1', 'sla'), toPlan('2', 'tomaat'), toPlan('3', 'tomaat')],
      [
        { id: '1', reason: 'noSpace', weeks: { startWeek: 18, endWeek: 24 } },
        { id: '2', reason: 'noPlantingWindow' },
        { id: '3', reason: 'noSpace' },
      ],
      nameOf,
      t,
    );

    assert.deepEqual(groups.map((g) => [g.reasonText, g.reasonTone]), [
      ['Geen plaats in week 18-24', 'warning'],
      ['Geen plantperiode bekend · Geen plaats', 'warning'],
    ]);
  });
});

describe('planningResultMessage', () => {
  test('reports placed and unplaced plants with a view action', () => {
    assert.deepEqual(planningResultMessage({ placed: 8, unplaced: 2 }, t), {
      message: '8 geplaatst, 2 passen niet',
      showViewAction: true,
    });
  });

  test('uses the singular when one plant does not fit', () => {
    assert.equal(planningResultMessage({ placed: 8, unplaced: 1 }, t).message, '8 geplaatst, 1 past niet');
  });

  test('reports when everything is placed', () => {
    assert.deepEqual(planningResultMessage({ placed: 8, unplaced: 0 }, t), {
      message: 'Alles geplaatst (8)',
      showViewAction: false,
    });
  });

  test('reports when nothing could be placed', () => {
    assert.deepEqual(planningResultMessage({ placed: 0, unplaced: 3 }, t), {
      message: 'Niets kon worden geplaatst',
      showViewAction: true,
    });
  });
});

describe('Dutch plurals', () => {
  test('a zone and a week with one plant use the singular', () => {
    const view = buildWeekTimeline({
      year: 2026,
      zones: [zone(1, 17), zone(18, 24, ['a']), zone(25, 53)],
      selection: { kind: 'zone', startWeek: 18 },
      today: PlantingWeek.of(2026, 45),
      t,
    });

    assert.equal(view.zones[1].label, '1 plant');
    assert.equal(view.zones[1].accessibilityLabel, 'Zone week 18 tot 24, 1 plant');
    assert.equal(view.weeks[17].accessibilityLabel, 'Week 18, 27 april tot 3 mei, 1 plant');
    assert.equal(view.caption, 'W18 - W24 · 1 plant');
  });
});
