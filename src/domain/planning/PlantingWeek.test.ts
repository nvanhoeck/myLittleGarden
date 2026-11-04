import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PlantingWeek } from './PlantingWeek.ts';

const utc = (year: number, month: number, day: number): Date => new Date(Date.UTC(year, month - 1, day));

describe('PlantingWeek', () => {
  test('given a mid-year date, returns its ISO week in the same year', () => {
    const week = PlantingWeek.containing(utc(2026, 5, 4));
    assert.equal(week.year, 2026);
    assert.equal(week.week, 19);
  });

  test('given 1 January 2026 (a Thursday), it belongs to week 1 of 2026', () => {
    const week = PlantingWeek.containing(utc(2026, 1, 1));
    assert.deepEqual([week.year, week.week], [2026, 1]);
  });

  test('given Monday 29 December 2025, it already belongs to week 1 of 2026', () => {
    const week = PlantingWeek.containing(utc(2025, 12, 29));
    assert.deepEqual([week.year, week.week], [2026, 1]);
  });

  test('given 1 January 2027 (a Friday), it belongs to week 53 of the previous year', () => {
    const week = PlantingWeek.containing(utc(2027, 1, 1));
    assert.deepEqual([week.year, week.week], [2026, 53]);
  });

  test('given 1 January 2021, it belongs to week 53 of 2020', () => {
    const week = PlantingWeek.containing(utc(2021, 1, 1));
    assert.deepEqual([week.year, week.week], [2020, 53]);
  });

  test('given the years 2025, 2026 and 2020, knows they have 52, 53 and 53 weeks', () => {
    assert.equal(PlantingWeek.weeksInYear(2025), 52);
    assert.equal(PlantingWeek.weeksInYear(2026), 53);
    assert.equal(PlantingWeek.weeksInYear(2020), 53);
  });

  test('given a week, its first day is the Monday and its last day the Sunday', () => {
    const week = PlantingWeek.of(2026, 18);
    assert.equal(week.firstDay().toISOString(), '2026-04-27T00:00:00.000Z');
    assert.equal(week.lastDay().toISOString(), '2026-05-03T00:00:00.000Z');
  });

  test('given week 1 of 2026, its first day lies in the previous calendar year', () => {
    assert.equal(PlantingWeek.of(2026, 1).firstDay().toISOString(), '2025-12-29T00:00:00.000Z');
  });

  test('given a week number outside the year, refuses to create it', () => {
    assert.throws(() => PlantingWeek.of(2025, 53));
    assert.throws(() => PlantingWeek.of(2026, 0));
    assert.throws(() => PlantingWeek.of(2026, 1.5));
  });

  test('given two weeks, compares them across years', () => {
    assert.ok(PlantingWeek.of(2025, 52).isBefore(PlantingWeek.of(2026, 1)));
    assert.ok(PlantingWeek.of(2026, 3).isBefore(PlantingWeek.of(2026, 4)));
    assert.ok(!PlantingWeek.of(2026, 4).isBefore(PlantingWeek.of(2026, 4)));
    assert.ok(PlantingWeek.of(2026, 4).equals(PlantingWeek.of(2026, 4)));
    assert.ok(!PlantingWeek.of(2026, 4).equals(PlantingWeek.of(2027, 4)));
  });

  test('given week 52 of 2026, adding two weeks rolls into the next year via week 53', () => {
    const later = PlantingWeek.of(2026, 52).plus(2);
    assert.deepEqual([later.year, later.week], [2027, 1]);
  });

  test('given week 1, subtracting a week lands in the last week of the previous year', () => {
    const earlier = PlantingWeek.of(2027, 1).plus(-1);
    assert.deepEqual([earlier.year, earlier.week], [2026, 53]);
  });

  test('given a date late in the day, ignores the local timezone and uses the UTC calendar day', () => {
    const week = PlantingWeek.containing(new Date('2026-05-03T23:30:00.000Z'));
    assert.deepEqual([week.year, week.week], [2026, 18]);
  });
});
