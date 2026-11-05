# Season-based Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the week-based planning with per-component, per-year plannings: seasons derived from each plant's calendar, relative area ratios per season, and a local fill-by-ratio placement.

**Architecture:** A new immutable `Planning` entity (domain) holds a component's plant list and one season plan per season; a plant's seasons come from `PlantCalendar` (catalog + last frost date). `SeasonPlacement.fillByRatio` fills the component's layers by ratio around fixed plants (locked + carried over), reusing the existing footprint/area/relation rules through an extracted `PositionSearch`. The component store persists `plannings[year]`; a new Planning screen edits plants and ratios; the Component Detail screen shows one season at a time and runs the optimizer.

**Tech Stack:** React Native 0.81 + Expo 54, TypeScript (strict), Zustand 5 (persist → AsyncStorage), Zod 3, i18next (Dutch), NativeWind, `node --test` for unit tests (Node type stripping), Maestro for UI flows.

**Spec:** `docs/superpowers/specs/2026-11-05-season-planning-design.md`

## Global Constraints

- Seasons: `spring | summer | autumn | winter`, meteorological (Mar–May, Jun–Aug, Sep–Nov, Dec–Feb); winter *Y* runs Dec *Y* – end Feb *Y+1* and is the last season of planning year *Y*.
- Growing seasons are derived, never chosen by the user: start = transplant date, else direct sow date (last frost + weeks); end = start + `daysToHarvest.max` days, capped at the end of February *Y+1*.
- One planting per plant per planning; a plant is placed in its first season and fixed in its later ones; no carry-over across years.
- Ratio: whole number ≥ 1, default 1, only for plants starting in that season.
- Status: `notPlanned | planned | outdated`; only `planned` seasons become `outdated`.
- Placement is local and deterministic; combative adjacency is a penalty (−2), never a ban; companions +1.
- Existing plantings are not converted (migration v3 → v4 drops `plants`/`plantsToPlan`, keeps components).
- The Plant Details growing calendar must show exactly the same dates as today.
- The remote AI optimize feature is removed; the AI chat stays.
- All UI strings Dutch via i18n (`src/i18n/nl.json`); components presentational; BEM contract documented in `src/styles/planning/*.css` (components apply the same utility classes via `className`, as the existing planning components do).
- Domain code (`src/domain/**`), view models with tests and migrations import with **relative paths and `.ts` extensions** (no `@/` at runtime), so `node --test` can run them. Node type stripping does not support TypeScript parameter properties or enums: declare class fields explicitly.
- Unit tests: `npm run test:unit` (`node --test "src/**/*.test.ts"`). Typecheck: `npm run typecheck` (test files are excluded from tsc).
- File writes: use Write/Edit. If a write fails (EPERM or any I/O error), stop and report the exact error and path to the user before using the `node -e` workaround from `CLAUDE.md`. Several files use CRLF line endings; match them.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on branch `feature/season-planning`.

## Review Focus

1. **Frost date changes after plants are placed** — plants whose start season moves keep their ratio in the new start season, lose their placements, and every affected season shows `outdated`; nothing crashes and nothing is silently lost except those placements. (Test in Task 3: `reconciled`.)
2. **Frost date temporarily missing (null)** — a reconcile with no frost date would see every plant as seasonless and wipe all ratios; the store must only reconcile when the new frost date is non-null. (Test in Task 6: store subscription guard.)
3. **A layer or component smaller than a plant's footprint / patch minimum** — the optimizer reports the plant as "past niet" (count 0) instead of looping or throwing. (Tests in Task 4: patch does not fit; Task 5: plant missing from catalog.)
4. **Winter across the year end** — a plant planted in December and harvested in February belongs to winter of the planning year, and "today" in January/February maps to winter of the previous year. (Tests in Task 1.)
5. **Locked and carried-over plants on re-optimize** — never moved, never overlapped, still counted as occupied area. (Tests in Task 4 fixed plants; Task 5 carried + locked.)

---

## File Structure

**Create (domain, `src/domain/planning/`):**
- `Season.ts` — season order, date ranges, month hints, `seasonContaining`, `SeasonsOf` type.
- `PlantCalendar.ts` — frost day parsing, planting dates, outdoor period, growing seasons, `seasonsLookup`.
- `Planning.ts` — the Planning entity (plant list, ratios, placements, status rules).
- `PositionSearch.ts` — best free spot for one footprint in one area (extracted from `AutoPlacement`).
- `SeasonPlacement.ts` — `fillByRatio`.
- `SeasonOptimization.ts` — `optimizeSeason` use case (Planning + areas + catalog → new Planning + shares).
- `ComponentArea.ts` — `plantingAreaOf`, `plantingAreasOf` (moved out of `ComponentPlanning.ts`).
- `CurrentPlacements.ts` — `placementsGrowingOn(component, date, seasonsOfYear)`.
- Tests next to each.

**Create (other):**
- `src/schemas/planningSchema.ts` (+ test)
- `src/stores/planningContext.ts` — `seasonsOfYear`, `useSeasonsOfYear`, `usePlanning`, `useCurrentPlacementsById`.
- `src/screens/PlanningScreen/{PlanningScreen.tsx,planningScreenViewModel.ts,planningScreenViewModel.test.ts,index.ts}`
- `src/screens/ComponentDetailScreen/{seasonViewModel.ts,seasonViewModel.test.ts,useSeasonCanvas.ts}`
- `src/components/atoms/SeasonStatusDot/`, `src/components/molecules/{RatioStepper,SeasonTabs}/`, `src/components/organisms/SeasonPlanSection/`
- `src/styles/planning/season.css`
- `maestro/season_*.yaml`, `maestro/subflows/{add_plants_to_planning,open_planning}.yaml`

**Modify:** `src/types/{planning,plant,component}.types.ts`, `src/schemas/{plantSchema,index}.ts`, `src/stores/{componentStore,planningStore}.ts`, `src/stores/migrations/componentStoreMigrations.ts`, `src/domain/component/{GardenBox,Pot,RectangularTower,CircularTower}.ts`, `src/domain/planning/{PlantFootprint,index}.ts`, `src/domain/ai/buildGardenSnapshot.ts`, `src/hooks/ai/useAiChat.ts`, `src/utils/calendarCalculations.ts`, `src/screens/HomeScreen/HomeScreen.tsx`, `src/components/organisms/{ComponentSlide,LayerOverviewModal,PlantPlacementCanvas}/*.tsx`, `src/components/molecules/ComponentListRow/ComponentListRow.tsx`, `src/screens/ComponentDetailScreen/ComponentDetailScreen.tsx`, `src/screens/PlantSelectionScreen/PlantSelectionScreen.tsx`, `src/navigation/{navigationTypes.ts,RootNavigator.tsx}`, `src/screens/index.ts`, component barrels, `src/i18n/nl.json`, `CLAUDE.md`.

**Delete:** week-based domain (`AutoPlacement`, `ComponentPlanning`, `GrowingPeriod`, `GrowingPeriodOptions`, `PlanningQueries`, `PlantingWeek`, `TimeZone` + tests), week UI (`WeekTimeline`, `TimeZoneSegment`, `ViewModeToggle`, `WeekSlot`, `ToPlanAccordion`, `ToPlanRow`, `PlanningCaption`, `PlanningActionBar`, `usePlanningTimeline`, `usePlanningActions`, `planningViewModel(.test)`, `PlacedPlantItem`, `styles/planning/{timeline,to-plan}.css`), AI optimize (`hooks/ai/useOptimizeComponent.ts`, `services/ai/optimizeComponentService.ts`, `stores/ai/aiOptimizeComponentStore.ts`, `components/ai/{OptimizationAlternativesModal,OptimizationMiniCanvas,ScoreChips,AlternativePageDots}.tsx`, `domain/ai/buildComponentOptimizeRequest.ts`, `schemas/ai/optimizeComponent{Request,Response}Schema.ts`), old Maestro planning flows.

Tasks 1–5 are additive (the app keeps working). Task 6 switches storage and removes the old code; after Task 6 only the two screens rewritten in Tasks 7–8 fail typecheck. From Task 8 on, typecheck is green.

---

### Task 1: Season and PlantCalendar

**Files:**
- Create: `src/domain/planning/Season.ts`, `src/domain/planning/Season.test.ts`
- Create: `src/domain/planning/PlantCalendar.ts`, `src/domain/planning/PlantCalendar.test.ts`
- Modify: `src/types/planning.types.ts` (add `Season`)
- Modify: `src/domain/planning/GrowingPeriod.ts` (import frost helpers from `PlantCalendar`)

**Interfaces:**
- Produces:
  - `type Season = 'spring' | 'summer' | 'autumn' | 'winter'` (in `src/types/planning.types.ts`)
  - `type SeasonsOf = (plantId: string) => readonly Season[]`
  - `SEASONS: readonly Season[]`, `seasonRange(year, season): { start: Date; end: Date }` (UTC midnight, inclusive), `seasonMonths(season): { first: number; last: number }`, `seasonsAfter(season): Season[]`, `seasonContaining(date: Date): { year: number; season: Season }`
  - `interface FrostDay { month: number; day: number }`, `frostDayOf(iso: string | null): FrostDay | null`, `frostDateIn(year, frostDay): Date`
  - `type PlantTiming = Pick<PlantData, 'indoorStartWeeks' | 'transplantWeeks' | 'directSowWeeks' | 'daysToHarvest'>`
  - `plantingDatesOf(plant, lastSpringFrost: FrostDay, year): { indoorStart: Date | null; transplant: Date | null; directSow: Date | null }`
  - `outdoorPeriodOf(plant, lastSpringFrost, year): { start: Date; end: Date } | null`
  - `growingSeasonsOf(plant, lastSpringFrost, year): Season[]`
  - `seasonsLookup(year, lastSpringFrost: FrostDay | null, plantOf: (id) => PlantTiming | undefined): SeasonsOf`

- [ ] **Step 1: Add the Season type**

Append to `src/types/planning.types.ts` (keep the existing types for now; Task 6 removes them):

```ts
/**
 * Meteorological season of a planning year: spring (Mar-May), summer
 * (Jun-Aug), autumn (Sep-Nov), winter (Dec-Feb of the next calendar year)
 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
```

- [ ] **Step 2: Write the failing Season tests**

Create `src/domain/planning/Season.test.ts`:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { SEASONS, seasonContaining, seasonMonths, seasonRange, seasonsAfter } from './Season.ts';

const day = (date: Date): string => date.toISOString().slice(0, 10);

describe('seasonRange', () => {
  test('given spring and summer, the range covers their three months', () => {
    assert.deepEqual([day(seasonRange(2026, 'spring').start), day(seasonRange(2026, 'spring').end)], ['2026-03-01', '2026-05-31']);
    assert.deepEqual([day(seasonRange(2026, 'summer').start), day(seasonRange(2026, 'summer').end)], ['2026-06-01', '2026-08-31']);
  });

  test('given winter, the range runs into February of the next year, leap years included', () => {
    assert.deepEqual([day(seasonRange(2026, 'winter').start), day(seasonRange(2026, 'winter').end)], ['2026-12-01', '2027-02-28']);
    assert.equal(day(seasonRange(2027, 'winter').end), '2028-02-29');
  });
});

describe('seasonMonths', () => {
  test('gives the first and last month of each season', () => {
    assert.deepEqual(SEASONS.map(seasonMonths), [
      { first: 3, last: 5 },
      { first: 6, last: 8 },
      { first: 9, last: 11 },
      { first: 12, last: 2 },
    ]);
  });
});

describe('seasonsAfter', () => {
  test('gives the later seasons of the same planning year', () => {
    assert.deepEqual(seasonsAfter('spring'), ['summer', 'autumn', 'winter']);
    assert.deepEqual(seasonsAfter('winter'), []);
  });
});

describe('seasonContaining', () => {
  test('given a day from March to December, it is in that year', () => {
    assert.deepEqual(seasonContaining(new Date(2026, 2, 1)), { year: 2026, season: 'spring' });
    assert.deepEqual(seasonContaining(new Date(2026, 5, 1)), { year: 2026, season: 'summer' });
    assert.deepEqual(seasonContaining(new Date(2026, 8, 30)), { year: 2026, season: 'autumn' });
    assert.deepEqual(seasonContaining(new Date(2026, 11, 5)), { year: 2026, season: 'winter' });
  });

  test('given January or February, it is the winter of the year before', () => {
    assert.deepEqual(seasonContaining(new Date(2027, 0, 10)), { year: 2026, season: 'winter' });
    assert.deepEqual(seasonContaining(new Date(2027, 1, 28)), { year: 2026, season: 'winter' });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test src/domain/planning/Season.test.ts`
Expected: FAIL — `Cannot find module '.../Season.ts'`.

- [ ] **Step 4: Implement Season**

Create `src/domain/planning/Season.ts`:

```ts
import type { Season } from '../../types/planning.types.ts';

export type { Season };

/** The seasons a plant grows in during one planning year, by plant id */
export type SeasonsOf = (plantId: string) => readonly Season[];

/** The seasons of a planning year in order; winter runs into the next calendar year */
export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

/** First month (1-12) of each meteorological season */
const FIRST_MONTH: Readonly<Record<Season, number>> = { spring: 3, summer: 6, autumn: 9, winter: 12 };

export interface SeasonRange {
  /** First day, UTC midnight */
  readonly start: Date;
  /** Last day, UTC midnight, inclusive */
  readonly end: Date;
}

/** The days of a season in a planning year; winter of year Y ends in February of Y+1 */
export function seasonRange(year: number, season: Season): SeasonRange {
  const firstMonth = FIRST_MONTH[season];
  return {
    start: new Date(Date.UTC(year, firstMonth - 1, 1)),
    // Day 0 of the month after the season is the season's last day
    end: new Date(Date.UTC(year, firstMonth + 2, 0)),
  };
}

/** First and last month (1-12) of a season, for hints such as "mrt–mei" */
export function seasonMonths(season: Season): { readonly first: number; readonly last: number } {
  const first = FIRST_MONTH[season];
  return { first, last: ((first + 1) % 12) + 1 };
}

/** The seasons after the given one in the same planning year */
export function seasonsAfter(season: Season): Season[] {
  return SEASONS.slice(SEASONS.indexOf(season) + 1);
}

/**
 * The planning year and season of a (local) day. January and February
 * belong to the winter of the year before.
 */
export function seasonContaining(date: Date): { readonly year: number; readonly season: Season } {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month <= 2) {
    return { year: year - 1, season: 'winter' };
  }
  const season = SEASONS.find((s) => month >= FIRST_MONTH[s] && month < FIRST_MONTH[s] + 3) ?? 'winter';
  return { year, season };
}
```

- [ ] **Step 5: Run the Season tests to verify they pass**

Run: `node --test src/domain/planning/Season.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Write the failing PlantCalendar tests**

Create `src/domain/planning/PlantCalendar.test.ts`:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  frostDayOf,
  growingSeasonsOf,
  outdoorPeriodOf,
  plantingDatesOf,
  seasonsLookup,
} from './PlantCalendar.ts';
import type { PlantTiming } from './PlantCalendar.ts';

const day = (date: Date | null | undefined): string | null => (date ? date.toISOString().slice(0, 10) : null);
const frost = { month: 4, day: 15 };

const timing = (overrides: Partial<PlantTiming>): PlantTiming => ({
  indoorStartWeeks: null,
  transplantWeeks: null,
  directSowWeeks: null,
  daysToHarvest: { min: 1, max: 60 },
  ...overrides,
});

const tomato = timing({ indoorStartWeeks: -8, transplantWeeks: 2, daysToHarvest: { min: 60, max: 85 } });
const lettuce = timing({ transplantWeeks: -6, directSowWeeks: -4, daysToHarvest: { min: 25, max: 60 } });
const carrot = timing({ directSowWeeks: -4, daysToHarvest: { min: 60, max: 80 } });
const garlic = timing({ directSowWeeks: -24, daysToHarvest: { min: 210, max: 240 } });

describe('frostDayOf', () => {
  test('reads month and day from a stored date', () => {
    assert.deepEqual(frostDayOf('2026-04-15'), { month: 4, day: 15 });
  });

  test('gives null for no date or an invalid date', () => {
    assert.equal(frostDayOf(null), null);
    assert.equal(frostDayOf('2026-02-30'), null);
    assert.equal(frostDayOf('15/04/2026'), null);
  });
});

describe('plantingDatesOf', () => {
  test('adds the catalog weeks to the last frost of the planning year', () => {
    const dates = plantingDatesOf(tomato, frost, 2026);
    assert.equal(day(dates.indoorStart), '2026-02-18');
    assert.equal(day(dates.transplant), '2026-04-29');
    assert.equal(dates.directSow, null);
  });
});

describe('outdoorPeriodOf', () => {
  test('starts at the transplant date when there is one and lasts until the latest harvest', () => {
    const period = outdoorPeriodOf(tomato, frost, 2026);
    assert.deepEqual([day(period?.start), day(period?.end)], ['2026-04-29', '2026-07-23']);
  });

  test('starts at the direct sow date when there is no transplant date', () => {
    const period = outdoorPeriodOf(carrot, frost, 2026);
    assert.deepEqual([day(period?.start), day(period?.end)], ['2026-03-18', '2026-06-06']);
  });

  test('ends at the latest at the end of the planning year\'s winter', () => {
    const late = timing({ transplantWeeks: 15, daysToHarvest: { min: 200, max: 300 } });
    assert.equal(day(outdoorPeriodOf(late, frost, 2026)?.end), '2027-02-28');
  });

  test('gives null without planting weeks or without a harvest time', () => {
    assert.equal(outdoorPeriodOf(timing({}), frost, 2026), null);
    assert.equal(outdoorPeriodOf(timing({ transplantWeeks: 2, daysToHarvest: { min: 0, max: 0 } }), frost, 2026), null);
  });
});

describe('growingSeasonsOf', () => {
  test('gives every season the outdoor period overlaps, in order', () => {
    assert.deepEqual(growingSeasonsOf(tomato, frost, 2026), ['spring', 'summer']);
    assert.deepEqual(growingSeasonsOf(lettuce, frost, 2026), ['spring']);
    assert.deepEqual(growingSeasonsOf(carrot, frost, 2026), ['spring', 'summer']);
  });

  test('given a plant sown in the autumn before, it counts from spring of the planning year', () => {
    assert.deepEqual(growingSeasonsOf(garlic, frost, 2026), ['spring', 'summer']);
  });

  test('given a long harvest from late July, it reaches winter', () => {
    const late = timing({ transplantWeeks: 15, daysToHarvest: { min: 200, max: 300 } });
    assert.deepEqual(growingSeasonsOf(late, frost, 2026), ['summer', 'autumn', 'winter']);
  });

  test('given no calendar, it gives no seasons', () => {
    assert.deepEqual(growingSeasonsOf(timing({}), frost, 2026), []);
  });
});

describe('seasonsLookup', () => {
  test('looks plants up in the catalog; unknown plants or no frost date give no seasons', () => {
    const catalog = new Map([['tomaat', tomato]]);
    const seasonsOf = seasonsLookup(2026, frost, (id) => catalog.get(id));
    assert.deepEqual(seasonsOf('tomaat'), ['spring', 'summer']);
    assert.deepEqual(seasonsOf('onbekend'), []);
    assert.deepEqual(seasonsLookup(2026, null, (id) => catalog.get(id))('tomaat'), []);
  });
});
```

Date checks: 15 Apr − 56 days = 18 Feb; + 14 = 29 Apr; 29 Apr + 85 = 23 Jul; 15 Apr − 28 = 18 Mar; 18 Mar + 80 = 6 Jun; 15 Apr + 105 = 29 Jul.

- [ ] **Step 7: Run the tests to verify they fail**

Run: `node --test src/domain/planning/PlantCalendar.test.ts`
Expected: FAIL — `Cannot find module '.../PlantCalendar.ts'`.

- [ ] **Step 8: Implement PlantCalendar**

Create `src/domain/planning/PlantCalendar.ts`:

```ts
import type { PlantData } from '../../types/plant.types.ts';
import type { Season } from '../../types/planning.types.ts';
import { SEASONS, seasonRange } from './Season.ts';
import type { SeasonsOf } from './Season.ts';

/** A day in the year without a year, such as the garden's frost dates */
export interface FrostDay {
  /** 1-12 */
  readonly month: number;
  readonly day: number;
}

/** The catalog fields that decide when a plant is sown, planted and harvested */
export type PlantTiming = Pick<PlantData, 'indoorStartWeeks' | 'transplantWeeks' | 'directSowWeeks' | 'daysToHarvest'>;

export interface PlantingDates {
  readonly indoorStart: Date | null;
  readonly transplant: Date | null;
  readonly directSow: Date | null;
}

/** The days a plant occupies its spot outside, both inclusive */
export interface OutdoorPeriod {
  readonly start: Date;
  readonly end: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

/**
 * Reads the frost day from a stored frost date ('YYYY-MM-DD', as the
 * environment store keeps it). Only the digits are used, so no timezone can
 * shift the day. Returns null when there is no valid date.
 */
export function frostDayOf(isoDate: string | null): FrostDay | null {
  const match = isoDate === null ? null : /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // Day 0 of the next month is the last day of this one
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth ? { month, day } : null;
}

/**
 * The frost day as a UTC date in the given year. A day that does not exist
 * in that month (29 February in a non-leap year) becomes its last day.
 * @throws Error when the month is not 1-12
 */
export function frostDateIn(year: number, frostDay: FrostDay): Date {
  if (!Number.isInteger(frostDay.month) || frostDay.month < 1 || frostDay.month > 12) {
    throw new Error(`Ongeldige maand ${frostDay.month}`);
  }
  const daysInMonth = new Date(Date.UTC(year, frostDay.month, 0)).getUTCDate();
  return new Date(Date.UTC(year, frostDay.month - 1, Math.min(Math.max(1, frostDay.day), daysInMonth)));
}

function plusDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * The sowing and planting dates of a plant in a planning year: the last
 * spring frost plus the catalog's weeks (negative = before the frost).
 * The Plant Details calendar and the season calculation both use these dates.
 */
export function plantingDatesOf(plant: PlantTiming, lastSpringFrost: FrostDay, year: number): PlantingDates {
  const frost = frostDateIn(year, lastSpringFrost);
  const at = (weeks: number | null): Date | null => (weeks === null ? null : plusDays(frost, weeks * DAYS_PER_WEEK));
  return {
    indoorStart: at(plant.indoorStartWeeks),
    transplant: at(plant.transplantWeeks),
    directSow: at(plant.directSowWeeks),
  };
}

/**
 * When the plant is in the component: from transplanting (or direct sowing
 * when it is not transplanted) until the latest harvest, at the latest the
 * end of the planning year's winter. Null without planting weeks or harvest time.
 */
export function outdoorPeriodOf(plant: PlantTiming, lastSpringFrost: FrostDay, year: number): OutdoorPeriod | null {
  const dates = plantingDatesOf(plant, lastSpringFrost, year);
  const start = dates.transplant ?? dates.directSow;
  const harvestDays = plant.daysToHarvest.max;
  if (start === null || !Number.isFinite(harvestDays) || harvestDays <= 0) {
    return null;
  }
  const lastDay = seasonRange(year, 'winter').end;
  return { start, end: new Date(Math.min(plusDays(start, harvestDays).getTime(), lastDay.getTime())) };
}

/** The seasons of the planning year the plant's outdoor period overlaps, in order; none without a calendar */
export function growingSeasonsOf(plant: PlantTiming, lastSpringFrost: FrostDay, year: number): Season[] {
  const period = outdoorPeriodOf(plant, lastSpringFrost, year);
  if (period === null) {
    return [];
  }
  return SEASONS.filter((season) => {
    const range = seasonRange(year, season);
    return period.start <= range.end && period.end >= range.start;
  });
}

/** Growing seasons by plant id for one planning year; unknown plants or no frost date give none */
export function seasonsLookup(
  year: number,
  lastSpringFrost: FrostDay | null,
  plantOf: (plantId: string) => PlantTiming | undefined,
): SeasonsOf {
  return (plantId) => {
    const plant = plantOf(plantId);
    return plant !== undefined && lastSpringFrost !== null ? growingSeasonsOf(plant, lastSpringFrost, year) : [];
  };
}
```

- [ ] **Step 9: Point GrowingPeriod at the shared frost helpers**

In `src/domain/planning/GrowingPeriod.ts`, delete the local `FrostDay` interface, `frostDayOf` function and `frostDateIn` function (lines with those definitions and their doc comments), and add after the existing imports:

```ts
import { frostDateIn, frostDayOf } from './PlantCalendar.ts';
import type { FrostDay } from './PlantCalendar.ts';

export { frostDayOf };
export type { FrostDay };
```

(The rest of `GrowingPeriod.ts` keeps calling `frostDateIn`. It is deleted in Task 6.)

- [ ] **Step 10: Run all unit tests**

Run: `npm run test:unit`
Expected: PASS, including the existing `GrowingPeriod` tests and the new `Season` and `PlantCalendar` tests.

- [ ] **Step 11: Commit**

```bash
git add src/types/planning.types.ts src/domain/planning/Season.ts src/domain/planning/Season.test.ts src/domain/planning/PlantCalendar.ts src/domain/planning/PlantCalendar.test.ts src/domain/planning/GrowingPeriod.ts
git commit -m "feat(planning): seasons and plant calendar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Plant Details calendar uses PlantCalendar

**Files:**
- Modify: `src/utils/calendarCalculations.ts` (`calculateGrowingCalendar`)
- Create: `src/utils/calendarCalculations.test.ts`

**Interfaces:**
- Consumes: `frostDayOf`, `plantingDatesOf` from `src/domain/planning/PlantCalendar.ts`
- Produces: `calculateGrowingCalendar(plant, lastSpringFrost: string): GrowingCalendarData` — unchanged signature and output.

- [ ] **Step 1: Write the parity test**

Create `src/utils/calendarCalculations.test.ts`. The expected values are what the current implementation returns (each range is the date ± 1 week):

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateGrowingCalendar } from './calendarCalculations.ts';
import type { PlantData } from '../types/plant.types.ts';

const day = (date: Date): string => date.toISOString().slice(0, 10);
const plant = (weeks: Pick<PlantData, 'indoorStartWeeks' | 'transplantWeeks' | 'directSowWeeks'>): PlantData =>
  ({ ...weeks, daysToHarvest: { min: 60, max: 85 } }) as PlantData;

describe('calculateGrowingCalendar', () => {
  test('gives a two-week range around each catalog date, counted from the last frost', () => {
    const calendar = calculateGrowingCalendar(plant({ indoorStartWeeks: -8, transplantWeeks: 2, directSowWeeks: null }), '2026-04-15');
    assert.deepEqual(calendar.indoorStart && [day(calendar.indoorStart.start), day(calendar.indoorStart.end)], ['2026-02-11', '2026-02-25']);
    assert.deepEqual(calendar.transplant && [day(calendar.transplant.start), day(calendar.transplant.end)], ['2026-04-22', '2026-05-06']);
    assert.equal(calendar.directSow, null);
  });

  test('given no valid frost date, there are no ranges', () => {
    const calendar = calculateGrowingCalendar(plant({ indoorStartWeeks: -8, transplantWeeks: 2, directSowWeeks: 1 }), '');
    assert.deepEqual(calendar, { indoorStart: null, transplant: null, directSow: null });
  });
});
```

- [ ] **Step 2: Run it against the current implementation**

Run: `node --test src/utils/calendarCalculations.test.ts`
Expected: the first test PASSES (it pins today's behaviour); the second FAILS (today an empty string gives `Invalid Date` ranges, not null).

- [ ] **Step 3: Delegate to PlantCalendar**

In `src/utils/calendarCalculations.ts`:
- change the type import to `import type { PlantData } from '../types/plant.types.ts';`
- add `import { frostDayOf, plantingDatesOf } from '../domain/planning/PlantCalendar.ts';`
- replace the body of `calculateGrowingCalendar` (keep its doc comment) with:

```ts
export function calculateGrowingCalendar(
  plant: PlantData,
  lastSpringFrost: string
): GrowingCalendarData {
  const frostDay = frostDayOf(lastSpringFrost);
  if (frostDay === null) {
    return { indoorStart: null, transplant: null, directSow: null };
  }

  // The same dates the season planning uses
  const dates = plantingDatesOf(plant, frostDay, Number(lastSpringFrost.slice(0, 4)));
  const around = (date: Date | null): DateRange | null => (date === null ? null : createDateRange(date));

  return {
    indoorStart: around(dates.indoorStart),
    transplant: around(dates.transplant),
    directSow: around(dates.directSow),
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test src/utils/calendarCalculations.test.ts` then `npm run typecheck`
Expected: both tests PASS; typecheck passes.

- [ ] **Step 5: Commit**

```bash
git add src/utils/calendarCalculations.ts src/utils/calendarCalculations.test.ts
git commit -m "refactor(calendar): plant details calendar uses the shared plant calendar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Planning entity

**Files:**
- Modify: `src/types/planning.types.ts` (add `SeasonStatus`, `PlacementData`, `SeasonPlanData`, `PlanningData`)
- Create: `src/domain/planning/Planning.ts`, `src/domain/planning/Planning.test.ts`

**Interfaces:**
- Consumes: `Season`, `SeasonsOf`, `SEASONS`, `seasonsAfter` (Task 1)
- Produces (types, `src/types/planning.types.ts`):

```ts
export type SeasonStatus = 'notPlanned' | 'planned' | 'outdated';
export interface PlacementData { id; plantId; positionX; positionY; layerIndex?; locked?; patchWidthInCm?; patchHeightInCm?; patchRotationDeg? }
export interface SeasonPlanData { ratios: Readonly<Record<string, number>>; placements: readonly PlacementData[]; status: SeasonStatus }
export interface PlanningData { plants: readonly string[]; seasons: Readonly<Record<Season, SeasonPlanData>> }
```

- Produces (class `Planning`, all methods return a new `Planning` unless noted):
  - `static empty(seasonsOf)`, `static from(data | undefined, seasonsOf)`, `toData(): PlanningData`
  - queries: `plants`, `seasonsOfPlant(id)`, `startSeasonOf(id): Season | null`, `plantsStartingIn(season): string[]`, `plantsCarriedInto(season): string[]`, `statusOf(season)`, `ratioOf(season, id): number`, `placementsIn(season)`, `carriedPlacementsIn(season)`, `fixedPlacementsIn(season)`
  - changes: `addPlants(ids)`, `removePlant(id)`, `setRatio(season, id, ratio)`, `applyPlacement(season, placements)`, `movePlacement(season, placementId, x, y)`, `resizePatch(season, placementId, w, h, rotationDeg)`, `removePlacement(season, placementId)`, `toggleLock(season, placementId)`, `setAllLocked(season, locked)`, `reconciled()`

- [ ] **Step 1: Add the planning data types**

Append to `src/types/planning.types.ts`:

```ts
/** Where a season stands: never placed, placed, or placed but its inputs changed since */
export type SeasonStatus = 'notPlanned' | 'planned' | 'outdated';

/**
 * One plant placed in a component, in the season it is planted.
 * Positions are cm from the top-left of the inner area (border excluded).
 */
export interface PlacementData {
  readonly id: string;
  readonly plantId: string;
  readonly positionX: number;
  readonly positionY: number;
  readonly layerIndex?: number; // Tower layer (0 = bottom), undefined for components without layers
  readonly locked?: boolean; // Locked placements are never moved by the optimizer
  // Patch-only fields, undefined for individual plants
  readonly patchWidthInCm?: number;
  readonly patchHeightInCm?: number;
  readonly patchRotationDeg?: number;
}

/** Ratios and placements of the plants that start in one season */
export interface SeasonPlanData {
  /** Relative share of the free area per plant id; a missing plant has ratio 1 */
  readonly ratios: Readonly<Record<string, number>>;
  readonly placements: readonly PlacementData[];
  readonly status: SeasonStatus;
}

/** What grows in one component during one planning year */
export interface PlanningData {
  /** The plants in the planning, without amounts */
  readonly plants: readonly string[];
  readonly seasons: Readonly<Record<Season, SeasonPlanData>>;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/domain/planning/Planning.test.ts`:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Planning } from './Planning.ts';
import type { PlacementData, Season } from '../../types/planning.types.ts';

const SEASONS_BY_PLANT: Record<string, readonly Season[]> = {
  tomaat: ['spring', 'summer'],
  sla: ['spring'],
  boerenkool: ['summer', 'autumn'],
  knoflook: [],
};
const seasonsOf = (plantId: string): readonly Season[] => SEASONS_BY_PLANT[plantId] ?? [];

const placement = (id: string, plantId: string, extra: Partial<PlacementData> = {}): PlacementData => ({
  id,
  plantId,
  positionX: 10,
  positionY: 10,
  ...extra,
});

const withPlants = (...plantIds: string[]): Planning => Planning.empty(seasonsOf).addPlants(plantIds);

describe('Planning queries', () => {
  test('given an empty planning, no plants and every season not planned', () => {
    const planning = Planning.empty(seasonsOf);
    assert.deepEqual(planning.plants, []);
    assert.deepEqual(['spring', 'summer', 'autumn', 'winter'].map((s) => planning.statusOf(s as Season)), [
      'notPlanned',
      'notPlanned',
      'notPlanned',
      'notPlanned',
    ]);
  });

  test('given plants, they start in their first season and are carried into the later ones', () => {
    const planning = withPlants('tomaat', 'sla', 'boerenkool');
    assert.deepEqual(planning.plantsStartingIn('spring'), ['tomaat', 'sla']);
    assert.deepEqual(planning.plantsStartingIn('summer'), ['boerenkool']);
    assert.deepEqual(planning.plantsCarriedInto('summer'), ['tomaat']);
    assert.deepEqual(planning.plantsCarriedInto('autumn'), ['boerenkool']);
  });

  test('given a plant without calendar, it is in the list but in no season', () => {
    const planning = withPlants('knoflook');
    assert.deepEqual(planning.plants, ['knoflook']);
    assert.equal(planning.startSeasonOf('knoflook'), null);
    assert.deepEqual(planning.plantsStartingIn('spring'), []);
  });

  test('given no stored data, from() gives an empty planning', () => {
    assert.deepEqual(Planning.from(undefined, seasonsOf).toData(), Planning.empty(seasonsOf).toData());
  });
});

describe('addPlants', () => {
  test('new plants get ratio 1 in their start season; duplicates are ignored', () => {
    const planning = withPlants('tomaat').addPlants(['tomaat', 'sla', 'sla']);
    assert.deepEqual(planning.plants, ['tomaat', 'sla']);
    assert.equal(planning.ratioOf('spring', 'sla'), 1);
  });

  test('adding a plant makes its planned start season outdated', () => {
    const planned = withPlants('tomaat').applyPlacement('spring', [placement('p1', 'tomaat')]);
    assert.equal(planned.addPlants(['sla']).statusOf('spring'), 'outdated');
  });

  test('does not change the planning it was called on', () => {
    const planning = Planning.empty(seasonsOf);
    planning.addPlants(['tomaat']);
    assert.deepEqual(planning.plants, []);
  });
});

describe('setRatio', () => {
  test('sets the ratio of a plant starting in the season and outdates a planned season', () => {
    const planned = withPlants('tomaat', 'sla').applyPlacement('spring', []);
    const changed = planned.setRatio('spring', 'sla', 3);
    assert.equal(changed.ratioOf('spring', 'sla'), 3);
    assert.equal(changed.statusOf('spring'), 'outdated');
  });

  test('rejects a plant carried into the season and ratios that are not whole numbers of at least 1', () => {
    const planning = withPlants('tomaat');
    assert.throws(() => planning.setRatio('summer', 'tomaat', 2));
    assert.throws(() => planning.setRatio('spring', 'tomaat', 0));
    assert.throws(() => planning.setRatio('spring', 'tomaat', 1.5));
  });
});

describe('applyPlacement', () => {
  test('replaces unlocked placements, keeps locked ones and marks the season planned', () => {
    const first = withPlants('tomaat').applyPlacement('spring', [
      placement('locked', 'tomaat', { locked: true }),
      placement('loose', 'tomaat'),
    ]);
    const second = first.applyPlacement('spring', [placement('new', 'tomaat')]);
    assert.deepEqual(second.placementsIn('spring').map((p) => p.id), ['locked', 'new']);
    assert.equal(second.statusOf('spring'), 'planned');
  });

  test('outdates a planned later season that holds plants carried from this season; not-planned seasons stay', () => {
    const planning = withPlants('tomaat', 'boerenkool')
      .applyPlacement('summer', [placement('b1', 'boerenkool')])
      .applyPlacement('spring', [placement('t1', 'tomaat')]);
    assert.equal(planning.statusOf('summer'), 'outdated');
    assert.equal(planning.statusOf('autumn'), 'notPlanned');
  });
});

describe('fixedPlacementsIn', () => {
  test('gives the carried placements and the locked placements of the season', () => {
    const planning = withPlants('tomaat', 'boerenkool')
      .applyPlacement('spring', [placement('t1', 'tomaat')])
      .applyPlacement('summer', [placement('b1', 'boerenkool', { locked: true }), placement('b2', 'boerenkool')]);
    assert.deepEqual(planning.carriedPlacementsIn('summer').map((p) => p.id), ['t1']);
    assert.deepEqual(planning.fixedPlacementsIn('summer').map((p) => p.id), ['t1', 'b1']);
  });
});

describe('removePlant', () => {
  test('removes the plant, its ratios and placements, and outdates its planned seasons', () => {
    const planning = withPlants('tomaat', 'boerenkool')
      .applyPlacement('spring', [placement('t1', 'tomaat')])
      .applyPlacement('summer', [placement('b1', 'boerenkool')])
      .removePlant('tomaat');
    assert.deepEqual(planning.plants, ['boerenkool']);
    assert.deepEqual(planning.placementsIn('spring'), []);
    assert.equal(planning.toData().seasons.spring.ratios.tomaat, undefined);
    assert.equal(planning.statusOf('spring'), 'outdated');
    assert.equal(planning.statusOf('summer'), 'outdated');
  });
});

describe('changing one placement', () => {
  const planned = withPlants('tomaat', 'boerenkool')
    .applyPlacement('spring', [placement('t1', 'tomaat')])
    .applyPlacement('summer', [placement('b1', 'boerenkool')]);

  test('moving a carried plant outdates the later seasons it grows in, not its own season', () => {
    const moved = planned.movePlacement('spring', 't1', 50, 60);
    assert.deepEqual([moved.placementsIn('spring')[0].positionX, moved.placementsIn('spring')[0].positionY], [50, 60]);
    assert.equal(moved.statusOf('spring'), 'planned');
    assert.equal(moved.statusOf('summer'), 'outdated');
  });

  test('resizing and removing work the same way', () => {
    const resized = planned.resizePatch('spring', 't1', 30, 40, 15);
    assert.deepEqual(
      [resized.placementsIn('spring')[0].patchWidthInCm, resized.placementsIn('spring')[0].patchHeightInCm, resized.placementsIn('spring')[0].patchRotationDeg],
      [30, 40, 15],
    );
    assert.equal(resized.statusOf('summer'), 'outdated');
    assert.deepEqual(planned.removePlacement('spring', 't1').placementsIn('spring'), []);
  });

  test('locking changes no status', () => {
    const locked = planned.toggleLock('spring', 't1').setAllLocked('summer', true);
    assert.equal(locked.placementsIn('spring')[0].locked, true);
    assert.equal(locked.placementsIn('summer')[0].locked, true);
    assert.equal(locked.statusOf('summer'), 'planned');
  });

  test('an unknown placement id changes nothing', () => {
    assert.equal(planned.movePlacement('spring', 'missing', 1, 1), planned);
  });
});

describe('reconciled', () => {
  test('given a plant whose start season moved, its ratio moves along, its placements go and the seasons involved are outdated', () => {
    // Stored while tomaat started in summer; its calendar now says spring
    const stored = Planning.from(
      {
        plants: ['tomaat'],
        seasons: {
          spring: { ratios: {}, placements: [], status: 'planned' },
          summer: { ratios: { tomaat: 3 }, placements: [placement('t1', 'tomaat')], status: 'planned' },
          autumn: { ratios: {}, placements: [], status: 'notPlanned' },
          winter: { ratios: {}, placements: [], status: 'notPlanned' },
        },
      },
      seasonsOf,
    );
    const planning = stored.reconciled();
    assert.equal(planning.ratioOf('spring', 'tomaat'), 3);
    assert.equal(planning.toData().seasons.summer.ratios.tomaat, undefined);
    assert.deepEqual(planning.placementsIn('summer'), []);
    assert.equal(planning.statusOf('spring'), 'outdated');
    assert.equal(planning.statusOf('summer'), 'outdated');
  });

  test('given nothing misplaced, it gives the same planning', () => {
    const planning = withPlants('tomaat').applyPlacement('spring', [placement('t1', 'tomaat')]);
    assert.equal(planning.reconciled(), planning);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test src/domain/planning/Planning.test.ts`
Expected: FAIL — `Cannot find module '.../Planning.ts'`.

- [ ] **Step 4: Implement Planning**

Create `src/domain/planning/Planning.ts`:

```ts
import type { PlacementData, PlanningData, Season, SeasonPlanData, SeasonStatus } from '../../types/planning.types.ts';
import { SEASONS, seasonsAfter } from './Season.ts';
import type { SeasonsOf } from './Season.ts';

const EMPTY_SEASON: SeasonPlanData = { ratios: {}, placements: [], status: 'notPlanned' };

/**
 * Planning is the entity for what grows in one component during one year:
 * the plant list and, per season, the ratios and placements of the plants
 * that start in that season. A plant's seasons come from its calendar
 * (seasonsOf): it is placed in its first season and stays put in the later
 * ones. A season whose inputs change after it was placed becomes outdated.
 * Immutable: every change returns a new Planning.
 */
export class Planning {
  private readonly data: PlanningData;
  private readonly seasonsOf: SeasonsOf;

  private constructor(data: PlanningData, seasonsOf: SeasonsOf) {
    this.data = data;
    this.seasonsOf = seasonsOf;
  }

  static empty(seasonsOf: SeasonsOf): Planning {
    return new Planning(
      { plants: [], seasons: { spring: EMPTY_SEASON, summer: EMPTY_SEASON, autumn: EMPTY_SEASON, winter: EMPTY_SEASON } },
      seasonsOf,
    );
  }

  /** A stored planning; a year without one is an empty planning */
  static from(data: PlanningData | undefined, seasonsOf: SeasonsOf): Planning {
    return data === undefined ? Planning.empty(seasonsOf) : new Planning(data, seasonsOf);
  }

  toData(): PlanningData {
    return this.data;
  }

  get plants(): readonly string[] {
    return this.data.plants;
  }

  seasonsOfPlant(plantId: string): readonly Season[] {
    return this.seasonsOf(plantId);
  }

  /** The season the plant is placed in; null when it has no calendar */
  startSeasonOf(plantId: string): Season | null {
    return this.seasonsOf(plantId)[0] ?? null;
  }

  plantsStartingIn(season: Season): string[] {
    return this.data.plants.filter((plantId) => this.startSeasonOf(plantId) === season);
  }

  /** Plants still in the ground from an earlier season */
  plantsCarriedInto(season: Season): string[] {
    return this.data.plants.filter(
      (plantId) => this.startSeasonOf(plantId) !== season && this.seasonsOf(plantId).includes(season),
    );
  }

  statusOf(season: Season): SeasonStatus {
    return this.data.seasons[season].status;
  }

  ratioOf(season: Season, plantId: string): number {
    return this.data.seasons[season].ratios[plantId] ?? 1;
  }

  /** Placements of the plants that start in the season */
  placementsIn(season: Season): readonly PlacementData[] {
    return this.data.seasons[season].placements;
  }

  /** Placements of the plants carried into the season, from their start season */
  carriedPlacementsIn(season: Season): PlacementData[] {
    return this.plantsCarriedInto(season).flatMap((plantId) => {
      const start = this.startSeasonOf(plantId);
      return start === null ? [] : this.data.seasons[start].placements.filter((p) => p.plantId === plantId);
    });
  }

  /** What the optimizer must leave where it is: carried placements and locked placements of the season */
  fixedPlacementsIn(season: Season): PlacementData[] {
    return [...this.carriedPlacementsIn(season), ...this.placementsIn(season).filter((p) => p.locked === true)];
  }

  addPlants(plantIds: readonly string[]): Planning {
    const added = plantIds.filter((id, index) => !this.data.plants.includes(id) && plantIds.indexOf(id) === index);
    if (added.length === 0) {
      return this;
    }
    let next = this.with({ plants: [...this.data.plants, ...added] });
    for (const plantId of added) {
      const start = next.startSeasonOf(plantId);
      if (start !== null) {
        next = next.withSeason(start, (plan) => ({ ...plan, ratios: { ...plan.ratios, [plantId]: 1 } })).markedOutdated([start]);
      }
    }
    return next;
  }

  removePlant(plantId: string): Planning {
    if (!this.data.plants.includes(plantId)) {
      return this;
    }
    const seasons = Object.fromEntries(
      SEASONS.map((season) => {
        const plan = this.data.seasons[season];
        const { [plantId]: _removed, ...ratios } = plan.ratios;
        return [season, { ...plan, ratios, placements: plan.placements.filter((p) => p.plantId !== plantId) }];
      }),
    ) as Record<Season, SeasonPlanData>;
    return new Planning({ plants: this.data.plants.filter((id) => id !== plantId), seasons }, this.seasonsOf).markedOutdated(
      this.seasonsOf(plantId),
    );
  }

  /**
   * @throws Error when the plant does not start in the season or the ratio
   * is not a whole number of at least 1
   */
  setRatio(season: Season, plantId: string, ratio: number): Planning {
    if (!Number.isInteger(ratio) || ratio < 1) {
      throw new Error(`Ongeldige verhouding ${ratio}`);
    }
    if (!this.data.plants.includes(plantId) || this.startSeasonOf(plantId) !== season) {
      throw new Error(`${plantId} start niet in ${season}`);
    }
    if (this.ratioOf(season, plantId) === ratio) {
      return this;
    }
    return this.withSeason(season, (plan) => ({ ...plan, ratios: { ...plan.ratios, [plantId]: ratio } })).markedOutdated([season]);
  }

  /** The result of a placement run: unlocked placements are replaced, locked ones stay */
  applyPlacement(season: Season, placements: readonly PlacementData[]): Planning {
    return this.withSeason(season, (plan) => ({
      ...plan,
      placements: [...plan.placements.filter((p) => p.locked === true), ...placements],
      status: 'planned',
    })).markedOutdated(this.seasonsCarriedFrom(season));
  }

  movePlacement(season: Season, placementId: string, xCm: number, yCm: number): Planning {
    return this.changePlacement(season, placementId, (p) => ({ ...p, positionX: xCm, positionY: yCm }));
  }

  resizePatch(season: Season, placementId: string, widthCm: number, heightCm: number, rotationDeg: number): Planning {
    return this.changePlacement(season, placementId, (p) => ({
      ...p,
      patchWidthInCm: widthCm,
      patchHeightInCm: heightCm,
      patchRotationDeg: rotationDeg,
    }));
  }

  removePlacement(season: Season, placementId: string): Planning {
    const placement = this.placementsIn(season).find((p) => p.id === placementId);
    if (placement === undefined) {
      return this;
    }
    return this.withSeason(season, (plan) => ({ ...plan, placements: plan.placements.filter((p) => p.id !== placementId) }))
      .markedOutdated(this.laterSeasonsOf(placement.plantId));
  }

  toggleLock(season: Season, placementId: string): Planning {
    return this.withSeason(season, (plan) => ({
      ...plan,
      placements: plan.placements.map((p) => (p.id === placementId ? { ...p, locked: !(p.locked ?? false) } : p)),
    }));
  }

  setAllLocked(season: Season, locked: boolean): Planning {
    return this.withSeason(season, (plan) => ({ ...plan, placements: plan.placements.map((p) => ({ ...p, locked })) }));
  }

  /**
   * After the plants' seasons changed (a new frost date): a ratio kept under
   * a season that is no longer the plant's start season moves to the new
   * start season, its placements there are dropped, and the seasons
   * involved become outdated. Returns this planning when nothing moved.
   */
  reconciled(): Planning {
    let next: Planning = this;
    for (const season of SEASONS) {
      const plan = this.data.seasons[season];
      const misplaced = new Set(
        [...Object.keys(plan.ratios), ...plan.placements.map((p) => p.plantId)].filter(
          (plantId) => this.startSeasonOf(plantId) !== season,
        ),
      );
      for (const plantId of misplaced) {
        const ratio = plan.ratios[plantId];
        const start = this.startSeasonOf(plantId);
        next = next.withSeason(season, (current) => {
          const { [plantId]: _moved, ...ratios } = current.ratios;
          return { ...current, ratios, placements: current.placements.filter((p) => p.plantId !== plantId) };
        });
        if (start !== null && ratio !== undefined && this.data.plants.includes(plantId)) {
          // A ratio already set in the new start season wins
          next = next.withSeason(start, (current) => ({ ...current, ratios: { [plantId]: ratio, ...current.ratios } }));
        }
        next = next.markedOutdated([season, ...seasonsAfter(season), ...this.seasonsOf(plantId)]);
      }
    }
    return next;
  }

  private with(changes: Partial<PlanningData>): Planning {
    return new Planning({ ...this.data, ...changes }, this.seasonsOf);
  }

  private withSeason(season: Season, change: (plan: SeasonPlanData) => SeasonPlanData): Planning {
    return this.with({ seasons: { ...this.data.seasons, [season]: change(this.data.seasons[season]) } });
  }

  /** Planned seasons become outdated; seasons not placed yet stay as they are */
  private markedOutdated(seasons: readonly Season[]): Planning {
    let next: Planning = this;
    for (const season of new Set(seasons)) {
      if (next.statusOf(season) === 'planned') {
        next = next.withSeason(season, (plan) => ({ ...plan, status: 'outdated' }));
      }
    }
    return next;
  }

  /** The seasons a plant grows in after its start season */
  private laterSeasonsOf(plantId: string): Season[] {
    return this.seasonsOf(plantId).slice(1);
  }

  /** The later seasons holding plants that start in this season */
  private seasonsCarriedFrom(season: Season): Season[] {
    return this.plantsStartingIn(season).flatMap((plantId) => this.laterSeasonsOf(plantId));
  }

  private changePlacement(season: Season, placementId: string, change: (placement: PlacementData) => PlacementData): Planning {
    const placement = this.placementsIn(season).find((p) => p.id === placementId);
    if (placement === undefined) {
      return this;
    }
    return this.withSeason(season, (plan) => ({
      ...plan,
      placements: plan.placements.map((p) => (p.id === placementId ? change(p) : p)),
    })).markedOutdated(this.laterSeasonsOf(placement.plantId));
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test src/domain/planning/Planning.test.ts`
Expected: PASS (all tests).

- [ ] **Step 6: Commit**

```bash
git add src/types/planning.types.ts src/domain/planning/Planning.ts src/domain/planning/Planning.test.ts
git commit -m "feat(planning): planning entity with seasons, ratios and placements

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: PositionSearch and fill-by-ratio placement

**Files:**
- Create: `src/domain/planning/PositionSearch.ts`, `src/domain/planning/PositionSearch.test.ts`
- Create: `src/domain/planning/SeasonPlacement.ts`, `src/domain/planning/SeasonPlacement.test.ts`

**Interfaces:**
- Consumes: `PlantFootprint`, `minimumPatchSideCm`, `FootprintTraits`, `PatchShape`, `Bounds`, `boundsOverlap` (`PlantFootprint.ts`); `fitsInArea`, `PlantingArea` (`PlantingArea.ts`); `PlantRelations` (`PlantRelations.ts`)
- Produces:
  - `interface Occupant { plantId: string; bounds: Bounds; weight: number }`
  - `bestSpot(plantId, footprint, area, occupants, relations): { xCm; yCm; score } | null`
  - `interface FixedPlacement { plantId; layerIndex; footprint: PlantFootprint; xCm; yCm }`
  - `interface RatioPlant { plantId; ratio: number; traits: FootprintTraits }`
  - `interface SeasonPlacementRequest { layers: readonly PlantingArea[]; fixed: readonly FixedPlacement[]; plants: readonly RatioPlant[]; relations: PlantRelations }`
  - `interface NewPlacement { plantId; layerIndex; xCm; yCm; patch?: PatchShape }`
  - `interface PlantShare { plantId; count; actualShare; targetShare }` (shares 0..1 of the free area)
  - `fillByRatio(request): { placements: readonly NewPlacement[]; shares: readonly PlantShare[] }`

- [ ] **Step 1: Write the failing PositionSearch tests**

Create `src/domain/planning/PositionSearch.test.ts`:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bestSpot } from './PositionSearch.ts';
import { PlantFootprint } from './PlantFootprint.ts';
import type { PlantRelations } from './PlantRelations.ts';

const neutral: PlantRelations = () => 'neutral';
const square20 = PlantFootprint.of(20, 20);
const box = { shape: 'rectangle', widthCm: 100, lengthCm: 20 } as const;

describe('bestSpot', () => {
  test('given an empty area, the top-left spot wins', () => {
    assert.deepEqual(bestSpot('a', square20, box, [], neutral), { xCm: 10, yCm: 10, score: 0 });
  });

  test('given an occupant, the spot sits flush against it', () => {
    const occupants = [{ plantId: 'b', bounds: { left: 0, top: 0, right: 20, bottom: 20 }, weight: 1 }];
    assert.deepEqual(bestSpot('a', square20, box, occupants, neutral), { xCm: 30, yCm: 10, score: 0 });
  });

  test('given a combative occupant, the spot keeps more than 5 cm away', () => {
    const combative: PlantRelations = () => 'combative';
    const occupants = [{ plantId: 'b', bounds: { left: 0, top: 0, right: 20, bottom: 20 }, weight: 1 }];
    assert.equal(bestSpot('a', square20, box, occupants, combative)?.xCm, 40);
  });

  test('given no free spot, null', () => {
    const occupants = [{ plantId: 'b', bounds: { left: 0, top: 0, right: 100, bottom: 20 }, weight: 1 }];
    assert.equal(bestSpot('a', square20, box, occupants, neutral), null);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test src/domain/planning/PositionSearch.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement PositionSearch**

Create `src/domain/planning/PositionSearch.ts` (the position search and scoring of `AutoPlacement.findBestSpot`, without growing periods):

```ts
import { boundsOverlap } from './PlantFootprint.ts';
import type { Bounds, PlantFootprint } from './PlantFootprint.ts';
import { fitsInArea } from './PlantingArea.ts';
import type { PlantingArea } from './PlantingArea.ts';
import type { PlantRelation, PlantRelations } from './PlantRelations.ts';

/** A plant already in the area */
export interface Occupant {
  readonly plantId: string;
  readonly bounds: Bounds;
  /** What one point of relation score with this plant is worth */
  readonly weight: number;
}

export interface Spot {
  /** Centre of the footprint, from the top-left of the area */
  readonly xCm: number;
  readonly yCm: number;
  readonly score: number;
}

const GRID_CM = 5;
const NEIGHBOUR_DISTANCE_CM = 5;
const COMPANION_SCORE = 1;
const COMBATIVE_SCORE = -2;
const EPSILON = 1e-9;

interface ScoringNeighbour {
  readonly bounds: Bounds;
  readonly relation: PlantRelation;
  readonly weight: number;
}

interface Corner {
  readonly left: number;
  readonly top: number;
  readonly score: number;
}

/**
 * The best free spot for a footprint: inside the area, overlapping no
 * occupant, with the highest relation score (+1 per companion sharing an
 * edge, -2 per combative plant within 5 cm, times the occupant's weight).
 * Ties go to the smallest y, then the smallest x. Null when nothing fits.
 */
export function bestSpot(
  plantId: string,
  footprint: PlantFootprint,
  area: PlantingArea,
  occupants: readonly Occupant[],
  relations: PlantRelations,
): Spot | null {
  const { widthCm, lengthCm } = footprint;
  const scoring: ScoringNeighbour[] = occupants.flatMap((occupant) => {
    const relation = relations(plantId, occupant.plantId);
    return relation === 'neutral' ? [] : [{ bounds: occupant.bounds, relation, weight: occupant.weight }];
  });
  const taken = occupants.map((occupant) => occupant.bounds);

  const lefts = candidatePositions(areaWidth(area), widthCm, taken.flatMap((b) => [b.right, b.left - widthCm]));
  const tops = candidatePositions(areaLength(area), lengthCm, taken.flatMap((b) => [b.bottom, b.top - lengthCm]));
  let best: Corner | null = null;

  for (const left of lefts) {
    // Only plants overlapping this column can block a position in it
    const column = taken.filter((b) => left < b.right && b.left < left + widthCm);
    for (const top of tops) {
      const bounds: Bounds = { left, top, right: left + widthCm, bottom: top + lengthCm };
      if (column.some((b) => boundsOverlap(bounds, b)) || !fitsInArea(area, footprint, left + widthCm / 2, top + lengthCm / 2)) {
        continue;
      }
      const corner: Corner = { left, top, score: scoringGain(bounds, scoring) };
      if (best === null || isBetterCorner(corner, best)) {
        best = corner;
      }
    }
  }
  return best === null ? null : { xCm: best.left + widthCm / 2, yCm: best.top + lengthCm / 2, score: best.score };
}

/** Higher score wins; equal scores go to the smallest y, then the smallest x */
function isBetterCorner(corner: Corner, best: Corner): boolean {
  if (Math.abs(corner.score - best.score) > EPSILON) {
    return corner.score > best.score;
  }
  return corner.top < best.top || (corner.top === best.top && corner.left < best.left);
}

function scoringGain(bounds: Bounds, neighbours: readonly ScoringNeighbour[]): number {
  let score = 0;
  for (const neighbour of neighbours) {
    score += relationScore(neighbour.relation, bounds, neighbour.bounds) * neighbour.weight;
  }
  return score;
}

/**
 * +1 for a companion sharing an edge (close on one axis while facing each
 * other on the other), -2 for a combative plant within 5 cm on both axes.
 */
function relationScore(relation: PlantRelation, a: Bounds, b: Bounds): number {
  if (relation === 'neutral') {
    return 0;
  }
  const gapX = Math.max(0, b.left - a.right, a.left - b.right);
  const gapY = Math.max(0, b.top - a.bottom, a.top - b.bottom);
  const nearX = gapX <= NEIGHBOUR_DISTANCE_CM + EPSILON;
  const nearY = gapY <= NEIGHBOUR_DISTANCE_CM + EPSILON;

  if (relation === 'companion') {
    const facingX = Math.min(a.right, b.right) - Math.max(a.left, b.left) > EPSILON;
    const facingY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > EPSILON;
    return (nearX && facingY) || (nearY && facingX) ? COMPANION_SCORE : 0;
  }
  return nearX && nearY ? COMBATIVE_SCORE : 0;
}

/**
 * Start coordinates to try on one axis, ascending: the 5 cm grid, the far
 * edge of the area, and the given edges of other plants, so a footprint can
 * sit flush against them. Only starts that keep the footprint inside are kept.
 */
function candidatePositions(areaSizeCm: number, footprintSizeCm: number, plantEdges: readonly number[]): number[] {
  const maxStart = areaSizeCm - footprintSizeCm;
  const starts = new Map<number, number>();
  const add = (start: number): void => {
    if (start >= -EPSILON && start <= maxStart + EPSILON) {
      const clamped = Math.min(Math.max(start, 0), maxStart);
      starts.set(Math.round(clamped * 1e6), clamped);
    }
  };

  for (let start = 0; start <= maxStart + EPSILON; start += GRID_CM) {
    add(start);
  }
  add(maxStart);
  plantEdges.forEach(add);
  return [...starts.values()].sort((a, b) => a - b);
}

export function areaWidth(area: PlantingArea): number {
  return area.shape === 'circle' ? area.diameterCm : area.widthCm;
}

export function areaLength(area: PlantingArea): number {
  return area.shape === 'circle' ? area.diameterCm : area.lengthCm;
}
```

- [ ] **Step 4: Run the PositionSearch tests**

Run: `node --test src/domain/planning/PositionSearch.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing SeasonPlacement tests**

Create `src/domain/planning/SeasonPlacement.test.ts`:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { fillByRatio } from './SeasonPlacement.ts';
import type { NewPlacement, RatioPlant, SeasonPlacementRequest } from './SeasonPlacement.ts';
import { PlantFootprint, boundsOverlap } from './PlantFootprint.ts';
import type { PlantRelations } from './PlantRelations.ts';

const neutral: PlantRelations = () => 'neutral';
const box100 = { shape: 'rectangle', widthCm: 100, lengthCm: 100 } as const;

const individual = (plantId: string, radius: number, ratio: number): RatioPlant => ({
  plantId,
  ratio,
  traits: { spacingRadiusCm: radius, plantingStyle: 'individual' },
});
const patchPlant = (plantId: string, ratio: number): RatioPlant => ({
  plantId,
  ratio,
  traits: { spacingRadiusCm: 2, sowingSpacingCm: 5, plantingStyle: 'patch' },
});

const request = (overrides: Partial<SeasonPlacementRequest>): SeasonPlacementRequest => ({
  layers: [box100],
  fixed: [],
  plants: [],
  relations: neutral,
  ...overrides,
});

const countOf = (placements: readonly NewPlacement[], plantId: string): number =>
  placements.filter((p) => p.plantId === plantId).length;

function footprintOfPlacement(placement: NewPlacement, plants: readonly RatioPlant[]): PlantFootprint {
  const plant = plants.find((p) => p.plantId === placement.plantId);
  assert.ok(plant);
  return PlantFootprint.forPlant(plant.traits, placement.patch ?? {});
}

/** No two placements (or a placement and a fixed plant) on the same layer overlap */
function assertNoOverlap(req: SeasonPlacementRequest, placements: readonly NewPlacement[]): void {
  const all = [
    ...req.fixed.map((f) => ({ layer: f.layerIndex, bounds: f.footprint.boundsAt(f.xCm, f.yCm) })),
    ...placements.map((p) => ({ layer: p.layerIndex, bounds: footprintOfPlacement(p, req.plants).boundsAt(p.xCm, p.yCm) })),
  ];
  all.forEach((a, i) =>
    all.slice(i + 1).forEach((b) => assert.ok(a.layer !== b.layer || !boundsOverlap(a.bounds, b.bounds), 'overlap')),
  );
}

describe('fillByRatio', () => {
  test('given equal ratios, the plants share the box evenly and fill it', () => {
    const req = request({ plants: [individual('a', 10, 1), individual('b', 10, 1)] });
    const { placements } = fillByRatio(req);
    assert.equal(countOf(placements, 'a'), 13);
    assert.equal(countOf(placements, 'b'), 12);
    assertNoOverlap(req, placements);
  });

  test('given ratio 1 to 4, the second plant gets four times the area', () => {
    const { placements, shares } = fillByRatio(request({ plants: [individual('a', 10, 1), individual('b', 10, 4)] }));
    assert.equal(countOf(placements, 'a'), 5);
    assert.equal(countOf(placements, 'b'), 20);
    assert.deepEqual(shares.map((s) => [s.plantId, s.count, s.targetShare]), [['a', 5, 0.2], ['b', 20, 0.8]]);
    assert.equal(shares[1].actualShare, 0.8);
  });

  test('given a plant that cannot use its whole share, the leftover goes to the others', () => {
    const { placements } = fillByRatio(request({ plants: [individual('big', 40, 1), individual('small', 10, 1)] }));
    assert.equal(countOf(placements, 'big'), 1);
    assert.equal(countOf(placements, 'small'), 9);
  });

  test('given a fixed plant, its space is not free and nothing overlaps it', () => {
    const req = request({
      fixed: [{ plantId: 'x', layerIndex: 0, footprint: PlantFootprint.of(50, 100), xCm: 25, yCm: 50 }],
      plants: [individual('a', 10, 1)],
    });
    const { placements, shares } = fillByRatio(req);
    assert.equal(placements.length, 10);
    assert.equal(shares[0].actualShare, 4000 / 5000);
    assertNoOverlap(req, placements);
  });

  test('given tower layers, every layer is filled and the placement names its layer', () => {
    const req = request({
      layers: [{ shape: 'rectangle', widthCm: 40, lengthCm: 40 }, { shape: 'rectangle', widthCm: 20, lengthCm: 20 }],
      plants: [individual('a', 10, 1)],
    });
    const { placements } = fillByRatio(req);
    assert.equal(placements.filter((p) => p.layerIndex === 0).length, 4);
    assert.equal(placements.filter((p) => p.layerIndex === 1).length, 1);
  });

  test('given a patch plant, it gets one patch close to its target area', () => {
    const req = request({ plants: [patchPlant('p', 1), individual('a', 10, 1)] });
    const { placements } = fillByRatio(req);
    const patches = placements.filter((p) => p.plantId === 'p');
    assert.equal(patches.length, 1);
    assert.deepEqual(patches[0].patch, { widthCm: 70, heightCm: 70, rotationDeg: 0 });
    assert.ok(countOf(placements, 'a') >= 5);
    assertNoOverlap(req, placements);
  });

  test('given little room, a patch shrinks until it fits, never below its minimum side', () => {
    const req = request({
      fixed: [{ plantId: 'x', layerIndex: 0, footprint: PlantFootprint.of(100, 85), xCm: 50, yCm: 42.5 }],
      plants: [patchPlant('p', 1)],
    });
    const patch = fillByRatio(req).placements[0]?.patch;
    assert.ok(patch);
    assert.ok(patch.heightCm <= 15 && patch.heightCm >= 10, `height ${patch.heightCm}`);
  });

  test('given a layer smaller than the minimum patch, the plant does not fit', () => {
    const { placements, shares } = fillByRatio(request({
      layers: [{ shape: 'rectangle', widthCm: 8, lengthCm: 8 }],
      plants: [patchPlant('p', 1)],
    }));
    assert.deepEqual(placements, []);
    assert.deepEqual([shares[0].count, shares[0].actualShare], [0, 0]);
  });

  test('given combative plants, the second keeps its distance while there is room', () => {
    const combative: PlantRelations = (x, y) => (x !== y ? 'combative' : 'neutral');
    const { placements } = fillByRatio(request({
      layers: [{ shape: 'rectangle', widthCm: 100, lengthCm: 20 }],
      plants: [individual('a', 10, 1), individual('c', 10, 1)],
      relations: combative,
    }));
    assert.deepEqual([placements[0].plantId, placements[0].xCm], ['a', 10]);
    assert.deepEqual([placements[1].plantId, placements[1].xCm], ['c', 40]);
  });

  test('gives the same result whatever the order of the plants', () => {
    const plants = [individual('a', 10, 2), patchPlant('p', 1), individual('b', 15, 1)];
    assert.deepEqual(fillByRatio(request({ plants })), fillByRatio(request({ plants: [...plants].reverse() })));
  });

  test('given no free area, nothing is placed', () => {
    const { placements, shares } = fillByRatio(request({
      fixed: [{ plantId: 'x', layerIndex: 0, footprint: PlantFootprint.of(100, 100), xCm: 50, yCm: 50 }],
      plants: [individual('a', 10, 1)],
    }));
    assert.deepEqual(placements, []);
    assert.equal(shares[0].count, 0);
  });
});
```

- [ ] **Step 6: Run them to verify they fail**

Run: `node --test src/domain/planning/SeasonPlacement.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement SeasonPlacement**

Create `src/domain/planning/SeasonPlacement.ts`:

```ts
import { PlantFootprint, minimumPatchSideCm } from './PlantFootprint.ts';
import type { FootprintTraits, PatchShape } from './PlantFootprint.ts';
import type { PlantingArea } from './PlantingArea.ts';
import type { PlantRelations } from './PlantRelations.ts';
import { areaLength, areaWidth, bestSpot } from './PositionSearch.ts';
import type { Occupant, Spot } from './PositionSearch.ts';

/** A plant that stays where it is: locked, or carried over from an earlier season */
export interface FixedPlacement {
  readonly plantId: string;
  readonly layerIndex: number;
  readonly footprint: PlantFootprint;
  readonly xCm: number;
  readonly yCm: number;
}

/** A plant starting in the season, with its share of the free area relative to the others */
export interface RatioPlant {
  readonly plantId: string;
  readonly ratio: number;
  readonly traits: FootprintTraits;
}

export interface SeasonPlacementRequest {
  /** One area per layer; index = layerIndex */
  readonly layers: readonly PlantingArea[];
  readonly fixed: readonly FixedPlacement[];
  readonly plants: readonly RatioPlant[];
  readonly relations: PlantRelations;
}

export interface NewPlacement {
  readonly plantId: string;
  readonly layerIndex: number;
  /** Centre of the footprint, from the top-left of the layer */
  readonly xCm: number;
  readonly yCm: number;
  /** Patch and thinning plants only */
  readonly patch?: PatchShape;
}

/** How much of the free area a plant got, against what its ratio asked for (both 0..1) */
export interface PlantShare {
  readonly plantId: string;
  readonly count: number;
  readonly actualShare: number;
  readonly targetShare: number;
}

export interface SeasonPlacementResult {
  readonly placements: readonly NewPlacement[];
  readonly shares: readonly PlantShare[];
}

/** Fixed plants count once in a neighbour's score; plants placed in this run gain and give, so twice */
const FIXED_WEIGHT = 1;
const PLACED_WEIGHT = 2;
const PATCH_SHRINK = 0.9;
const EPSILON = 1e-9;

/**
 * Fills the layers by ratio. The free area (layers minus fixed plants) is
 * shared by ratio; patch plants first get one patch close to their share,
 * then individual plants are placed one at a time, always the plant
 * furthest behind its share, until none fits anymore. Leftover space thus
 * goes to the plants that can still use it. Pure and deterministic.
 */
export function fillByRatio(request: SeasonPlacementRequest): SeasonPlacementResult {
  const plants = [...request.plants].sort((a, b) => compareText(a.plantId, b.plantId));
  const occupants: Occupant[][] = request.layers.map(() => []);
  for (const fixed of request.fixed) {
    occupants[fixed.layerIndex]?.push({
      plantId: fixed.plantId,
      bounds: fixed.footprint.boundsAt(fixed.xCm, fixed.yCm),
      weight: FIXED_WEIGHT,
    });
  }

  const freeArea = Math.max(0, sum(request.layers.map(areaOf)) - sum(request.fixed.map((f) => f.footprint.areaCm2)));
  const totalRatio = sum(plants.map((p) => p.ratio));
  const targetOf = new Map(plants.map((p) => [p.plantId, totalRatio > 0 ? (p.ratio / totalRatio) * freeArea : 0]));
  const placedAreaOf = new Map(plants.map((p) => [p.plantId, 0]));
  const countOf = new Map(plants.map((p) => [p.plantId, 0]));
  const placements: NewPlacement[] = [];

  const place = (plant: RatioPlant, footprint: PlantFootprint, patch?: PatchShape): boolean => {
    const spot = bestSpotOverLayers(plant.plantId, footprint, request.layers, occupants, request.relations);
    if (spot === null) {
      return false;
    }
    placements.push({ plantId: plant.plantId, layerIndex: spot.layerIndex, xCm: spot.xCm, yCm: spot.yCm, ...(patch ? { patch } : {}) });
    occupants[spot.layerIndex].push({ plantId: plant.plantId, bounds: footprint.boundsAt(spot.xCm, spot.yCm), weight: PLACED_WEIGHT });
    placedAreaOf.set(plant.plantId, (placedAreaOf.get(plant.plantId) ?? 0) + footprint.areaCm2);
    countOf.set(plant.plantId, (countOf.get(plant.plantId) ?? 0) + 1);
    return true;
  };

  if (freeArea > 0) {
    const target = (plant: RatioPlant): number => targetOf.get(plant.plantId) ?? 0;
    const patches = plants
      .filter((p) => isSownOverArea(p.traits))
      .sort((a, b) => target(b) - target(a) || compareText(a.plantId, b.plantId));
    for (const plant of patches) {
      placePatch(plant, target(plant), request.layers, place);
    }

    const footprintOf = new Map(plants.map((p) => [p.plantId, PlantFootprint.forPlant(p.traits)]));
    const active = plants.filter((p) => !isSownOverArea(p.traits));
    while (active.length > 0) {
      const plant = furthestBehind(active, placedAreaOf, targetOf, footprintOf);
      const footprint = footprintOf.get(plant.plantId);
      if (footprint === undefined || !place(plant, footprint)) {
        active.splice(active.indexOf(plant), 1);
      }
    }
  }

  return {
    placements,
    shares: plants.map((p) => ({
      plantId: p.plantId,
      count: countOf.get(p.plantId) ?? 0,
      actualShare: freeArea > 0 ? (placedAreaOf.get(p.plantId) ?? 0) / freeArea : 0,
      targetShare: totalRatio > 0 ? p.ratio / totalRatio : 0,
    })),
  };
}

/**
 * One patch with an area close to the target: square-ish within the widest
 * layer, shrunk step by step until it fits, never below the minimum side.
 */
function placePatch(
  plant: RatioPlant,
  targetArea: number,
  layers: readonly PlantingArea[],
  place: (plant: RatioPlant, footprint: PlantFootprint, patch: PatchShape) => boolean,
): void {
  const minimum = minimumPatchSideCm(plant.traits);
  const width = Math.min(Math.max(...layers.map(areaWidth)), Math.max(minimum, Math.sqrt(targetArea)));
  const length = Math.min(Math.max(...layers.map(areaLength)), Math.max(minimum, targetArea / width));

  for (let factor = 1; ; factor *= PATCH_SHRINK) {
    const patch: PatchShape = {
      widthCm: Math.max(minimum, Math.floor(width * factor)),
      heightCm: Math.max(minimum, Math.floor(length * factor)),
      rotationDeg: 0,
    };
    if (place(plant, PlantFootprint.forPlant(plant.traits, patch), patch)) {
      return;
    }
    if (patch.widthCm === minimum && patch.heightCm === minimum) {
      return;
    }
  }
}

/** Lowest placed area / target first; ties go to the larger footprint, then the plantId */
function furthestBehind(
  active: readonly RatioPlant[],
  placedAreaOf: ReadonlyMap<string, number>,
  targetOf: ReadonlyMap<string, number>,
  footprintOf: ReadonlyMap<string, PlantFootprint>,
): RatioPlant {
  const progress = (p: RatioPlant): number => (placedAreaOf.get(p.plantId) ?? 0) / Math.max(EPSILON, targetOf.get(p.plantId) ?? 0);
  const size = (p: RatioPlant): number => footprintOf.get(p.plantId)?.areaCm2 ?? 0;
  let best = active[0];
  for (const plant of active.slice(1)) {
    const difference = progress(plant) - progress(best);
    if (difference < -EPSILON || (Math.abs(difference) <= EPSILON && size(plant) > size(best))) {
      best = plant;
    }
  }
  return best;
}

/** The best spot over all layers; ties go to the lowest layer */
function bestSpotOverLayers(
  plantId: string,
  footprint: PlantFootprint,
  layers: readonly PlantingArea[],
  occupants: readonly (readonly Occupant[])[],
  relations: PlantRelations,
): (Spot & { readonly layerIndex: number }) | null {
  let best: (Spot & { readonly layerIndex: number }) | null = null;
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const spot = bestSpot(plantId, footprint, layers[layerIndex], occupants[layerIndex], relations);
    if (spot !== null && (best === null || spot.score > best.score + EPSILON)) {
      best = { ...spot, layerIndex };
    }
  }
  return best;
}

function isSownOverArea(traits: FootprintTraits): boolean {
  return traits.plantingStyle === 'patch' || traits.plantingStyle === 'thinning';
}

function areaOf(area: PlantingArea): number {
  return area.shape === 'circle' ? Math.PI * (area.diameterCm / 2) ** 2 : area.widthCm * area.lengthCm;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Locale-independent comparison, so the order is the same on every device */
function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `node --test src/domain/planning/SeasonPlacement.test.ts`
Expected: PASS (11 tests). If a count assertion is off, debug the algorithm (tie-breaks, flush positions) rather than changing the expected counts: the expected values were derived by hand in the plan (13/12 alternate fill; 5/20 by ratio; 1 big + 9 small in the L-shaped rest; 10 in the free half; 70 × 70 patch = floor(√5000)).

- [ ] **Step 9: Commit**

```bash
git add src/domain/planning/PositionSearch.ts src/domain/planning/PositionSearch.test.ts src/domain/planning/SeasonPlacement.ts src/domain/planning/SeasonPlacement.test.ts
git commit -m "feat(planning): fill a component by ratio around fixed plants

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Season optimization use case and component areas

**Files:**
- Create: `src/domain/planning/ComponentArea.ts`, `src/domain/planning/ComponentArea.test.ts`
- Create: `src/domain/planning/SeasonOptimization.ts`, `src/domain/planning/SeasonOptimization.test.ts`
- Modify: `src/domain/planning/ComponentPlanning.ts` (import `plantingAreaOf` from `ComponentArea.ts` instead of defining it)
- Modify: `src/domain/planning/index.ts` (export new modules)

**Interfaces:**
- Consumes: `Planning` (Task 3), `fillByRatio`, `PlantShare` (Task 4), `footprintOf` (`PlantFootprint.ts`), `relationsFromCatalog` (`PlantRelations.ts`), `getTowerLayerDimensions` (`src/domain/component/towerLayerGeometry.ts`)
- Produces:
  - `plantingAreaOf(component: ComponentData, layerIndex?: number): PlantingArea` (moved, unchanged)
  - `plantingAreasOf(component: ComponentData): PlantingArea[]` (one per layer; one for a box or pot)
  - `optimizeSeason(input: SeasonOptimizationInput): { planning: Planning; shares: readonly PlantShare[] }` with `SeasonOptimizationInput = { planning; season; areas: readonly PlantingArea[]; hasLayers: boolean; plantOf: (id) => PlantData | undefined; newId: () => string }`

- [ ] **Step 1: Write the failing ComponentArea test**

Create `src/domain/planning/ComponentArea.test.ts`:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { plantingAreasOf } from './ComponentArea.ts';
import type { ComponentData } from '../../types/component.types.ts';

const component = (data: Record<string, unknown>): ComponentData => data as unknown as ComponentData;

describe('plantingAreasOf', () => {
  test('given a garden box, one rectangle without the border', () => {
    assert.deepEqual(plantingAreasOf(component({ type: 'gardenBox', widthInCm: 120, lengthInCm: 100, borderWidthInCm: 5 })), [
      { shape: 'rectangle', widthCm: 110, lengthCm: 90 },
    ]);
  });

  test('given a pot, one circle', () => {
    assert.deepEqual(plantingAreasOf(component({ type: 'pot', diameterInCm: 40, borderWidthInCm: 2 })), [
      { shape: 'circle', diameterCm: 36 },
    ]);
  });

  test('given a tower, one area per layer, the bottom layer first', () => {
    const areas = plantingAreasOf(component({ type: 'circularTower', diameterInCm: 60, borderWidthInCm: 0, numberOfLayers: 3 }));
    assert.equal(areas.length, 3);
    assert.deepEqual(areas[0], { shape: 'circle', diameterCm: 60 });
    assert.ok(areas[1].shape === 'circle' && areas[1].diameterCm < 60);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test src/domain/planning/ComponentArea.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Move plantingAreaOf to ComponentArea**

Create `src/domain/planning/ComponentArea.ts` with the `plantingAreaOf` function cut from `ComponentPlanning.ts` (same body) plus `plantingAreasOf`:

```ts
import type { ComponentData } from '../../types/component.types.ts';
import { getTowerLayerDimensions } from '../component/towerLayerGeometry.ts';
import type { PlantingArea } from './PlantingArea.ts';

/** The inner area of a component or tower layer, as the canvas draws it */
export function plantingAreaOf(component: ComponentData, layerIndex?: number): PlantingArea {
  const border = 2 * component.borderWidthInCm;
  const layer = layerIndex ?? 0;

  switch (component.type) {
    case 'gardenBox':
      return {
        shape: 'rectangle',
        widthCm: Math.max(0, component.widthInCm - border),
        lengthCm: Math.max(0, component.lengthInCm - border),
      };
    case 'pot':
      return { shape: 'circle', diameterCm: Math.max(0, component.diameterInCm - border) };
    case 'rectangularTower': {
      const dims = getTowerLayerDimensions(component.widthInCm - border, component.lengthInCm - border, layer);
      return { shape: 'rectangle', widthCm: dims.width, lengthCm: dims.height };
    }
    case 'circularTower': {
      const dims = getTowerLayerDimensions(component.diameterInCm - border, component.diameterInCm - border, layer);
      return { shape: 'circle', diameterCm: dims.width };
    }
  }
}

/** Every area plants can go in: one per tower layer (bottom first), one for a box or pot */
export function plantingAreasOf(component: ComponentData): PlantingArea[] {
  const layers = component.type === 'rectangularTower' || component.type === 'circularTower' ? component.numberOfLayers : 1;
  return Array.from({ length: layers }, (_, layerIndex) => plantingAreaOf(component, layers > 1 ? layerIndex : undefined));
}
```

In `ComponentPlanning.ts`: delete `plantingAreaOf` and the `getTowerLayerDimensions` import, add `import { plantingAreaOf } from './ComponentArea.ts';` and add `export { plantingAreaOf };` so its existing users keep working until Task 6.

In `src/domain/planning/index.ts`: change the line `export { plantingAreaOf, rearrangePlanting, startPlantingOver } from './ComponentPlanning';` to `export { rearrangePlanting, startPlantingOver } from './ComponentPlanning';` and add `export { plantingAreaOf, plantingAreasOf } from './ComponentArea';`.

- [ ] **Step 4: Run the ComponentArea tests and the existing suite**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Write the failing SeasonOptimization tests**

Create `src/domain/planning/SeasonOptimization.test.ts`:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { optimizeSeason } from './SeasonOptimization.ts';
import { Planning } from './Planning.ts';
import { PlantFootprint, boundsOverlap, footprintOf } from './PlantFootprint.ts';
import type { PlantData } from '../../types/plant.types.ts';
import type { PlacementData, Season } from '../../types/planning.types.ts';

const plant = (id: string, overrides: Partial<PlantData> = {}): PlantData =>
  ({ id, nameNl: id, spacingRadiusCm: 10, plantingStyle: 'individual', companions: [], combatives: [], ...overrides }) as PlantData;

const CATALOG = new Map<string, PlantData>([
  ['tomaat', plant('tomaat', { spacingRadiusCm: 25 })],
  ['sla', plant('sla')],
  ['boerenkool', plant('boerenkool')],
  ['snijsla', plant('snijsla', { plantingStyle: 'patch', spacingRadiusCm: 2, sowingSpacingCm: 5 })],
]);
const SEASONS_BY_PLANT: Record<string, readonly Season[]> = {
  tomaat: ['spring', 'summer'],
  sla: ['spring'],
  boerenkool: ['summer'],
  snijsla: ['spring'],
  onbekend: ['spring'],
};
const seasonsOf = (id: string): readonly Season[] => SEASONS_BY_PLANT[id] ?? [];
const box = [{ shape: 'rectangle', widthCm: 100, lengthCm: 100 } as const];

function ids(): () => string {
  let next = 0;
  return () => `id-${++next}`;
}

const input = (planning: Planning, season: Season, extra: { hasLayers?: boolean; areas?: typeof box } = {}) => ({
  planning,
  season,
  areas: extra.areas ?? box,
  hasLayers: extra.hasLayers ?? false,
  plantOf: (id: string) => CATALOG.get(id),
  newId: ids(),
});

const boundsOf = (p: PlacementData) => footprintOf(CATALOG.get(p.plantId), p).boundsAt(p.positionX, p.positionY);

describe('optimizeSeason', () => {
  test('places the plants starting in the season by their ratio and marks the season planned', () => {
    const planning = Planning.empty(seasonsOf).addPlants(['tomaat', 'sla']).setRatio('spring', 'sla', 2);
    const outcome = optimizeSeason(input(planning, 'spring'));
    const placements = outcome.planning.placementsIn('spring');
    assert.ok(placements.some((p) => p.plantId === 'tomaat'));
    assert.ok(placements.some((p) => p.plantId === 'sla'));
    assert.equal(placements[0].id, 'id-1');
    assert.equal(placements[0].layerIndex, undefined);
    assert.equal(outcome.planning.statusOf('spring'), 'planned');
    assert.deepEqual(outcome.shares.map((s) => s.plantId), ['sla', 'tomaat']);
  });

  test('keeps carried plants where they are and places around them', () => {
    const spring = optimizeSeason(input(Planning.empty(seasonsOf).addPlants(['tomaat', 'boerenkool']), 'spring')).planning;
    const summer = optimizeSeason(input(spring, 'summer')).planning;
    const carried = summer.carriedPlacementsIn('summer');
    assert.deepEqual(carried, spring.placementsIn('spring').filter((p) => p.plantId === 'tomaat'));
    for (const own of summer.placementsIn('summer')) {
      for (const fixed of carried) {
        assert.ok(!boundsOverlap(boundsOf(own), boundsOf(fixed)));
      }
    }
  });

  test('keeps locked placements and does not overlap them', () => {
    const locked: PlacementData = { id: 'locked', plantId: 'sla', positionX: 50, positionY: 50, locked: true };
    const planning = Planning.empty(seasonsOf).addPlants(['sla']).applyPlacement('spring', [locked]);
    const placements = optimizeSeason(input(planning, 'spring')).planning.placementsIn('spring');
    assert.equal(placements[0], locked);
    for (const other of placements.slice(1)) {
      assert.ok(!boundsOverlap(boundsOf(other), boundsOf(locked)));
    }
  });

  test('given layers, placements name their layer', () => {
    const areas = [{ shape: 'rectangle', widthCm: 40, lengthCm: 40 } as const, { shape: 'rectangle', widthCm: 20, lengthCm: 20 } as const];
    const planning = Planning.empty(seasonsOf).addPlants(['sla']);
    const placements = optimizeSeason(input(planning, 'spring', { hasLayers: true, areas: areas as unknown as typeof box })).planning.placementsIn('spring');
    assert.deepEqual([...new Set(placements.map((p) => p.layerIndex))], [0, 1]);
  });

  test('gives a patch plant its patch size', () => {
    const planning = Planning.empty(seasonsOf).addPlants(['snijsla']);
    const [patch] = optimizeSeason(input(planning, 'spring')).planning.placementsIn('spring');
    assert.deepEqual([patch.patchWidthInCm, patch.patchHeightInCm, patch.patchRotationDeg], [100, 100, 0]);
    assert.equal(PlantFootprint.forPlant(CATALOG.get('snijsla')!, { widthCm: 100, heightCm: 100 }).areaCm2, 10000);
  });

  test('skips plants missing from the catalog', () => {
    const planning = Planning.empty(seasonsOf).addPlants(['onbekend', 'sla']);
    const outcome = optimizeSeason(input(planning, 'spring'));
    assert.ok(outcome.planning.placementsIn('spring').every((p) => p.plantId === 'sla'));
    assert.deepEqual(outcome.shares.map((s) => s.plantId), ['sla']);
  });
});
```

- [ ] **Step 6: Run them to verify they fail**

Run: `node --test src/domain/planning/SeasonOptimization.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement optimizeSeason**

Create `src/domain/planning/SeasonOptimization.ts`:

```ts
import type { PlantData } from '../../types/plant.types.ts';
import type { PlacementData, Season } from '../../types/planning.types.ts';
import type { Planning } from './Planning.ts';
import { footprintOf } from './PlantFootprint.ts';
import type { PlantingArea } from './PlantingArea.ts';
import { relationsFromCatalog } from './PlantRelations.ts';
import { fillByRatio } from './SeasonPlacement.ts';
import type { PlantShare } from './SeasonPlacement.ts';

export interface SeasonOptimizationInput {
  readonly planning: Planning;
  readonly season: Season;
  /** One area per layer: one for a box or pot, one per tower layer (index = layerIndex) */
  readonly areas: readonly PlantingArea[];
  /** Towers store the layer of each placement; boxes and pots do not */
  readonly hasLayers: boolean;
  readonly plantOf: (plantId: string) => PlantData | undefined;
  readonly newId: () => string;
}

export interface SeasonOptimizationOutcome {
  readonly planning: Planning;
  readonly shares: readonly PlantShare[];
}

/**
 * Optimize one season: the plants starting in it fill the free area by
 * ratio around the carried-over and locked plants. Unlocked placements of
 * the season are replaced. Plants missing from the catalog are skipped.
 */
export function optimizeSeason(input: SeasonOptimizationInput): SeasonOptimizationOutcome {
  const { planning, season, plantOf } = input;

  const fixed = planning.fixedPlacementsIn(season).map((placement) => ({
    plantId: placement.plantId,
    layerIndex: placement.layerIndex ?? 0,
    footprint: footprintOf(plantOf(placement.plantId), placement),
    xCm: placement.positionX,
    yCm: placement.positionY,
  }));
  const plants = planning.plantsStartingIn(season).flatMap((plantId) => {
    const plant = plantOf(plantId);
    return plant === undefined ? [] : [{ plantId, ratio: planning.ratioOf(season, plantId), traits: plant }];
  });

  const result = fillByRatio({
    layers: input.areas,
    fixed,
    plants,
    relations: relationsFromCatalog(planning.plants.flatMap((plantId) => plantOf(plantId) ?? [])),
  });

  const placements = result.placements.map((placed): PlacementData => ({
    id: input.newId(),
    plantId: placed.plantId,
    positionX: placed.xCm,
    positionY: placed.yCm,
    ...(input.hasLayers ? { layerIndex: placed.layerIndex } : {}),
    ...(placed.patch !== undefined
      ? { patchWidthInCm: placed.patch.widthCm, patchHeightInCm: placed.patch.heightCm, patchRotationDeg: placed.patch.rotationDeg }
      : {}),
  }));

  return { planning: planning.applyPlacement(season, placements), shares: result.shares };
}
```

- [ ] **Step 8: Export the new modules**

Append to `src/domain/planning/index.ts`:

```ts
export { SEASONS, seasonContaining, seasonMonths, seasonRange, seasonsAfter } from './Season';
export type { Season, SeasonRange, SeasonsOf } from './Season';

export { frostDayOf as frostDayFromIso, growingSeasonsOf, outdoorPeriodOf, plantingDatesOf, seasonsLookup } from './PlantCalendar';
export type { OutdoorPeriod, PlantingDates } from './PlantCalendar';

export { Planning } from './Planning';

export { fillByRatio } from './SeasonPlacement';
export type { FixedPlacement, NewPlacement, PlantShare, RatioPlant, SeasonPlacementRequest, SeasonPlacementResult } from './SeasonPlacement';

export { optimizeSeason } from './SeasonOptimization';
export type { SeasonOptimizationInput, SeasonOptimizationOutcome } from './SeasonOptimization';
```

(`frostDayOf` is still exported from `GrowingPeriod` here; Task 6 switches the index to `PlantCalendar`'s `frostDayOf` and drops the `frostDayFromIso` alias.)

- [ ] **Step 9: Run all unit tests and typecheck**

Run: `npm run test:unit` then `npm run typecheck`
Expected: PASS; typecheck passes.

- [ ] **Step 10: Commit**

```bash
git add src/domain/planning/ComponentArea.ts src/domain/planning/ComponentArea.test.ts src/domain/planning/SeasonOptimization.ts src/domain/planning/SeasonOptimization.test.ts src/domain/planning/ComponentPlanning.ts src/domain/planning/index.ts
git commit -m "feat(planning): optimize one season of a component

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Switch storage to plannings and remove week planning and AI optimize

After this task, unit tests pass and `npm run typecheck` reports errors **only** in `src/screens/ComponentDetailScreen/ComponentDetailScreen.tsx` and `src/screens/PlantSelectionScreen/PlantSelectionScreen.tsx` (rewritten in Tasks 7–8).

**Files:**
- Modify: `src/types/planning.types.ts`, `src/types/plant.types.ts`, `src/types/component.types.ts`
- Create: `src/schemas/planningSchema.ts`, `src/schemas/planningSchema.test.ts`
- Modify: `src/schemas/plantSchema.ts`, `src/schemas/plantSchema.test.ts`, `src/schemas/index.ts`
- Modify: `src/stores/migrations/componentStoreMigrations.ts` (+ rewrite its test)
- Modify: `src/domain/component/{GardenBox,Pot,RectangularTower,CircularTower}.ts`
- Modify: `src/domain/planning/PlantFootprint.ts` (+ test), `src/domain/planning/index.ts`
- Create: `src/domain/planning/CurrentPlacements.ts` (+ test)
- Modify: `src/stores/componentStore.ts`, `src/stores/planningStore.ts` (+ rewrite its test)
- Create: `src/stores/planningContext.ts`
- Modify: `src/screens/HomeScreen/HomeScreen.tsx`, `src/components/organisms/ComponentSlide/ComponentSlide.tsx`, `src/components/molecules/ComponentListRow/ComponentListRow.tsx`, `src/components/organisms/LayerOverviewModal/LayerOverviewModal.tsx`, `src/domain/ai/buildGardenSnapshot.ts`, `src/hooks/ai/useAiChat.ts`
- Delete: see Step 11

**Interfaces:**
- Produces:
  - `ComponentData.plannings: Readonly<Record<string, PlanningData>>` (key = year, e.g. `"2026"`); `plants` and `plantsToPlan` are gone
  - `PlacedPlantData` = `PlacementData` (alias; canvas keeps its prop types)
  - `planningDataSchema`, `placementDataSchema`, `seasonSchema` (`src/schemas/planningSchema.ts`)
  - `COMPONENT_STORE_VERSION = 4`; `migrateComponentState(persisted, version)`; `mergePersistedComponentState(persisted, current)`
  - `placementsGrowingOn(component, date, seasonsOfYear: (year) => SeasonsOf): PlacementData[]`
  - Store actions (`useComponentStore`): `addPlantsToPlanning(componentId, year, plantIds)`, `removePlantFromPlanning(componentId, year, plantId)`, `setRatio(componentId, year, season, plantId, ratio)`, `optimizeSeason(componentId, year, season): readonly PlantShare[] | null`, `movePlacement(componentId, year, season, placementId, x, y)`, `removePlacement(componentId, year, season, placementId)`, `togglePlacementLock(componentId, year, season, placementId)`, `setAllPlacementsLocked(componentId, year, season, locked)`, `resizePatch(componentId, year, season, placementId, w, h, rotationDeg)`, `reconcilePlannings()`
  - `usePlanningStore`: `setLastShares(key: SeasonKey, shares)`, `sharesOf(key): readonly PlantShare[] | undefined`, `forgetComponent(componentId)`; `interface SeasonKey { componentId: string; year: number; season: Season }`
  - `src/stores/planningContext.ts`: `seasonsOfYear(year): SeasonsOf`, `useSeasonsOfYear(year): SeasonsOf`, `usePlanning(component | undefined, year): Planning | null`, `useCurrentPlacementsById(components): ReadonlyMap<string, readonly PlacedPlantData[]>`

- [ ] **Step 1: Final types**

Replace the whole content of `src/types/planning.types.ts` with only the new types: keep the file header comment (reworded to "Planning type definitions: seasons, ratios and placements per component and year"), `Season`, `SeasonStatus`, `PlacementData`, `SeasonPlanData`, `PlanningData` as added in Tasks 1 and 3. Delete `PlantingMethod`, `GrowingPeriodData`, `PlantToPlanData`.

In `src/types/plant.types.ts`: replace `import type { GrowingPeriodData } from './planning.types';` with `import type { PlacementData } from './planning.types';` and replace the whole `PlacedPlantData` interface (with its doc comment) by:

```ts
/**
 * Placed plant instance in a garden component (a placement of a season)
 */
export type PlacedPlantData = PlacementData;
```

In `src/types/component.types.ts`: replace the `PlacedPlantData` and `PlantToPlanData` imports with `import type { PlanningData } from './planning.types';` and replace the two fields in `BaseComponentData`:

```ts
  readonly plants: readonly PlacedPlantData[]; // Plants placed in this component
  readonly plantsToPlan: readonly PlantToPlanData[]; // Plants waiting for auto-placement
```

with

```ts
  readonly plannings: Readonly<Record<string, PlanningData>>; // Planning per year, keyed "2026"
```

- [ ] **Step 2: Planning schema (test first)**

Create `src/schemas/planningSchema.test.ts`:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { planningDataSchema } from './planningSchema.ts';

const emptySeason = { ratios: {}, placements: [], status: 'notPlanned' };
const valid = {
  plants: ['tomaat'],
  seasons: {
    spring: { ratios: { tomaat: 2 }, placements: [{ id: 'p1', plantId: 'tomaat', positionX: 25, positionY: 25, locked: true }], status: 'planned' },
    summer: emptySeason,
    autumn: emptySeason,
    winter: emptySeason,
  },
};

describe('planningDataSchema', () => {
  test('accepts a valid planning', () => {
    assert.ok(planningDataSchema.safeParse(valid).success);
  });

  test('rejects a ratio below 1 or not whole, an unknown status and a missing season', () => {
    const withRatio = (ratio: number) => ({ ...valid, seasons: { ...valid.seasons, spring: { ...valid.seasons.spring, ratios: { tomaat: ratio } } } });
    assert.equal(planningDataSchema.safeParse(withRatio(0)).success, false);
    assert.equal(planningDataSchema.safeParse(withRatio(1.5)).success, false);
    assert.equal(planningDataSchema.safeParse({ ...valid, seasons: { ...valid.seasons, summer: { ...emptySeason, status: 'done' } } }).success, false);
    const { winter: _winter, ...threeSeasons } = valid.seasons;
    assert.equal(planningDataSchema.safeParse({ ...valid, seasons: threeSeasons }).success, false);
  });
});
```

Run: `node --test src/schemas/planningSchema.test.ts` — Expected: FAIL (module not found).

Create `src/schemas/planningSchema.ts`:

```ts
import { z } from 'zod';
import type { PlacementData, PlanningData } from '../types/planning.types';

/**
 * Planning schemas: what a component's planning per year looks like in storage
 */

export const seasonSchema = z.enum(['spring', 'summer', 'autumn', 'winter']);

export const placementDataSchema = z.object({
  id: z.string().min(1),
  plantId: z.string().min(1),
  positionX: z.number(),
  positionY: z.number(),
  layerIndex: z.number().int().min(0).optional(),
  locked: z.boolean().optional(),
  patchWidthInCm: z.number().positive().optional(),
  patchHeightInCm: z.number().positive().optional(),
  patchRotationDeg: z.number().min(0).max(359).optional(),
}) satisfies z.ZodType<PlacementData>;

const seasonPlanDataSchema = z.object({
  ratios: z.record(z.string(), z.number().int().min(1)),
  placements: z.array(placementDataSchema),
  status: z.enum(['notPlanned', 'planned', 'outdated']),
});

export const planningDataSchema = z.object({
  plants: z.array(z.string().min(1)),
  seasons: z.object({
    spring: seasonPlanDataSchema,
    summer: seasonPlanDataSchema,
    autumn: seasonPlanDataSchema,
    winter: seasonPlanDataSchema,
  }),
}) satisfies z.ZodType<PlanningData>;
```

Run: `node --test src/schemas/planningSchema.test.ts` — Expected: PASS.

- [ ] **Step 3: Remove the week schemas**

In `src/schemas/plantSchema.ts`: delete `isoWeekSchema`, `growingPeriodSchema`, `GrowingPeriodDataType`, `patchShapeFields`, `plantToPlanDataSchema`, `PlantToPlanDataType`, `placedPlantDataSchema`, `PlacedPlantDataType`, and the imports they need (`PlantingWeek`, `GrowingPeriodData`, `PlantToPlanData`).
In `src/schemas/plantSchema.test.ts`: delete the `growingPeriodSchema`, `placedPlantDataSchema` and `plantToPlanDataSchema` describe blocks and fixtures; if nothing is left, delete the file.
In `src/schemas/index.ts`: remove the exports of the deleted names and add:

```ts
export { placementDataSchema, planningDataSchema, seasonSchema } from './planningSchema';
```

Check: `git grep -n "growingPeriodSchema\|plantToPlanDataSchema\|placedPlantDataSchema\|PlacedPlantDataType\|PlantToPlanDataType" -- src` returns nothing.

- [ ] **Step 4: Migration v4 (test first)**

Replace `src/stores/migrations/componentStoreMigrations.test.ts` with:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENT_STORE_VERSION, mergePersistedComponentState, migrateComponentState } from './componentStoreMigrations.ts';

const emptySeason = { ratios: {}, placements: [], status: 'notPlanned' };
const planning = { plants: ['tomaat'], seasons: { spring: emptySeason, summer: emptySeason, autumn: emptySeason, winter: emptySeason } };

describe('migrateComponentState', () => {
  test('the current version is 4', () => {
    assert.equal(COMPONENT_STORE_VERSION, 4);
  });

  test('given version 1, canvas fields go and an empty planning map is added', () => {
    const migrated = migrateComponentState({ components: [{ id: 'c1', positionX: 1, positionY: 2, rotation: 15, plants: [] }] }, 1);
    assert.deepEqual(migrated.components, [{ id: 'c1', plannings: {} }]);
  });

  test('given version 3, placed plants and plants to plan are dropped; the component stays', () => {
    const migrated = migrateComponentState(
      { components: [{ id: 'c1', name: 'Bak', plants: [{ id: 'p1' }], plantsToPlan: [{ id: 't1' }] }] },
      3,
    );
    assert.deepEqual(migrated.components, [{ id: 'c1', name: 'Bak', plannings: {} }]);
  });

  test('given version 4, valid plannings stay and invalid ones or bad year keys are dropped', () => {
    const migrated = migrateComponentState(
      { components: [{ id: 'c1', plannings: { '2026': planning, '2027': { plants: 'x' }, nope: planning } }] },
      4,
    );
    assert.deepEqual(migrated.components, [{ id: 'c1', plannings: { '2026': planning } }]);
  });

  test('given something that is not a component state, an empty state', () => {
    assert.deepEqual(migrateComponentState(null, 3), { components: [] });
    assert.deepEqual(migrateComponentState({ components: 'x' }, 3), { components: [] });
  });
});

describe('mergePersistedComponentState', () => {
  test('repairs current-version data and keeps the live actions', () => {
    const action = (): void => undefined;
    const merged = mergePersistedComponentState({ components: [{ id: 'c1', plants: [] }] }, { components: [], action });
    assert.deepEqual(merged.components, [{ id: 'c1', plannings: {} }]);
    assert.equal(merged.action, action);
  });
});
```

Run: `node --test src/stores/migrations/componentStoreMigrations.test.ts` — Expected: FAIL.

Replace `src/stores/migrations/componentStoreMigrations.ts` with:

```ts
/**
 * Persisted-state migrations for the component store.
 * Pure: no Zustand, no AsyncStorage, no "@/" runtime imports.
 */
import type { ComponentData } from '../../types/component.types';
import type { PlanningData } from '../../types/planning.types';
import { planningDataSchema } from '../../schemas/planningSchema.ts';

/**
 * Version 2: canvas position and rotation removed from components.
 * Version 3: week-based planning (placed plants with growing periods, plants to plan).
 * Version 4: plants live in plannings per year and season; plantings from
 * version 3 and before are not converted.
 */
export const COMPONENT_STORE_VERSION = 4;

export interface PersistedComponentState {
  components: ComponentData[];
}

const EMPTY_STATE: PersistedComponentState = { components: [] };
const YEAR_KEY = /^\d{4}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stripCanvasFields(component: Record<string, unknown>): Record<string, unknown> {
  const { positionX: _x, positionY: _y, rotation: _r, ...rest } = component;
  return rest;
}

/** The stored plannings that are valid; others are dropped */
function validPlannings(value: unknown): Record<string, PlanningData> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([year, data]): [string, PlanningData][] => {
      const parsed = planningDataSchema.safeParse(data);
      return YEAR_KEY.test(year) && parsed.success ? [[year, parsed.data]] : [];
    }),
  );
}

/** Drops the week-planning fields and keeps only valid plannings */
function withPlannings(component: Record<string, unknown>): Record<string, unknown> {
  const { plants: _plants, plantsToPlan: _plantsToPlan, plannings, ...rest } = component;
  return { ...rest, plannings: validPlannings(plannings) };
}

export function migrateComponentState(persistedState: unknown, version: number): PersistedComponentState {
  if (!isRecord(persistedState) || !Array.isArray(persistedState.components)) {
    return EMPTY_STATE;
  }
  const components = persistedState.components.filter(isRecord);
  const withoutCanvas = version < 2 ? components.map(stripCanvasFields) : components;
  return { components: withoutCanvas.map(withPlannings) as unknown as ComponentData[] };
}

/**
 * Merge persisted state into the live store state. Zustand only runs
 * `migrate` on a version mismatch, so this guards a current-version blob
 * that is malformed as well. Actions on `currentState` are preserved.
 */
export function mergePersistedComponentState<T extends PersistedComponentState>(persistedState: unknown, currentState: T): T {
  return {
    ...currentState,
    ...migrateComponentState(persistedState, COMPONENT_STORE_VERSION),
  };
}
```

Run: `node --test src/stores/migrations/componentStoreMigrations.test.ts` — Expected: PASS.

- [ ] **Step 5: New components start with no plannings**

In each of `src/domain/component/GardenBox.ts`, `Pot.ts`, `RectangularTower.ts`, `CircularTower.ts`, in `toData()` replace the `plants: ...` line and the `plantsToPlan: ...` line with:

```ts
      plannings: {},
```

Check: `git grep -n "plantsToPlan\|plants: \[\]" -- src/domain/component` returns nothing.

- [ ] **Step 6: Conflicts without time**

In `src/domain/planning/PlantFootprint.ts`:
- delete the `GrowingPeriod` and `GrowingPeriodData` imports;
- remove `readonly period: GrowingPeriodData;` from `PositionedFootprint` (and "during a period" from its doc);
- replace `footprintsConflict` with:

```ts
/** Two plants conflict when their footprints overlap */
export function footprintsConflict(a: PositionedFootprint, b: PositionedFootprint): boolean {
  return boundsOverlap(a.footprint.boundsAt(a.xCm, a.yCm), b.footprint.boundsAt(b.xCm, b.yCm));
}
```

- change `type PlantInPlace = Pick<PlacedPlantData, 'id' | 'positionX' | 'positionY' | 'growingPeriod'>;` to `Pick<PlacedPlantData, 'id' | 'positionX' | 'positionY'>` and remove `period: plant.growingPeriod,` in `conflictingPlantIds`;
- update the doc comment on `footprintOf` ("auto-placement" → "the season placement").

In `src/domain/planning/PlantFootprint.test.ts`: remove `growingPeriod`/`period` from fixtures and delete the test(s) asserting that plants in different weeks do not conflict.

- [ ] **Step 7: Current placements (test first)**

Create `src/domain/planning/CurrentPlacements.test.ts`:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { placementsGrowingOn } from './CurrentPlacements.ts';
import { Planning } from './Planning.ts';
import type { Season } from '../../types/planning.types.ts';

const seasonsOf = (id: string): readonly Season[] => (id === 'tomaat' ? ['spring', 'summer'] : ['summer']);
const planning = Planning.empty(seasonsOf)
  .addPlants(['tomaat', 'boerenkool'])
  .applyPlacement('spring', [{ id: 't1', plantId: 'tomaat', positionX: 1, positionY: 1 }])
  .applyPlacement('summer', [{ id: 'b1', plantId: 'boerenkool', positionX: 2, positionY: 2 }]);
const component = { plannings: { '2026': planning.toData() } };

describe('placementsGrowingOn', () => {
  test('gives the carried and own placements of the season the day falls in', () => {
    assert.deepEqual(placementsGrowingOn(component, new Date(2026, 6, 1), () => seasonsOf).map((p) => p.id), ['t1', 'b1']);
    assert.deepEqual(placementsGrowingOn(component, new Date(2026, 3, 1), () => seasonsOf).map((p) => p.id), ['t1']);
  });

  test('given January, it looks at the winter of the planning year before', () => {
    assert.deepEqual(placementsGrowingOn(component, new Date(2027, 0, 5), () => seasonsOf), []);
  });

  test('given a year without planning, nothing', () => {
    assert.deepEqual(placementsGrowingOn(component, new Date(2030, 6, 1), () => seasonsOf), []);
  });
});
```

Create `src/domain/planning/CurrentPlacements.ts`:

```ts
import type { ComponentData } from '../../types/component.types.ts';
import type { PlacementData } from '../../types/planning.types.ts';
import { Planning } from './Planning.ts';
import { seasonContaining } from './Season.ts';
import type { SeasonsOf } from './Season.ts';

/**
 * What grows in a component on a day: the placements of that day's season,
 * including plants carried into it, from the planning of its year.
 */
export function placementsGrowingOn(
  component: Pick<ComponentData, 'plannings'>,
  date: Date,
  seasonsOfYear: (year: number) => SeasonsOf,
): PlacementData[] {
  const { year, season } = seasonContaining(date);
  const planning = Planning.from(component.plannings[String(year)], seasonsOfYear(year));
  return [...planning.carriedPlacementsIn(season), ...planning.placementsIn(season)];
}
```

Run: `node --test src/domain/planning/CurrentPlacements.test.ts` — Expected: PASS.

- [ ] **Step 8: Planning store (test first)**

Replace `src/stores/planningStore.test.ts` with:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { usePlanningStore } from './planningStore.ts';

const shares = [{ plantId: 'sla', count: 3, actualShare: 0.3, targetShare: 0.5 }];

describe('planningStore', () => {
  test('keeps the last shares per component, year and season', () => {
    const store = usePlanningStore.getState();
    store.setLastShares({ componentId: 'c1', year: 2026, season: 'spring' }, shares);
    assert.deepEqual(usePlanningStore.getState().sharesOf({ componentId: 'c1', year: 2026, season: 'spring' }), shares);
    assert.equal(usePlanningStore.getState().sharesOf({ componentId: 'c1', year: 2026, season: 'summer' }), undefined);
  });

  test('forgets a removed component', () => {
    usePlanningStore.getState().setLastShares({ componentId: 'c2', year: 2026, season: 'spring' }, shares);
    usePlanningStore.getState().forgetComponent('c2');
    assert.equal(usePlanningStore.getState().sharesOf({ componentId: 'c2', year: 2026, season: 'spring' }), undefined);
  });
});
```

Replace `src/stores/planningStore.ts` with (keep relative `.ts` imports so the test runs under node):

```ts
import { create } from 'zustand';
import type { Season } from '../types/planning.types.ts';
import type { PlantShare } from '../domain/planning/SeasonPlacement.ts';

/** One season of one component's planning */
export interface SeasonKey {
  readonly componentId: string;
  readonly year: number;
  readonly season: Season;
}

interface PlanningState {
  /** The shares of the last optimization per season; not persisted */
  lastShares: Readonly<Record<string, readonly PlantShare[]>>;
  setLastShares: (key: SeasonKey, shares: readonly PlantShare[]) => void;
  sharesOf: (key: SeasonKey) => readonly PlantShare[] | undefined;
  forgetComponent: (componentId: string) => void;
}

const keyOf = ({ componentId, year, season }: SeasonKey): string => `${componentId}|${year}|${season}`;

/**
 * What the last optimization of each season gave, for the result rows on the
 * Planning screen. Lost when the app restarts.
 */
export const usePlanningStore = create<PlanningState>()((set, get) => ({
  lastShares: {},
  setLastShares: (key, shares) => set((state) => ({ lastShares: { ...state.lastShares, [keyOf(key)]: shares } })),
  sharesOf: (key) => get().lastShares[keyOf(key)],
  forgetComponent: (componentId) =>
    set((state) => ({
      lastShares: Object.fromEntries(Object.entries(state.lastShares).filter(([key]) => !key.startsWith(`${componentId}|`))),
    })),
}));
```

Run: `node --test src/stores/planningStore.test.ts` — Expected: PASS.

- [ ] **Step 9: Planning context helpers**

Create `src/stores/planningContext.ts`:

```ts
import { useMemo } from 'react';
import { Planning, frostDayOf, placementsGrowingOn, seasonsLookup } from '@/domain/planning';
import type { SeasonsOf } from '@/domain/planning';
import type { ComponentData, PlacedPlantData } from '@/types';
import { useEnvironmentStore } from './environmentStore';
import { usePlantStore } from './plantStore';

/** The seasons of every plant in a planning year, from the catalog and the garden's last frost (outside React) */
export function seasonsOfYear(year: number): SeasonsOf {
  return seasonsLookup(year, frostDayOf(useEnvironmentStore.getState().lastSpringFrost), (plantId) =>
    usePlantStore.getState().getPlantById(plantId),
  );
}

/** Same as seasonsOfYear, re-computed when the frost date or the catalog changes */
export function useSeasonsOfYear(year: number): SeasonsOf {
  const lastSpringFrost = useEnvironmentStore((state) => state.lastSpringFrost);
  const getPlantById = usePlantStore((state) => state.getPlantById);
  return useMemo(() => seasonsLookup(year, frostDayOf(lastSpringFrost), getPlantById), [year, lastSpringFrost, getPlantById]);
}

/** The component's planning of a year; null without a component */
export function usePlanning(component: ComponentData | undefined, year: number): Planning | null {
  const seasonsOf = useSeasonsOfYear(year);
  const data = component?.plannings[String(year)];
  return useMemo(() => (component ? Planning.from(data, seasonsOf) : null), [component, data, seasonsOf]);
}

/** What grows today in each component, by component id */
export function useCurrentPlacementsById(components: readonly ComponentData[]): ReadonlyMap<string, readonly PlacedPlantData[]> {
  const lastSpringFrost = useEnvironmentStore((state) => state.lastSpringFrost);
  const getPlantById = usePlantStore((state) => state.getPlantById);
  return useMemo(() => {
    const today = new Date();
    const seasonsOf = (year: number): SeasonsOf => seasonsLookup(year, frostDayOf(lastSpringFrost), getPlantById);
    return new Map(components.map((component) => [component.id, placementsGrowingOn(component, today, seasonsOf)]));
  }, [components, lastSpringFrost, getPlantById]);
}
```

- [ ] **Step 10: Component store planning actions**

In `src/stores/componentStore.ts`:

1. Replace `import * as Planning from '@/domain/planning';` and the `planningStore`, `environmentStore` and `PlantCatalogLookup`/`catalogLookup` lines with:

```ts
import { Planning, optimizeSeason as optimizeSeasonOf, plantingAreasOf } from '@/domain/planning';
import type { PlantShare, Season } from '@/domain/planning';
import { useEnvironmentStore } from './environmentStore';
import { usePlanningStore } from './planningStore';
import { seasonsOfYear } from './planningContext';
```

and change the migrations import to `import { migrateComponentState, mergePersistedComponentState, COMPONENT_STORE_VERSION } from './migrations/componentStoreMigrations';`.

2. In `ComponentState`, delete `togglePlantLock`, `lockAllPlants`, `unlockAllPlants`, `updatePatchDimensions` and the whole `// Actions - Planning` block, and add:

```ts
  // Actions - Planning (per component, year and season)
  addPlantsToPlanning: (componentId: string, year: number, plantIds: readonly string[]) => void;
  removePlantFromPlanning: (componentId: string, year: number, plantId: string) => void;
  setRatio: (componentId: string, year: number, season: Season, plantId: string, ratio: number) => void;
  /** Places the plants starting in the season by ratio; null when the component is gone */
  optimizeSeason: (componentId: string, year: number, season: Season) => readonly PlantShare[] | null;
  movePlacement: (componentId: string, year: number, season: Season, placementId: string, xCm: number, yCm: number) => void;
  removePlacement: (componentId: string, year: number, season: Season, placementId: string) => void;
  togglePlacementLock: (componentId: string, year: number, season: Season, placementId: string) => void;
  setAllPlacementsLocked: (componentId: string, year: number, season: Season, locked: boolean) => void;
  resizePatch: (
    componentId: string,
    year: number,
    season: Season,
    placementId: string,
    widthCm: number,
    heightCm: number,
    rotationDeg: number,
  ) => void;
  /** After a new frost date: moves ratios to the plants' new start seasons */
  reconcilePlannings: () => void;
```

3. Replace the `planningInputFor` and `withOutcome` helpers with:

```ts
function planningOf(component: ComponentData, year: number): Planning {
  return Planning.from(component.plannings[String(year)], seasonsOfYear(year));
}

/** Applies a change to one component's planning of a year; unchanged plannings keep the component as it is */
function withPlanning(
  components: ComponentData[],
  componentId: string,
  year: number,
  change: (planning: Planning) => Planning,
): ComponentData[] {
  return components.map((comp) => {
    if (comp.id !== componentId) return comp;
    const current = planningOf(comp, year);
    const next = change(current);
    return next === current ? comp : { ...comp, plannings: { ...comp.plannings, [String(year)]: next.toData() } };
  });
}
```

4. Delete the action implementations `togglePlantLock`, `lockAllPlants`, `unlockAllPlants`, `updatePatchDimensions`, `addPlantsToPlan`, `removePlantToPlan`, `rearrangePlanting`, `startPlantingOver` and add, before `getComponentById`:

```ts
      addPlantsToPlanning: (componentId, year, plantIds) => {
        set((state) => ({ components: withPlanning(state.components, componentId, year, (p) => p.addPlants(plantIds)) }));
      },

      removePlantFromPlanning: (componentId, year, plantId) => {
        set((state) => ({ components: withPlanning(state.components, componentId, year, (p) => p.removePlant(plantId)) }));
      },

      setRatio: (componentId, year, season, plantId, ratio) => {
        set((state) => ({ components: withPlanning(state.components, componentId, year, (p) => p.setRatio(season, plantId, ratio)) }));
      },

      optimizeSeason: (componentId, year, season) => {
        const component = get().getComponentById(componentId);
        if (!component) return null;
        const outcome = optimizeSeasonOf({
          planning: planningOf(component, year),
          season,
          areas: plantingAreasOf(component),
          hasLayers: isTower(component),
          plantOf: (plantId) => usePlantStore.getState().getPlantById(plantId),
          newId: generateId,
        });
        set((state) => ({ components: withPlanning(state.components, componentId, year, () => outcome.planning) }));
        usePlanningStore.getState().setLastShares({ componentId, year, season }, outcome.shares);
        return outcome.shares;
      },

      movePlacement: (componentId, year, season, placementId, xCm, yCm) => {
        set((state) => ({
          components: withPlanning(state.components, componentId, year, (p) => p.movePlacement(season, placementId, xCm, yCm)),
        }));
      },

      removePlacement: (componentId, year, season, placementId) => {
        set((state) => ({
          components: withPlanning(state.components, componentId, year, (p) => p.removePlacement(season, placementId)),
        }));
      },

      togglePlacementLock: (componentId, year, season, placementId) => {
        set((state) => ({
          components: withPlanning(state.components, componentId, year, (p) => p.toggleLock(season, placementId)),
        }));
      },

      setAllPlacementsLocked: (componentId, year, season, locked) => {
        set((state) => ({
          components: withPlanning(state.components, componentId, year, (p) => p.setAllLocked(season, locked)),
        }));
      },

      resizePatch: (componentId, year, season, placementId, widthCm, heightCm, rotationDeg) => {
        set((state) => ({
          components: withPlanning(state.components, componentId, year, (p) =>
            p.resizePatch(season, placementId, widthCm, heightCm, rotationDeg),
          ),
        }));
      },

      reconcilePlannings: () => {
        set((state) => ({
          components: state.components.map((comp) => {
            const years = Object.keys(comp.plannings);
            const reconciled = years.map((year) => [year, planningOf(comp, Number(year)).reconciled().toData()] as const);
            const changed = reconciled.some(([year, data]) => data !== comp.plannings[year]);
            return changed ? { ...comp, plannings: Object.fromEntries(reconciled) } : comp;
          }),
        }));
      },
```

5. In the `persist` options: `migrate: (persistedState, version) => migrateComponentState(persistedState, version) as unknown as ComponentState,` and `merge: (persistedState, currentState) => mergePersistedComponentState(persistedState, currentState),`.

6. In `useComponentActions`, replace the removed action names with the new ones (`addPlantsToPlanning`, `removePlantFromPlanning`, `setRatio`, `optimizeSeason`, `movePlacement`, `removePlacement`, `togglePlacementLock`, `setAllPlacementsLocked`, `resizePatch`).

7. At the end of the file, add the frost-date subscription (Review Focus 2: only for a non-null new date):

```ts
// A new last-frost date can move plants to other seasons. A missing date
// gives every plant no seasons, so it never triggers a reconcile.
useEnvironmentStore.subscribe((state, previous) => {
  if (state.lastSpringFrost !== null && state.lastSpringFrost !== previous.lastSpringFrost) {
    useComponentStore.getState().reconcilePlannings();
  }
});
```

8. Add to `src/domain/planning/index.ts` (and remove the `frostDayFromIso` alias from Task 5, exporting `frostDayOf` from `./PlantCalendar` instead):

```ts
export { placementsGrowingOn } from './CurrentPlacements';
```

- [ ] **Step 11: Delete the week planning and AI optimize code**

```bash
git rm src/domain/planning/AutoPlacement.ts src/domain/planning/AutoPlacement.test.ts \
  src/domain/planning/ComponentPlanning.ts src/domain/planning/ComponentPlanning.test.ts \
  src/domain/planning/GrowingPeriod.ts src/domain/planning/GrowingPeriod.test.ts \
  src/domain/planning/GrowingPeriodOptions.ts src/domain/planning/GrowingPeriodOptions.test.ts \
  src/domain/planning/PlanningQueries.ts src/domain/planning/PlanningQueries.test.ts \
  src/domain/planning/PlantingWeek.ts src/domain/planning/PlantingWeek.test.ts \
  src/domain/planning/TimeZone.ts src/domain/planning/TimeZone.test.ts \
  src/screens/ComponentDetailScreen/usePlanningTimeline.ts src/screens/ComponentDetailScreen/usePlanningActions.ts \
  src/screens/ComponentDetailScreen/planningViewModel.ts src/screens/ComponentDetailScreen/planningViewModel.test.ts \
  src/screens/ComponentDetailScreen/PlacedPlantItem.tsx \
  src/hooks/ai/useOptimizeComponent.ts src/services/ai/optimizeComponentService.ts \
  src/stores/ai/aiOptimizeComponentStore.ts \
  src/components/ai/OptimizationAlternativesModal.tsx src/components/ai/OptimizationMiniCanvas.tsx \
  src/components/ai/ScoreChips.tsx src/components/ai/AlternativePageDots.tsx \
  src/domain/ai/buildComponentOptimizeRequest.ts \
  src/schemas/ai/optimizeComponentRequestSchema.ts src/schemas/ai/optimizeComponentResponseSchema.ts
```

Then rewrite `src/domain/planning/index.ts` so it only exports what still exists: `Season`, `PlantCalendar` (with `frostDayOf`), `PlantFootprint` (`PlantFootprint`, `boundsOverlap`, `conflictingPlantIds`, `footprintOf`, `footprintsConflict`, `minimumPatchSideCm`, `plantDistanceCm` and its types), `PlantingArea`, `PlantRelations`, `ComponentArea`, `Planning`, `SeasonPlacement`, `SeasonOptimization`, `CurrentPlacements`. Update its header comment to "Season planning: seasons, plant calendar, plannings, footprints and placement".

Remove dangling exports from any barrel/index that referenced deleted files (check `src/services/ai/index.ts`, `src/stores/index.ts`, `src/schemas/ai/index.ts`, `src/components/ai/index.ts` if present). Keep `aiHttpClient`, `aiRetry`, `AiError`, `aiConfig` and `buildGardenSnapshot`: the AI chat uses them.

Check: `git grep -n "useOptimizeComponent\|aiOptimizeComponentStore\|optimizeComponent\|GrowingPeriod\|PlantingWeek\|TimeZone\|plantsToPlan\|rearrangePlanting\|startPlantingOver" -- src` only lists `ComponentDetailScreen.tsx`, `PlantSelectionScreen.tsx` and the week-timeline components deleted in Task 8.

- [ ] **Step 12: Read-only consumers use today's placements**

`src/components/molecules/ComponentListRow/ComponentListRow.tsx`: add a prop `plantCount: number;` to `ComponentListRowProps` (doc: `/** Plants growing in the component today */`), destructure it, and replace `component.plants.length` with `plantCount`.

`src/components/organisms/ComponentSlide/ComponentSlide.tsx`: add a prop `plants: readonly PlacedPlantData[];` to `ComponentSlideProps` (doc: `/** Plants growing in the component today */`), destructure it, and replace every `component.plants` with `plants` (the `plantsByLayer` memo and its dependency list, and the plant count).

`src/screens/HomeScreen/HomeScreen.tsx`:

```ts
import { useCurrentPlacementsById } from '@/stores/planningContext';
...
  const placementsById = useCurrentPlacementsById(components);
...
      <ComponentSlide
        component={item}
        plants={placementsById.get(item.id) ?? []}
        ...
      />
    ),
    [placementsById, getPlantById, windowWidth, handleOpen, handleEdit, handleDelete],
...
      <ComponentListRow
        component={item}
        plantCount={placementsById.get(item.id)?.length ?? 0}
        isActive={index === clampedIndex}
        onPress={handleRowPress}
      />
    ),
    [placementsById, clampedIndex, handleRowPress],
```

`src/components/organisms/LayerOverviewModal/LayerOverviewModal.tsx`: add a prop `plants: readonly PlacedPlantData[];` (doc: `/** The plants of the season shown on the detail screen */`) and replace `const plants = component.plants || [];` with nothing (use the prop).

`src/domain/ai/buildGardenSnapshot.ts`: add a parameter after `components`:

```ts
  /** The plants growing in each component today */
  placementsOf: (component: ComponentData) => readonly PlacedPlantData[],
```

pass it to `mapComponent(component, placementsOf)` and use `plants: placementsOf(component).map(mapPlant),`.

`src/hooks/ai/useAiChat.ts`:

```ts
import { placementsGrowingOn } from '@/domain/planning';
import { seasonsOfYear } from '@/stores/planningContext';
...
      const today = new Date();
      const placementsOf = (component: ComponentData) => placementsGrowingOn(component, today, seasonsOfYear);
      const uniquePlantIds = new Set(
        componentsState.components.flatMap((c) => placementsOf(c).map((p) => p.plantId)),
      );
...
      const snapshot = buildGardenSnapshot(
        { ... },
        componentsState.components,
        placementsOf,
        plantSpecs,
      );
```

(Import `ComponentData` from `@/types` if not already imported. Also move `plantSpecs` to the 4th position in `buildGardenSnapshot`'s signature, keeping its default.)

- [ ] **Step 13: Verify**

Run: `npm run test:unit`
Expected: PASS (all suites; no test imports a deleted module).

Run: `npm run typecheck`
Expected: errors only in `src/screens/ComponentDetailScreen/ComponentDetailScreen.tsx`, `src/screens/PlantSelectionScreen/PlantSelectionScreen.tsx`, and in the week-timeline components still on disk (`WeekTimeline`, `TimeZoneSegment`, `ToPlanAccordion`, `ToPlanRow`, `WeekSlot`) if they import deleted types. Any other error must be fixed in this task.

- [ ] **Step 14: Commit**

```bash
git add -A src
git commit -m "feat(planning)!: store plannings per year and season

Components keep their plannings per year; the week-based planning and the
remote AI optimizer are removed. Existing plantings are not converted.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Planning screen and plant selection

**Files:**
- Create: `src/screens/PlanningScreen/planningScreenViewModel.ts`, `src/screens/PlanningScreen/planningScreenViewModel.test.ts`
- Create: `src/screens/PlanningScreen/PlanningScreen.tsx`, `src/screens/PlanningScreen/index.ts`
- Create: `src/components/atoms/SeasonStatusDot/{SeasonStatusDot.tsx,index.ts}`, `src/components/molecules/RatioStepper/{RatioStepper.tsx,index.ts}`, `src/components/organisms/SeasonPlanSection/{SeasonPlanSection.tsx,index.ts}`
- Create: `src/styles/planning/season.css`
- Modify: `src/screens/PlantSelectionScreen/PlantSelectionScreen.tsx`
- Modify: `src/navigation/navigationTypes.ts`, `src/navigation/RootNavigator.tsx`, `src/screens/index.ts`, component barrels (`atoms/index.ts`, `molecules/index.ts`, `organisms/index.ts`)
- Modify: `src/i18n/nl.json`

**Interfaces:**
- Consumes: `Planning`, `seasonMonths`, `SEASONS`, `PlantShare` (domain); `usePlanning`, `usePlanningStore`, store actions `addPlantsToPlanning`, `removePlantFromPlanning`, `setRatio` (Task 6)
- Produces:
  - routes: `Planning: { componentId: string; year: number }`, `PlantSelection: { componentId: string; year: number }`
  - `Translate = (key: string, options?: Record<string, unknown>) => string`
  - `buildPlantList(planning, nameOf, t): PlantListItemView[]`, `buildSeasonSections(planning, nameOf, sharesOf, t): SeasonSectionView[]`, `seasonLabel(season, t)`, `seasonMonthsLabel(season, t)` (all in `planningScreenViewModel.ts`; Task 8 reuses `seasonLabel`, `seasonMonthsLabel`)
  - `SeasonStatusDot({ status, testID? })`, `RatioStepper({ value, onChange, decreaseLabel, increaseLabel, valueLabel, testID })`, `SeasonPlanSection({ view, expanded, onToggle, onRatioChange, testID })`

- [ ] **Step 1: Add the Dutch strings**

In `src/i18n/nl.json` add these top-level objects (before `"accessibility"`), keeping the file's indentation and line endings:

```json
  "season": {
    "spring": "Lente",
    "summer": "Zomer",
    "autumn": "Herfst",
    "winter": "Winter",
    "months": "{{first}}–{{last}}",
    "status": {
      "notPlanned": "Niet gepland",
      "planned": "Gepland",
      "outdated": "Verouderd"
    }
  },
  "seasonPlanning": {
    "title": "Planning",
    "subtitle": "{{name}} · {{year}}",
    "plants": "Planten",
    "addPlant": "Plant toevoegen",
    "noCalendar": "geen teeltkalender",
    "empty": "Nog geen planten. Tik op Plant toevoegen.",
    "emptySeason": "Geen planten in dit seizoen",
    "carried": "doorlopend uit {{season}}",
    "target": "{{percent}}%",
    "result_one": "{{count}} plant · {{actual}}% (doel {{target}}%)",
    "result_other": "{{count}} planten · {{actual}}% (doel {{target}}%)",
    "doesNotFit": "Past niet",
    "ratioDecrease": "Verhouding van {{name}} verlagen",
    "ratioIncrease": "Verhouding van {{name}} verhogen",
    "ratioValue": "Verhouding van {{name}}: {{ratio}}",
    "removePlant": "{{name}} verwijderen",
    "removeTitle": "{{name}} verwijderen?",
    "removeMessage": "{{name}} en al zijn plaatsingen verdwijnen uit de planning van {{year}}.",
    "sectionA11y": "{{season}}, {{months}}, {{status}}"
  },
```

In the existing `"plantSelection"` object, replace `"addToComponent"` with:

```json
    "addSelected_one": "{{count}} plant toevoegen",
    "addSelected_other": "{{count}} planten toevoegen",
    "alreadyInPlanning": "Al in de planning"
```

- [ ] **Step 2: Write the failing view model tests**

Create `src/screens/PlanningScreen/planningScreenViewModel.test.ts`:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlantList, buildSeasonSections, seasonMonthsLabel } from './planningScreenViewModel.ts';
import { Planning } from '../../domain/planning/Planning.ts';
import type { Season } from '../../types/planning.types.ts';

/** Echoes the key and options, so tests read what the screen would ask for */
const t = (key: string, options?: Record<string, unknown>): string => (options ? `${key} ${JSON.stringify(options)}` : key);
const seasonsOf = (id: string): readonly Season[] =>
  ({ tomaat: ['spring', 'summer'], sla: ['spring'], knoflook: [] } as Record<string, readonly Season[]>)[id] ?? [];
const nameOf = (id: string): string => id.toUpperCase();
const planning = Planning.empty(seasonsOf).addPlants(['tomaat', 'sla', 'knoflook']).setRatio('spring', 'sla', 3);

describe('buildPlantList', () => {
  test('lists every plant with its season labels; a plant without calendar is flagged', () => {
    assert.deepEqual(buildPlantList(planning, nameOf, t), [
      { plantId: 'tomaat', name: 'TOMAAT', seasonLabels: ['season.spring', 'season.summer'], hasCalendar: true },
      { plantId: 'sla', name: 'SLA', seasonLabels: ['season.spring'], hasCalendar: true },
      { plantId: 'knoflook', name: 'KNOFLOOK', seasonLabels: [], hasCalendar: false },
    ]);
  });
});

describe('buildSeasonSections', () => {
  test('gives the starting plants with ratio and target percent, and the carried plants', () => {
    const [spring, summer, autumn] = buildSeasonSections(planning, nameOf, () => undefined, t);
    assert.deepEqual(
      spring.ratioRows.map((r) => [r.plantId, r.ratio, r.targetLabel, r.resultLabel]),
      [['tomaat', 1, 'seasonPlanning.target {"percent":25}', null], ['sla', 3, 'seasonPlanning.target {"percent":75}', null]],
    );
    assert.deepEqual(summer.carriedRows, [{ plantId: 'tomaat', name: 'TOMAAT', label: 'seasonPlanning.carried {"season":"season.spring"}' }]);
    assert.equal(autumn.isEmpty, true);
    assert.equal(spring.status, 'notPlanned');
  });

  test('given the last optimization, each row shows its count and shares; zero copies does not fit', () => {
    const shares = [
      { plantId: 'sla', count: 12, actualShare: 0.614, targetShare: 0.75 },
      { plantId: 'tomaat', count: 0, actualShare: 0, targetShare: 0.25 },
    ];
    const [spring] = buildSeasonSections(planning, nameOf, (season) => (season === 'spring' ? shares : undefined), t);
    assert.equal(spring.ratioRows[1].resultLabel, 'seasonPlanning.result {"count":12,"actual":61,"target":75}');
    assert.equal(spring.ratioRows[0].resultLabel, 'seasonPlanning.doesNotFit');
  });
});

describe('seasonMonthsLabel', () => {
  test('uses the short month names', () => {
    assert.equal(
      seasonMonthsLabel('winter', t),
      'season.months {"first":"planning.month.short.12","last":"planning.month.short.2"}',
    );
  });
});
```

Run: `node --test src/screens/PlanningScreen/planningScreenViewModel.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement the view model**

Create `src/screens/PlanningScreen/planningScreenViewModel.ts`:

```ts
import type { Planning } from '../../domain/planning/Planning.ts';
import { SEASONS, seasonMonths } from '../../domain/planning/Season.ts';
import type { PlantShare } from '../../domain/planning/SeasonPlacement.ts';
import type { Season, SeasonStatus } from '../../types/planning.types.ts';

/** i18next's t, narrowed to what the view models use */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface PlantListItemView {
  readonly plantId: string;
  readonly name: string;
  readonly seasonLabels: readonly string[];
  readonly hasCalendar: boolean;
}

export interface RatioRowView {
  readonly plantId: string;
  readonly name: string;
  readonly ratio: number;
  /** "25%": the share the ratio asks for */
  readonly targetLabel: string;
  /** What the last optimization gave; null when the season was not optimized in this session */
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

export function seasonLabel(season: Season, t: Translate): string {
  return t(`season.${season}`);
}

/** "mrt–mei" */
export function seasonMonthsLabel(season: Season, t: Translate): string {
  const { first, last } = seasonMonths(season);
  return t('season.months', { first: t(`planning.month.short.${first}`), last: t(`planning.month.short.${last}`) });
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
    const shares = sharesOf(season);

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

    const status = planning.statusOf(season);
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
```

Run: `node --test src/screens/PlanningScreen/planningScreenViewModel.test.ts` — Expected: PASS.

- [ ] **Step 4: BEM contract**

Create `src/styles/planning/season.css` (move the `.year-bar*` rules out of `timeline.css` into this file unchanged; `timeline.css` and `to-plan.css` are deleted in Task 8):

```css
/*
 * Season planning: season tabs, status dots, ratio steppers and season sections.
 *
 * Like src/styles/ai/chat.css, these classes document the visual contract;
 * the components apply the same utility classes via className.
 */

/* Status dot: grey = not planned, green = planned, orange = outdated */
.season-status-dot {
  @apply w-2 h-2 rounded-full;
}
.season-status-dot--not-planned {
  @apply bg-gray-500;
}
.season-status-dot--planned {
  @apply bg-green-500;
}
.season-status-dot--outdated {
  @apply bg-orange-400;
}

/* Tabs: Lente · Zomer · Herfst · Winter, each with its months */
.season-tabs {
  @apply flex-row border-b border-gray-800;
}
.season-tabs__tab {
  @apply flex-1 items-center py-2;
}
.season-tabs__tab--selected {
  @apply border-b-2 border-green-500;
}
.season-tabs__label {
  @apply text-label-large text-on-surface;
}
.season-tabs__months {
  @apply text-xs text-gray-400;
}

/* − [2] + */
.ratio-stepper {
  @apply flex-row items-center bg-gray-800 rounded-xl;
}
.ratio-stepper__button {
  @apply w-12 h-12 items-center justify-center;
}
.ratio-stepper__value {
  @apply text-white font-bold px-2 min-w-[24px] text-center;
}

/* Accordion per season on the Planning screen */
.season-section {
  @apply mb-2 rounded-xl bg-gray-900;
}
.season-section__header {
  @apply flex-row items-center px-4 h-14;
}
.season-section__row {
  @apply flex-row items-center px-4 py-2 border-t border-gray-800;
}
.season-section__result--does-not-fit {
  @apply text-error;
}

/* Banner above the canvas when a season is outdated */
.outdated-banner {
  @apply flex-row items-center px-4 py-2 bg-orange-900/40 border-b border-orange-700;
}
```

- [ ] **Step 5: Atom, molecule and organism**

Create `src/components/atoms/SeasonStatusDot/SeasonStatusDot.tsx`:

```tsx
import React from 'react';
import { View } from 'react-native';
import type { SeasonStatus } from '@/types';

const COLOR: Record<SeasonStatus, string> = {
  notPlanned: 'bg-gray-500',
  planned: 'bg-green-500',
  outdated: 'bg-orange-400',
};

/**
 * Status of a season: grey = not planned, green = planned, orange = outdated.
 * BEM contract (src/styles/planning/season.css): .season-status-dot, --not-planned, --planned, --outdated
 */
export function SeasonStatusDot({ status, testID }: { status: SeasonStatus; testID?: string }): React.JSX.Element {
  return <View className={`w-2 h-2 rounded-full ${COLOR[status]}`} testID={testID} />;
}
```

`src/components/atoms/SeasonStatusDot/index.ts`: `export { SeasonStatusDot } from './SeasonStatusDot';` — and add the same line to `src/components/atoms/index.ts`.

Create `src/components/molecules/RatioStepper/RatioStepper.tsx`:

```tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface RatioStepperProps {
  value: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  /** Read by screen readers for the value, e.g. "Verhouding van Sla: 3" */
  valueLabel: string;
  testID: string;
}

/**
 * − [n] + for a ratio of at least 1. Buttons are 48 dp touch targets.
 * BEM contract (src/styles/planning/season.css): .ratio-stepper, __button, __value
 */
export function RatioStepper({ value, onChange, decreaseLabel, increaseLabel, valueLabel, testID }: RatioStepperProps): React.JSX.Element {
  const canDecrease = value > 1;
  return (
    <View className="flex-row items-center bg-gray-800 rounded-xl" testID={testID}>
      <Pressable
        onPress={() => onChange(value - 1)}
        disabled={!canDecrease}
        className="w-12 h-12 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel={decreaseLabel}
        accessibilityState={{ disabled: !canDecrease }}
        testID={`${testID}-decrease`}
      >
        <Text className={`text-xl ${canDecrease ? 'text-white' : 'text-gray-600'}`}>−</Text>
      </Pressable>
      <Text className="text-white font-bold px-2 min-w-[24px] text-center" accessibilityLabel={valueLabel} testID={`${testID}-value`}>
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(value + 1)}
        className="w-12 h-12 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel={increaseLabel}
        testID={`${testID}-increase`}
      >
        <Text className="text-xl text-white">+</Text>
      </Pressable>
    </View>
  );
}
```

`index.ts` + barrel line `export { RatioStepper } from './RatioStepper';` in `src/components/molecules/index.ts`.

Create `src/components/organisms/SeasonPlanSection/SeasonPlanSection.tsx`:

```tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SeasonStatusDot } from '@/components/atoms/SeasonStatusDot';
import { RatioStepper } from '@/components/molecules/RatioStepper';
import type { SeasonSectionView } from '@/screens/PlanningScreen/planningScreenViewModel';

interface SeasonPlanSectionProps {
  view: SeasonSectionView;
  expanded: boolean;
  onToggle: () => void;
  onRatioChange: (plantId: string, ratio: number) => void;
}

/**
 * Accordion for one season: the plants starting in it with their ratio,
 * and the plants carried into it (read-only).
 * BEM contract (src/styles/planning/season.css): .season-section, __header, __row, __result--does-not-fit
 */
export function SeasonPlanSection({ view, expanded, onToggle, onRatioChange }: SeasonPlanSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View className="mb-2 rounded-xl bg-gray-900" testID={`season-section-${view.season}`}>
      <Pressable
        onPress={onToggle}
        className="flex-row items-center px-4 h-14"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={t('seasonPlanning.sectionA11y', { season: view.title, months: view.monthsLabel, status: view.statusLabel })}
        testID={`season-section-${view.season}-header`}
      >
        <SeasonStatusDot status={view.status} />
        <Text className="text-white font-medium ml-2">{view.title}</Text>
        <Text className="text-gray-400 text-xs ml-2 flex-1">{view.monthsLabel}</Text>
        <Text className="text-gray-400 text-xs mr-2">{view.statusLabel}</Text>
        <Text className="text-gray-400">{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded && view.isEmpty && (
        <View className="flex-row items-center px-4 py-2 border-t border-gray-800">
          <Text className="text-gray-400">{t('seasonPlanning.emptySeason')}</Text>
        </View>
      )}

      {expanded &&
        view.ratioRows.map((row) => (
          <View key={row.plantId} className="flex-row items-center px-4 py-2 border-t border-gray-800" testID={`ratio-row-${view.season}-${row.plantId}`}>
            <View className="flex-1">
              <Text className="text-white">{row.name}</Text>
              {row.resultLabel !== null && (
                <Text className={`text-xs ${row.fits ? 'text-gray-400' : 'text-error'}`}>{row.resultLabel}</Text>
              )}
            </View>
            <Text className="text-gray-400 text-xs mr-2">{row.targetLabel}</Text>
            <RatioStepper
              value={row.ratio}
              onChange={(ratio) => onRatioChange(row.plantId, ratio)}
              decreaseLabel={t('seasonPlanning.ratioDecrease', { name: row.name })}
              increaseLabel={t('seasonPlanning.ratioIncrease', { name: row.name })}
              valueLabel={t('seasonPlanning.ratioValue', { name: row.name, ratio: row.ratio })}
              testID={`ratio-${view.season}-${row.plantId}`}
            />
          </View>
        ))}

      {expanded &&
        view.carriedRows.map((row) => (
          <View key={row.plantId} className="flex-row items-center px-4 py-2 border-t border-gray-800" testID={`carried-row-${view.season}-${row.plantId}`}>
            <Text className="text-gray-400 flex-1">{row.name}</Text>
            <Text className="text-gray-500 text-xs">{row.label}</Text>
          </View>
        ))}
    </View>
  );
}
```

`index.ts` + barrel line `export { SeasonPlanSection } from './SeasonPlanSection';` in `src/components/organisms/index.ts`.

- [ ] **Step 6: Navigation**

`src/navigation/navigationTypes.ts`: change `PlantSelection` to `PlantSelection: { componentId: string; year: number };`, add `Planning: { componentId: string; year: number };` and `export type PlanningScreenProps = NativeStackScreenProps<RootStackParamList, 'Planning'>;`.

`src/screens/index.ts`: add `export { PlanningScreen } from './PlanningScreen';`.

`src/navigation/RootNavigator.tsx`: import `PlanningScreen` from `@screens/PlanningScreen` and register it after `ComponentDetail`:

```tsx
      <Stack.Screen
        name="Planning"
        component={PlanningScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
```

- [ ] **Step 7: Planning screen**

Create `src/screens/PlanningScreen/index.ts`: `export { PlanningScreen } from './PlanningScreen';`

Create `src/screens/PlanningScreen/PlanningScreen.tsx`:

```tsx
/**
 * PlanningScreen
 * The plants of a component's planning for one year and their ratio per season
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PlanningScreenProps } from '@/navigation/navigationTypes';
import { useComponent, useComponentStore } from '@/stores';
import { useEnvironmentStore } from '@/stores/environmentStore';
import { usePlantStore } from '@/stores/plantStore';
import { usePlanningStore } from '@/stores/planningStore';
import { usePlanning } from '@/stores/planningContext';
import { SeasonPlanSection } from '@/components/organisms/SeasonPlanSection';
import type { Season } from '@/types';
import { buildPlantList, buildSeasonSections } from './planningScreenViewModel';
import type { Translate } from './planningScreenViewModel';

export function PlanningScreen({ navigation, route }: PlanningScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const translate = useCallback<Translate>((key, options) => t(key, options), [t]);
  const { componentId, year } = route.params;
  const component = useComponent(componentId);
  const planning = usePlanning(component, year);
  const lastSpringFrost = useEnvironmentStore((state) => state.lastSpringFrost);
  const getPlantById = usePlantStore((state) => state.getPlantById);
  const lastShares = usePlanningStore((state) => state.lastShares);
  const sharesOf = usePlanningStore((state) => state.sharesOf);
  const removePlantFromPlanning = useComponentStore((state) => state.removePlantFromPlanning);
  const setRatio = useComponentStore((state) => state.setRatio);
  const [expanded, setExpanded] = useState<ReadonlySet<Season>>(new Set(['spring', 'summer', 'autumn', 'winter']));

  // Seasons come from the frost date; without one there is nothing to plan
  useEffect(() => {
    if (lastSpringFrost === null) {
      navigation.replace('EnvironmentSetup');
    }
  }, [lastSpringFrost, navigation]);

  const nameOf = useCallback(
    (plantId: string) => getPlantById(plantId)?.nameNl ?? t('componentDetail.unknownPlant'),
    [getPlantById, t],
  );
  const plantList = useMemo(() => (planning ? buildPlantList(planning, nameOf, translate) : []), [planning, nameOf, translate]);
  const sections = useMemo(
    () => (planning ? buildSeasonSections(planning, nameOf, (season) => sharesOf({ componentId, year, season }), translate) : []),
    // lastShares makes the rows update after an optimization
    [planning, nameOf, sharesOf, componentId, year, translate, lastShares],
  );

  const handleRemove = useCallback(
    (plantId: string) => {
      const name = nameOf(plantId);
      Alert.alert(t('seasonPlanning.removeTitle', { name }), t('seasonPlanning.removeMessage', { name, year }), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => removePlantFromPlanning(componentId, year, plantId) },
      ]);
    },
    [nameOf, t, year, removePlantFromPlanning, componentId],
  );

  const toggleSection = useCallback((season: Season) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(season)) next.delete(season);
      else next.add(season);
      return next;
    });
  }, []);

  if (!component || !planning) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-on-surface">{t('componentDetail.notFound')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" testID="planning-screen">
      <View className="flex-row items-center px-4 h-16 border-b border-gray-800">
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-10 h-10 items-center justify-center rounded-full mr-2"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text className="text-white text-2xl">←</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold">{t('seasonPlanning.title')}</Text>
          <Text className="text-gray-400 text-sm">{t('seasonPlanning.subtitle', { name: component.name, year })}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <View className="flex-row items-center mb-2">
          <Text className="text-white font-semibold flex-1">{t('seasonPlanning.plants')}</Text>
          <Pressable
            onPress={() => navigation.navigate('PlantSelection', { componentId, year })}
            className="bg-green-600 px-4 h-10 rounded-full items-center justify-center"
            accessibilityRole="button"
            testID="planning-add-plant-button"
          >
            <Text className="text-white font-medium">+ {t('seasonPlanning.addPlant')}</Text>
          </Pressable>
        </View>

        {plantList.length === 0 && <Text className="text-gray-400 mb-4">{t('seasonPlanning.empty')}</Text>}
        {plantList.map((item) => (
          <View key={item.plantId} className="flex-row items-center py-2 border-b border-gray-800" testID={`planning-plant-${item.plantId}`}>
            <View className="flex-1">
              <Text className="text-white">{item.name}</Text>
              <Text className={`text-xs ${item.hasCalendar ? 'text-gray-400' : 'text-orange-400'}`}>
                {item.hasCalendar ? item.seasonLabels.join(' · ') : t('seasonPlanning.noCalendar')}
              </Text>
            </View>
            <Pressable
              onPress={() => handleRemove(item.plantId)}
              className="w-12 h-12 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={t('seasonPlanning.removePlant', { name: item.name })}
              testID={`planning-remove-${item.plantId}`}
            >
              <Text className="text-error text-lg">✕</Text>
            </Pressable>
          </View>
        ))}

        <View className="mt-4">
          {sections.map((view) => (
            <SeasonPlanSection
              key={view.season}
              view={view}
              expanded={expanded.has(view.season)}
              onToggle={() => toggleSection(view.season)}
              onRatioChange={(plantId, ratio) => setRatio(componentId, year, view.season, plantId, ratio)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 8: Plant selection becomes multi-select**

In `src/screens/PlantSelectionScreen/PlantSelectionScreen.tsx`:
- imports: drop `PlantingWeek`; keep `plantDistanceCm`; `import { usePlanning } from '@/stores/planningContext';`
- `CategorySection` and `PlantTile`: replace `selectedPlantId: string | null` with `selectedIds: ReadonlySet<string>` and `isSelected={selectedIds.has(plant.id)}`; on a selected tile render a `✓` in the top-right corner (`<Text className="absolute top-1 right-2 text-white">✓</Text>` inside the tile `Pressable`) and set `accessibilityState={{ selected: isSelected }}` on the tile.
- In the screen:

```tsx
  const { componentId, year } = route.params;
  const component = useComponent(componentId);
  const planning = usePlanning(component, year);
  const allPlants = useAllPlants();
  const addPlantsToPlanning = useComponentStore((state) => state.addPlantsToPlanning);

  // Plants already in the planning start selected and stay so
  const inPlanning = useMemo(() => new Set(planning?.plants ?? []), [planning]);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const selectedIds = useMemo(() => new Set([...inPlanning, ...picked]), [inPlanning, picked]);

  const handleSelectPlant = useCallback(
    (plant: PlantData) => {
      if (inPlanning.has(plant.id)) return;
      setPicked((current) => {
        const next = new Set(current);
        if (next.has(plant.id)) next.delete(plant.id);
        else next.add(plant.id);
        return next;
      });
    },
    [inPlanning],
  );

  const handleAddPlants = useCallback(() => {
    if (picked.size === 0) return;
    addPlantsToPlanning(componentId, year, [...picked]);
    navigation.goBack();
  }, [picked, addPlantsToPlanning, componentId, year, navigation]);
```

- delete `selectedPlant`, `quantity`, `handleQuantityChange` and the quantity selector; the footer shows when `picked.size > 0` and holds only the add button:

```tsx
      {picked.size > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4">
          <Pressable
            onPress={handleAddPlants}
            className="bg-green-600 rounded-xl py-4 items-center"
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            testID="add-plants-button"
          >
            <Text className="text-white font-semibold">{t('plantSelection.addSelected', { count: picked.size })}</Text>
          </Pressable>
        </View>
      )}
```

- the tile for a plant already in the planning shows `t('plantSelection.alreadyInPlanning')` instead of its spacing line.

- [ ] **Step 9: Verify**

Run: `npm run test:unit` — Expected: PASS.
Run: `npm run typecheck` — Expected: errors only in `ComponentDetailScreen.tsx` and the week-timeline components (Task 8).

- [ ] **Step 10: Commit**

```bash
git add -A src
git commit -m "feat(planning): planning screen with plants and ratios per season

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Component Detail screen per season

**Files:**
- Create: `src/screens/ComponentDetailScreen/seasonViewModel.ts`, `src/screens/ComponentDetailScreen/seasonViewModel.test.ts`
- Create: `src/screens/ComponentDetailScreen/useSeasonCanvas.ts`
- Create: `src/components/molecules/SeasonTabs/{SeasonTabs.tsx,index.ts}`
- Modify: `src/screens/ComponentDetailScreen/ComponentDetailScreen.tsx` (rewrite)
- Modify: `src/components/organisms/PlantPlacementCanvas/PlantPlacementCanvas.tsx` (carried plants)
- Modify: `src/components/molecules/YearBar/YearBar.tsx` (BEM comment points to `season.css`)
- Modify: `src/i18n/nl.json`
- Delete: `src/components/organisms/{WeekTimeline,ToPlanAccordion,PlanningActionBar}/`, `src/components/molecules/{TimeZoneSegment,ToPlanRow,ViewModeToggle}/`, `src/components/atoms/{WeekSlot,PlanningCaption}/`, `src/styles/planning/{timeline,to-plan}.css`, and their barrel lines

**Interfaces:**
- Consumes: `usePlanning`, store actions from Task 6; `seasonLabel`, `seasonMonthsLabel`, `Translate` (Task 7); `seasonContaining`, `SEASONS`, `conflictingPlantIds`, `footprintOf`, `plantingAreaOf`, `plantsOutsideArea` (domain)
- Produces:
  - `defaultSeasonFor(year, today: { year; season }): Season`, `planningYearRange(currentYear, plannedYears): { first; last }`, `buildSeasonTabs(planning, t): SeasonTabView[]`, `optimizeResultMessage(shares, nameOf, t): string`
  - `PlantPlacementCanvas` new optional props `carriedPlants?: readonly PlacedPlantData[]`, `carriedLabelOf?: (plant: PlacedPlantData) => string`

- [ ] **Step 1: Strings**

In `src/i18n/nl.json`, add to the `"componentDetail"` object:

```json
    "planning": "Planning",
    "optimize": "Optimaliseren",
    "reoptimize": "Opnieuw optimaliseren",
    "lockAll": "Alles vergrendelen",
    "unlockAll": "Alles ontgrendelen",
    "outdated": "Deze planning is verouderd door wijzigingen in een eerder seizoen",
    "carriedFrom": "uit {{season}}",
    "emptySeason": "Nog niets geplaatst in dit seizoen. Stel de planning in en tik op Optimaliseren.",
    "optimized_one": "{{count}} plant geplaatst",
    "optimized_other": "{{count}} planten geplaatst",
    "doesNotFit": "{{names}} past niet",
    "tabA11y_one": "{{season}}, {{months}}, {{status}}, {{count}} plant om te plaatsen, {{carried}} doorlopend",
    "tabA11y_other": "{{season}}, {{months}}, {{status}}, {{count}} planten om te plaatsen, {{carried}} doorlopend"
```

and delete the `"planning"` keys only the deleted components use (`week`, `zone`, `toPlan`, `reason`, `actions`, `startOver`, `result`, `viewMode`); keep `planning.year`, `planning.month`, `planning.conflict`, `planning.outOfBounds`, `planning.hint`. Change `planning.conflict.warning` to `"Overlap met een andere plant"`.

- [ ] **Step 2: Write the failing view model tests**

Create `src/screens/ComponentDetailScreen/seasonViewModel.test.ts`:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeasonTabs, defaultSeasonFor, optimizeResultMessage, planningYearRange } from './seasonViewModel.ts';
import { Planning } from '../../domain/planning/Planning.ts';
import type { Season } from '../../types/planning.types.ts';

const t = (key: string, options?: Record<string, unknown>): string => (options ? `${key} ${JSON.stringify(options)}` : key);
const seasonsOf = (id: string): readonly Season[] => (id === 'tomaat' ? ['spring', 'summer'] : ['spring']);

describe('defaultSeasonFor', () => {
  test('in the current planning year, today\'s season; in another year, spring', () => {
    assert.equal(defaultSeasonFor(2026, { year: 2026, season: 'autumn' }), 'autumn');
    assert.equal(defaultSeasonFor(2027, { year: 2026, season: 'autumn' }), 'spring');
  });
});

describe('planningYearRange', () => {
  test('spans one year around today and every planned year', () => {
    assert.deepEqual(planningYearRange(2026, []), { first: 2025, last: 2027 });
    assert.deepEqual(planningYearRange(2026, [2023, 2029]), { first: 2023, last: 2029 });
  });
});

describe('buildSeasonTabs', () => {
  test('gives each season its label, months, status and the number of plants to place', () => {
    const planning = Planning.empty(seasonsOf).addPlants(['tomaat', 'sla']);
    const [spring, summer] = buildSeasonTabs(planning, t);
    assert.deepEqual([spring.season, spring.label, spring.status, spring.startingCount], ['spring', 'season.spring', 'notPlanned', 2]);
    assert.deepEqual([summer.startingCount, summer.carriedCount], [0, 1]);
    assert.match(spring.a11yLabel, /^componentDetail\.tabA11y /);
  });
});

describe('optimizeResultMessage', () => {
  test('counts the placed plants and names the plants that did not fit', () => {
    const shares = [
      { plantId: 'sla', count: 12, actualShare: 0.6, targetShare: 0.5 },
      { plantId: 'tomaat', count: 0, actualShare: 0, targetShare: 0.5 },
    ];
    assert.equal(
      optimizeResultMessage(shares, (id) => id.toUpperCase(), t),
      'componentDetail.optimized {"count":12} · componentDetail.doesNotFit {"names":"TOMAAT"}',
    );
    assert.equal(optimizeResultMessage(shares.slice(0, 1), (id) => id, t), 'componentDetail.optimized {"count":12}');
  });
});
```

Run: `node --test src/screens/ComponentDetailScreen/seasonViewModel.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement the view model**

Create `src/screens/ComponentDetailScreen/seasonViewModel.ts`:

```ts
import type { Planning } from '../../domain/planning/Planning.ts';
import { SEASONS } from '../../domain/planning/Season.ts';
import type { PlantShare } from '../../domain/planning/SeasonPlacement.ts';
import type { Season, SeasonStatus } from '../../types/planning.types.ts';
import { seasonLabel, seasonMonthsLabel } from '../PlanningScreen/planningScreenViewModel.ts';
import type { Translate } from '../PlanningScreen/planningScreenViewModel.ts';

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
    const startingCount = planning.plantsStartingIn(season).length;
    const carriedCount = planning.plantsCarriedInto(season).length;
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
export function optimizeResultMessage(shares: readonly PlantShare[], nameOf: (plantId: string) => string, t: Translate): string {
  const placed = shares.reduce((sum, share) => sum + share.count, 0);
  const notFitting = shares.filter((share) => share.count === 0).map((share) => nameOf(share.plantId));
  const message = t('componentDetail.optimized', { count: placed });
  return notFitting.length === 0 ? message : `${message} · ${t('componentDetail.doesNotFit', { names: notFitting.join(', ') })}`;
}
```

Run: `node --test src/screens/ComponentDetailScreen/seasonViewModel.test.ts` — Expected: PASS.

- [ ] **Step 4: Season tabs molecule**

Create `src/components/molecules/SeasonTabs/SeasonTabs.tsx`:

```tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SeasonStatusDot } from '@/components/atoms/SeasonStatusDot';
import type { Season, SeasonStatus } from '@/types';

export interface SeasonTab {
  readonly season: Season;
  readonly label: string;
  readonly monthsLabel: string;
  readonly status: SeasonStatus;
  readonly a11yLabel: string;
}

interface SeasonTabsProps {
  tabs: readonly SeasonTab[];
  selected: Season;
  onSelect: (season: Season) => void;
}

/**
 * Lente · Zomer · Herfst · Winter, each with its months and status dot.
 * BEM contract (src/styles/planning/season.css): .season-tabs, __tab, __tab--selected, __label, __months
 */
export function SeasonTabs({ tabs, selected, onSelect }: SeasonTabsProps): React.JSX.Element {
  return (
    <View className="flex-row border-b border-gray-800" accessibilityRole="tablist">
      {tabs.map((tab) => {
        const isSelected = tab.season === selected;
        return (
          <Pressable
            key={tab.season}
            onPress={() => onSelect(tab.season)}
            className={`flex-1 items-center py-2 ${isSelected ? 'border-b-2 border-green-500' : ''}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={tab.a11yLabel}
            testID={`season-tab-${tab.season}`}
          >
            <View className="flex-row items-center">
              <SeasonStatusDot status={tab.status} />
              <Text className="text-label-large text-on-surface ml-1">{tab.label}</Text>
            </View>
            <Text className="text-xs text-gray-400">{tab.monthsLabel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

`index.ts`: `export { SeasonTabs } from './SeasonTabs'; export type { SeasonTab } from './SeasonTabs';` and the same lines in `src/components/molecules/index.ts`.

- [ ] **Step 5: Canvas draws carried plants dimmed**

In `src/components/organisms/PlantPlacementCanvas/PlantPlacementCanvas.tsx`:
- add to `PlantPlacementCanvasProps`:

```ts
    /** Plants carried over from an earlier season: drawn dimmed with a label, never movable */
    carriedPlants?: readonly PlacedPlantData[];
    /** Label on a carried plant, e.g. "uit lente" */
    carriedLabelOf?: (plant: PlacedPlantData) => string;
```

- destructure `carriedPlants = EMPTY_PLANTS, carriedLabelOf,` (add `const EMPTY_PLANTS: readonly PlacedPlantData[] = [];` near `MIN_ZOOM`);
- replace `const plants = filteredPlants ?? (component.plants || []);` with `const plants = filteredPlants ?? EMPTY_PLANTS;`;
- compute relationships over both: `calculatePlantRelationships([...carriedPlants, ...plants], getPlantById)` (and its memo dependencies);
- in the `warningTooltip` lookup use `[...carriedPlants, ...plants].find(...)`;
- just before `{plants.map((plant) => {` render the carried plants:

```tsx
                                        {carriedPlants.map((plant) => {
                                            const footprint = footprints.get(plant.id);
                                            if (!footprint) return null;
                                            const plantData = getPlantById(plant.plantId);
                                            const isPatchPlant = plantData?.plantingStyle === 'patch' || plantData?.plantingStyle === 'thinning';
                                            return (
                                                <View
                                                    key={plant.id}
                                                    pointerEvents="none"
                                                    style={styles.carriedLayer}
                                                    testID={`carried-plant-${plant.id}`}
                                                >
                                                    <DraggablePlant
                                                        plant={plant}
                                                        plantData={plantData}
                                                        scale={scale}
                                                        containerWidth={containerWidth}
                                                        containerHeight={containerHeight}
                                                        onPositionChange={onPlantPositionChange}
                                                        footprint={footprint}
                                                        hasConflict={conflictIds.has(plant.id)}
                                                        hasWallProximityWarning={false}
                                                        isSelected={false}
                                                        onSelect={() => undefined}
                                                        showPlantName={showPlantNames}
                                                        isPatch={isPatchPlant}
                                                        isThinning={plantData?.plantingStyle === 'thinning'}
                                                        draggingEnabled={false}
                                                        isLocked={true}
                                                        onWarningBadgePress={() => undefined}
                                                        isInPatchEditMode={false}
                                                    />
                                                    {carriedLabelOf && (
                                                        <Text
                                                            style={[styles.carriedLabel, {left: plant.positionX * scale - 24, top: plant.positionY * scale + 10}]}
                                                        >
                                                            {carriedLabelOf(plant)}
                                                        </Text>
                                                    )}
                                                </View>
                                            );
                                        })}
```

- change the empty-state condition to `plants.length === 0 && carriedPlants.length === 0`;
- add to the `StyleSheet.create` block:

```ts
    carriedLayer: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.4,
    },
    carriedLabel: {
        position: 'absolute',
        width: 48,
        textAlign: 'center',
        fontSize: 10,
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 4,
    },
```

- update the file header comment: "The parent passes the footprints and the conflicting plants (overlapping footprints); carried plants from an earlier season are drawn dimmed and cannot be moved."

- [ ] **Step 6: Season canvas hook**

Create `src/screens/ComponentDetailScreen/useSeasonCanvas.ts`:

```ts
import { useMemo } from 'react';
import { conflictingPlantIds, footprintOf, plantingAreaOf, plantsOutsideArea } from '@/domain/planning';
import type { Planning, PlantFootprint } from '@/domain/planning';
import { usePlantStore } from '@/stores/plantStore';
import type { ComponentData, PlacedPlantData, Season } from '@/types';

export interface SeasonCanvas {
  /** Placements of the plants that start in the season, on the shown layer */
  readonly ownPlants: readonly PlacedPlantData[];
  /** Placements carried into the season from an earlier one, on the shown layer */
  readonly carriedPlants: readonly PlacedPlantData[];
  readonly footprints: Map<string, PlantFootprint>;
  readonly conflictIds: Set<string>;
  readonly outOfBoundsIds: Set<string>;
}

const NOTHING: SeasonCanvas = {
  ownPlants: [],
  carriedPlants: [],
  footprints: new Map(),
  conflictIds: new Set(),
  outOfBoundsIds: new Set(),
};

/** What the canvas draws for one season and layer; the footprint, conflict and wall rules come from the domain */
export function useSeasonCanvas(
  component: ComponentData | undefined,
  planning: Planning | null,
  season: Season,
  layerIndex: number | undefined,
): SeasonCanvas {
  const getPlantById = usePlantStore((state) => state.getPlantById);

  return useMemo(() => {
    if (!component || !planning) return NOTHING;
    const onLayer = (p: PlacedPlantData): boolean => layerIndex === undefined || (p.layerIndex ?? 0) === layerIndex;
    const ownPlants = planning.placementsIn(season).filter(onLayer);
    const carriedPlants = planning.carriedPlacementsIn(season).filter(onLayer);
    const all = [...carriedPlants, ...ownPlants];
    const footprintOfPlant = (plant: PlacedPlantData): PlantFootprint => footprintOf(getPlantById(plant.plantId), plant);
    return {
      ownPlants,
      carriedPlants,
      footprints: new Map(all.map((plant) => [plant.id, footprintOfPlant(plant)])),
      conflictIds: conflictingPlantIds(all, footprintOfPlant),
      outOfBoundsIds: plantsOutsideArea(ownPlants, footprintOfPlant, plantingAreaOf(component, layerIndex)),
    };
  }, [component, planning, season, layerIndex, getPlantById]);
}
```

- [ ] **Step 7: Rewrite the Component Detail screen**

Replace `src/screens/ComponentDetailScreen/ComponentDetailScreen.tsx` with:

```tsx
/**
 * ComponentDetailScreen
 * Zoomed view of a component: the plants of one season, the optimizer and the canvas
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ComponentDetailScreenProps } from '@/navigation/navigationTypes';
import { useComponent, useComponentStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';
import { usePlantStore } from '@/stores/plantStore';
import { usePlanning } from '@/stores/planningContext';
import { isGardenBox, isPot, isRectangularTower, isCircularTower } from '@/stores/componentStore';
import { PlantPlacementCanvas, LayerOverviewModal } from '@/components/organisms';
import { SeasonTabs, TowerLayerTabs, YearBar } from '@/components/molecules';
import { PlanningButton, Snackbar } from '@/components/atoms';
import { seasonContaining } from '@/domain/planning';
import type { ComponentData, PlacedPlantData, Season } from '@/types';
import { getTowerLayerDimensions } from '@/domain/component/towerLayerGeometry';
import { useAiChatStore } from '@/stores/ai/aiChatStore';
import { CanvasEditActions } from './CanvasEditActions';
import { buildSeasonTabs, defaultSeasonFor, optimizeResultMessage, planningYearRange } from './seasonViewModel';
import { seasonLabel } from '../PlanningScreen/planningScreenViewModel';
import type { Translate } from '../PlanningScreen/planningScreenViewModel';
import { useSeasonCanvas } from './useSeasonCanvas';

/** How long the result snackbar stays */
const SNACKBAR_DURATION_MS = 4000;

function getComponentDimensions(component: ComponentData): { width: number; height: number } {
  if (isGardenBox(component) || isRectangularTower(component)) {
    return { width: component.widthInCm, height: component.lengthInCm };
  }
  if (isPot(component) || isCircularTower(component)) {
    return { width: component.diameterInCm, height: component.diameterInCm };
  }
  return { width: 100, height: 100 };
}

function getInnerDimensions(component: ComponentData): { width: number; height: number } {
  const outer = getComponentDimensions(component);
  const border = component.borderWidthInCm * 2;
  return { width: Math.max(0, outer.width - border), height: Math.max(0, outer.height - border) };
}

export function ComponentDetailScreen({ navigation, route }: ComponentDetailScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const translate = useCallback<Translate>((key, options) => t(key, options), [t]);
  const { componentId } = route.params;
  const component = useComponent(componentId);
  const getPlantById = usePlantStore((state) => state.getPlantById);
  const actions = useComponentStore(
    useShallow((state) => ({
      optimizeSeason: state.optimizeSeason,
      movePlacement: state.movePlacement,
      removePlacement: state.removePlacement,
      togglePlacementLock: state.togglePlacementLock,
      setAllPlacementsLocked: state.setAllPlacementsLocked,
      resizePatch: state.resizePatch,
    })),
  );

  const today = useMemo(() => seasonContaining(new Date()), []);
  const [year, setYear] = useState(today.year);
  const [season, setSeason] = useState<Season>(() => defaultSeasonFor(today.year, today));
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [showLayerOverview, setShowLayerOverview] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [selectedPlantInstance, setSelectedPlantInstance] = useState<{ id: string; name: string } | null>(null);
  const [patchEditPlantId, setPatchEditPlantId] = useState<string | null>(null);
  const [patchEditOriginal, setPatchEditOriginal] = useState<{ widthInCm: number; heightInCm: number; rotationDeg: number } | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const snackbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTower = component ? isRectangularTower(component) || isCircularTower(component) : false;
  const numberOfLayers = component && (isRectangularTower(component) || isCircularTower(component)) ? component.numberOfLayers : 1;
  const planningLayer = isTower ? selectedLayer : undefined;

  const planning = usePlanning(component, year);
  const canvas = useSeasonCanvas(component, planning, season, planningLayer);
  // Every layer's plants of the season, for the tower layer overview
  const seasonPlants = useMemo(
    () => (planning ? [...planning.carriedPlacementsIn(season), ...planning.placementsIn(season)] : []),
    [planning, season],
  );
  const tabs = useMemo(() => (planning ? buildSeasonTabs(planning, translate) : []), [planning, translate]);
  const status = planning?.statusOf(season) ?? 'notPlanned';
  const canOptimize = (planning?.plantsStartingIn(season).length ?? 0) > 0;

  const yearRange = useMemo(
    () => planningYearRange(today.year, component ? Object.keys(component.plannings).map(Number) : []),
    [today.year, component],
  );

  const innerDimensions = useMemo(() => (component ? getInnerDimensions(component) : { width: 0, height: 0 }), [component]);
  const layerDimensions = useMemo(
    () => (isTower ? getTowerLayerDimensions(innerDimensions.width, innerDimensions.height, selectedLayer) : innerDimensions),
    [isTower, innerDimensions, selectedLayer],
  );

  // A selection or patch edit of a plant that is no longer drawn is dropped
  useEffect(() => {
    const ids = new Set(canvas.ownPlants.map((plant) => plant.id));
    if (selectedPlantInstance && !ids.has(selectedPlantInstance.id)) setSelectedPlantInstance(null);
    if (patchEditPlantId && !ids.has(patchEditPlantId)) {
      setPatchEditPlantId(null);
      setPatchEditOriginal(null);
    }
  }, [canvas.ownPlants, selectedPlantInstance, patchEditPlantId]);

  useEffect(() => () => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
  }, []);

  const changeYear = useCallback(
    (nextYear: number) => {
      setYear(nextYear);
      setSeason(defaultSeasonFor(nextYear, today));
    },
    [today],
  );

  const nameOf = useCallback((plantId: string) => getPlantById(plantId)?.nameNl ?? t('componentDetail.unknownPlant'), [getPlantById, t]);

  const handleOptimize = useCallback(() => {
    const shares = actions.optimizeSeason(componentId, year, season);
    if (shares === null) return;
    setCanvasKey((key) => key + 1);
    setResultMessage(optimizeResultMessage(shares, nameOf, translate));
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    snackbarTimer.current = setTimeout(() => setResultMessage(null), SNACKBAR_DURATION_MS);
  }, [actions, componentId, year, season, nameOf, translate]);

  const handleOpenChat = useCallback(() => {
    const store = useAiChatStore.getState();
    if (store.chatMode !== 'normal') store.clearMessages();
    store.setChatMode('normal');
    navigation.navigate('AiChat');
  }, [navigation]);

  const handleToggleEditMode = useCallback(() => {
    if (isEditMode) setCanvasKey((key) => key + 1);
    setIsEditMode((previous) => !previous);
  }, [isEditMode]);

  const handleCanvasPlantTap = useCallback(
    (plant: PlacedPlantData) => setSelectedPlantInstance({ id: plant.id, name: nameOf(plant.plantId) }),
    [nameOf],
  );

  const handleDeleteSelectedPlant = useCallback(() => {
    if (!selectedPlantInstance) return;
    const { id, name } = selectedPlantInstance;
    Alert.alert(t('common.delete'), `${name} verwijderen?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          actions.removePlacement(componentId, year, season, id);
          setSelectedPlantInstance(null);
        },
      },
    ]);
  }, [selectedPlantInstance, t, actions, componentId, year, season]);

  const handleEnterPatchEditMode = useCallback(
    (plant: PlacedPlantData) => {
      const plantData = getPlantById(plant.plantId);
      const minCm = (plantData?.sowingSpacingCm ?? plantData?.spacingRadiusCm ?? 15) * 2;
      setPatchEditOriginal({
        widthInCm: plant.patchWidthInCm ?? minCm,
        heightInCm: plant.patchHeightInCm ?? minCm,
        rotationDeg: plant.patchRotationDeg ?? 0,
      });
      setPatchEditPlantId(plant.id);
    },
    [getPlantById],
  );

  const handleCancelPatchEdit = useCallback(() => {
    if (patchEditPlantId && patchEditOriginal) {
      actions.resizePatch(componentId, year, season, patchEditPlantId, patchEditOriginal.widthInCm, patchEditOriginal.heightInCm, patchEditOriginal.rotationDeg);
    }
    setPatchEditPlantId(null);
    setPatchEditOriginal(null);
  }, [patchEditPlantId, patchEditOriginal, actions, componentId, year, season]);

  if (!component || !planning) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-on-surface">{t('componentDetail.notFound')}</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4 px-4 py-2 bg-green-600 rounded-lg">
          <Text className="text-white">{t('common.back')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const dimensions = getComponentDimensions(component);
  const selectedPlant = selectedPlantInstance ? canvas.ownPlants.find((p) => p.id === selectedPlantInstance.id) : undefined;
  const selectedPlantData = selectedPlant ? getPlantById(selectedPlant.plantId) : undefined;
  const isSelectedPatch = selectedPlantData?.plantingStyle === 'patch' || selectedPlantData?.plantingStyle === 'thinning';
  const hasPlants = canvas.ownPlants.length + canvas.carriedPlants.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" testID="component-detail-screen">
      {/* Header */}
      <View className="flex-row items-center px-4 h-14 border-b border-gray-800">
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-10 h-10 items-center justify-center rounded-full mr-2"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text className="text-white text-2xl">←</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold" numberOfLines={1}>{component.name}</Text>
          <Text className="text-gray-400 text-xs" numberOfLines={1}>
            {t('componentDetail.sizeSubtitle', {
              outerWidth: dimensions.width,
              outerLength: dimensions.height,
              innerWidth: innerDimensions.width,
              innerLength: innerDimensions.height,
            })}
          </Text>
        </View>
        <Pressable
          onPress={handleOpenChat}
          className="bg-blue-600 w-10 h-10 rounded-full items-center justify-center"
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          testID="ai-tuinhulp-button"
          accessibilityLabel="AI Tuinhulp"
          accessibilityRole="button"
        >
          <Text className="text-lg">🤖</Text>
        </Pressable>
      </View>

      <View className="flex-row items-center h-10 px-2 border-b border-gray-800">
        <YearBar
          year={year}
          onPrev={() => changeYear(year - 1)}
          onNext={() => changeYear(year + 1)}
          canPrev={year > yearRange.first}
          canNext={year < yearRange.last}
          previousLabel={t('planning.year.previous')}
          nextLabel={t('planning.year.next')}
        />
      </View>

      <SeasonTabs tabs={tabs} selected={season} onSelect={setSeason} />

      {status === 'outdated' && (
        <View className="flex-row items-center px-4 py-2 bg-orange-900/40 border-b border-orange-700" testID="outdated-banner">
          <Text className="flex-1 text-white text-sm">{t('componentDetail.outdated')}</Text>
          <Pressable onPress={handleOptimize} className="h-12 px-3 items-center justify-center" accessibilityRole="button" testID="reoptimize-button">
            <Text className="text-label-large text-primary-container">{t('componentDetail.reoptimize')}</Text>
          </Pressable>
        </View>
      )}

      {isTower && (
        <View className="flex-row items-center border-b border-gray-800 bg-gray-900/30">
          <View className="flex-1">
            <TowerLayerTabs
              numberOfLayers={numberOfLayers}
              selectedLayer={selectedLayer}
              onLayerSelect={(layer) => {
                setSelectedLayer(layer);
                setShowLayerOverview(false);
              }}
              onOverviewPress={() => setShowLayerOverview(true)}
            />
          </View>
          <Text className="text-gray-500 text-xs pr-4">
            {t('componentDetail.layer')} {selectedLayer + 1}: {layerDimensions.width.toFixed(0)} x {layerDimensions.height.toFixed(0)} cm
          </Text>
        </View>
      )}

      <View className="flex-1 p-2">
        <PlantPlacementCanvas
          key={canvasKey}
          component={component}
          plants={canvas.ownPlants}
          carriedPlants={canvas.carriedPlants}
          carriedLabelOf={(plant) => {
            const start = planning.startSeasonOf(plant.plantId);
            return start ? t('componentDetail.carriedFrom', { season: seasonLabel(start, translate).toLowerCase() }) : '';
          }}
          layerDimensions={isTower ? layerDimensions : undefined}
          footprints={canvas.footprints}
          conflictIds={canvas.conflictIds}
          outOfBoundsIds={canvas.outOfBoundsIds}
          onPlantPositionChange={(id, x, y) => actions.movePlacement(componentId, year, season, id, x, y)}
          onPlantPress={(plant) => navigation.navigate('PlantDetails', { plantId: plant.plantId })}
          onPlantLongPress={handleCanvasPlantTap}
          isEditMode={isEditMode}
          onToggleEditMode={handleToggleEditMode}
          onBackgroundPress={() => setSelectedPlantInstance(null)}
          onLockAll={() => actions.setAllPlacementsLocked(componentId, year, season, true)}
          onUnlockAll={() => actions.setAllPlacementsLocked(componentId, year, season, false)}
          onActionPress={() => setSelectedPlantInstance(null)}
          onPatchDimensionsChange={(id, w, h, rotation) => actions.resizePatch(componentId, year, season, id, w, h, rotation)}
          patchEditPlantId={patchEditPlantId}
          onPatchEditConfirm={() => {
            setPatchEditPlantId(null);
            setPatchEditOriginal(null);
          }}
          onPatchEditCancel={handleCancelPatchEdit}
        />
        {!hasPlants && (
          <View pointerEvents="none" className="absolute top-3 left-4 right-4 items-center">
            <Text className="text-gray-400 text-xs text-center bg-black/50 px-2 py-1 rounded">{t('componentDetail.emptySeason')}</Text>
          </View>
        )}
        {hasPlants && (
          <View pointerEvents="none" className="absolute top-3 left-0 right-0 items-center">
            <Text className="text-gray-400 text-xs text-center bg-black/50 px-2 py-0.5 rounded">
              {isEditMode ? t('planning.hint.edit') : t('planning.hint.view')}
            </Text>
          </View>
        )}
        {isEditMode && (
          <CanvasEditActions
            hasSelection={selectedPlant != null}
            canResize={selectedPlant != null && isSelectedPatch}
            isLocked={selectedPlant?.locked ?? false}
            onResize={() => {
              if (!selectedPlant) return;
              handleEnterPatchEditMode(selectedPlant);
              setSelectedPlantInstance(null);
            }}
            onDelete={handleDeleteSelectedPlant}
            onToggleLock={() => {
              if (!selectedPlantInstance) return;
              actions.togglePlacementLock(componentId, year, season, selectedPlantInstance.id);
              setSelectedPlantInstance(null);
            }}
          />
        )}
        <Snackbar visible={resultMessage !== null} message={resultMessage ?? ''} testID="optimize-snackbar" />
      </View>

      {/* Action bar: [Planning] [Optimaliseren] */}
      <View className="flex-row items-center h-14 px-4 gap-3 border-t border-gray-800 bg-background">
        <PlanningButton
          label={t('componentDetail.planning')}
          variant="tonal"
          disabled={false}
          onPress={() => navigation.navigate('Planning', { componentId, year })}
          testID="open-planning-button"
        />
        <PlanningButton
          label={t('componentDetail.optimize')}
          variant="tonal"
          disabled={!canOptimize}
          onPress={handleOptimize}
          testID="optimize-button"
        />
      </View>

      {isTower && (
        <LayerOverviewModal
          visible={showLayerOverview}
          onClose={() => setShowLayerOverview(false)}
          component={component}
          plants={seasonPlants}
        />
      )}
    </SafeAreaView>
  );
}
```

- [ ] **Step 8: Delete the week UI**

```bash
git rm -r src/components/organisms/WeekTimeline src/components/organisms/ToPlanAccordion src/components/organisms/PlanningActionBar \
  src/components/molecules/TimeZoneSegment src/components/molecules/ToPlanRow src/components/molecules/ViewModeToggle \
  src/components/atoms/WeekSlot src/components/atoms/PlanningCaption \
  src/styles/planning/timeline.css src/styles/planning/to-plan.css
```

Remove their lines from `src/components/{atoms,molecules,organisms}/index.ts` (`WeekSlot`, `WEEK_SLOT_WIDTH`, `PlanningCaption`, `TimeZoneSegment`, `ToPlanRow`, `ViewModeToggle`, `ViewMode`, `WeekTimeline`, `ToPlanAccordion`, `PlanningActionBar`). In `YearBar.tsx`, change "BEM contract (src/styles/planning/timeline.css)" to "(src/styles/planning/season.css)". In `actions.css`, rename the comment "Time planning" to "Season planning" and the bar comment to `[Planning] [Optimaliseren]`; drop its `.planning-button--danger` and `__label--danger` rules only if no component uses `outlined-danger` anymore (`git grep -n "outlined-danger" -- src`).

- [ ] **Step 9: Verify**

Run: `npm run test:unit` — Expected: PASS.
Run: `npm run typecheck` — Expected: no errors.
Run: `git grep -n "growingPeriod\|plantsToPlan\|WeekTimeline\|ToPlanAccordion\|useOptimizeComponent" -- src` — Expected: no output.

Manual check on a device/emulator (`npm run android`): open a box → year bar, four season tabs, empty canvas hint → [Planning] → add Tomaat and Sla → back → tap the season tab whose label says "2 planten om te plaatsen" → [Optimaliseren] → plants appear, snackbar "N planten geplaatst" → next season tab shows Tomaat dimmed with "uit …" → back to the earlier tab → drag a tomato → later tab shows the orange dot and the outdated banner.

- [ ] **Step 10: Commit**

```bash
git add -A src
git commit -m "feat(planning): component detail shows and optimizes one season at a time

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Maestro flows and docs

**Files:**
- Delete: `maestro/planning_*.yaml`, `maestro/subflows/{add_plants_to_plan,prepare_planning_component,select_zone_with_plants}.yaml`
- Create: `maestro/subflows/open_planning.yaml`, `maestro/subflows/add_plants_to_planning.yaml`, `maestro/subflows/select_season_with_plants.yaml`
- Create: `maestro/season_add_plants.yaml`, `maestro/season_optimize.yaml`, `maestro/season_carry_over.yaml`, `maestro/season_outdated.yaml`, `maestro/season_remove_plant.yaml`
- Modify: `maestro/README.md` (flow list), `CLAUDE.md` (screens and add-plant description)

Frost dates come from the date picker defaults, so flows never hardcode a season: they pick the season tab through its accessibility label ("…, N planten om te plaatsen").

- [ ] **Step 1: Subflows**

`maestro/subflows/open_planning.yaml`:

```yaml
appId: com.mylittlegarden.app
---
# Shared: fresh app -> garden box -> component detail -> Planning screen.
- runFlow: setup_environment.yaml
- runFlow: create_garden_box.yaml
- tapOn:
    id: "open-planning-button"
- extendedWaitUntil:
    visible:
      id: "planning-screen"
    timeout: 5000
```

`maestro/subflows/add_plants_to_planning.yaml`:

```yaml
appId: com.mylittlegarden.app
---
# Shared: on the Planning screen, add Tomaat and Sla and come back.
- tapOn:
    id: "planning-add-plant-button"
- extendedWaitUntil:
    visible:
      id: "plant-selection-screen"
    timeout: 5000
- tapOn:
    id: "plant-search-input"
- inputText: "Tomaat"
- hideKeyboard
- tapOn:
    id: "plant-tile-tomaat"
- tapOn:
    id: "plant-search-input"
- eraseText: 10
- inputText: "Sla"
- hideKeyboard
- tapOn:
    id: "plant-tile-sla"
- assertVisible:
    text: "2 planten toevoegen"
- tapOn:
    id: "add-plants-button"
- extendedWaitUntil:
    visible:
      id: "planning-plant-tomaat"
    timeout: 5000
- assertVisible:
    id: "planning-plant-sla"
```

`maestro/subflows/select_season_with_plants.yaml`:

```yaml
appId: com.mylittlegarden.app
---
# Shared: on the component detail screen, open a season tab that has plants to place.
- tapOn:
    text: ".*, [1-9]\\d* (plant|planten) om te plaatsen, .*"
```

- [ ] **Step 2: Flows**

`maestro/season_add_plants.yaml`:

```yaml
appId: com.mylittlegarden.app
name: Season planning - plants get their seasons from the calendar
---
- runFlow: subflows/open_planning.yaml
- runFlow: subflows/add_plants_to_planning.yaml
# Each plant shows the seasons it grows in
- assertVisible:
    text: "(Lente|Zomer|Herfst|Winter)( · (Lente|Zomer|Herfst|Winter))*"
# Every plant with a calendar has a ratio stepper in its start season
- assertVisible:
    id: "ratio-.*-tomaat"
- assertVisible:
    id: "ratio-.*-sla"
```

`maestro/season_optimize.yaml`:

```yaml
appId: com.mylittlegarden.app
name: Season planning - optimizing a season fills the canvas
---
- runFlow: subflows/open_planning.yaml
- runFlow: subflows/add_plants_to_planning.yaml
- tapOn:
    id: "ratio-.*-sla-increase"
- assertVisible:
    id: "ratio-.*-sla-value"
    text: "2"
- back
- extendedWaitUntil:
    visible:
      id: "component-detail-screen"
    timeout: 5000
- runFlow: subflows/select_season_with_plants.yaml
- tapOn:
    id: "optimize-button"
- extendedWaitUntil:
    visible:
      id: "optimize-snackbar"
    timeout: 10000
- assertVisible:
    text: "[1-9]\\d* (plant|planten) geplaatst.*"
- assertVisible:
    id: "planning-footprint-.*"
```

`maestro/season_carry_over.yaml`:

```yaml
appId: com.mylittlegarden.app
name: Season planning - a plant growing on is shown dimmed in the next season
---
- runFlow: subflows/open_planning.yaml
- runFlow: subflows/add_plants_to_planning.yaml
# Tomaat grows over more than one season, so a later season lists it as carried
- assertVisible:
    id: "carried-row-.*-tomaat"
- back
- runFlow: subflows/select_season_with_plants.yaml
- tapOn:
    id: "optimize-button"
- extendedWaitUntil:
    visible:
      id: "optimize-snackbar"
    timeout: 10000
# Open a season that holds plants carried over from an earlier one
- tapOn:
    text: ".*, [1-9]\\d* doorlopend"
- assertVisible:
    id: "carried-plant-.*"
```

`maestro/season_outdated.yaml`:

```yaml
appId: com.mylittlegarden.app
name: Season planning - changing a ratio marks the season outdated
---
- runFlow: subflows/open_planning.yaml
- runFlow: subflows/add_plants_to_planning.yaml
- back
- runFlow: subflows/select_season_with_plants.yaml
- tapOn:
    id: "optimize-button"
- extendedWaitUntil:
    visible:
      id: "optimize-snackbar"
    timeout: 10000
- tapOn:
    id: "open-planning-button"
# The optimized season holds Tomaat or Sla (or both): changing both ratios outdates it
- tapOn:
    id: "ratio-.*-tomaat-increase"
- tapOn:
    id: "ratio-.*-sla-increase"
- assertVisible:
    text: "Verouderd"
- back
- assertVisible:
    id: "outdated-banner"
- tapOn:
    id: "reoptimize-button"
- extendedWaitUntil:
    notVisible:
      id: "outdated-banner"
    timeout: 10000
```

`maestro/season_remove_plant.yaml`:

```yaml
appId: com.mylittlegarden.app
name: Season planning - removing a plant asks for confirmation
---
- runFlow: subflows/open_planning.yaml
- runFlow: subflows/add_plants_to_planning.yaml
- tapOn:
    id: "planning-remove-sla"
- assertVisible:
    text: "Sla verwijderen\\?"
- tapOn:
    text: "Annuleren"
- assertVisible:
    id: "planning-plant-sla"
- tapOn:
    id: "planning-remove-sla"
- tapOn:
    text: "Verwijderen"
- assertNotVisible:
    id: "planning-plant-sla"
```

Check the button texts against `common.cancel` / `common.delete` in `nl.json` and the footprint testID prefix used by `PlantPlacementCanvas` (`git grep -n "testID=" src/components/organisms/PlantPlacementCanvas/PlantPlacementCanvas.tsx`); adjust the flows to the real values.

- [ ] **Step 3: Remove the old flows**

```bash
git rm maestro/planning_add_plants.yaml maestro/planning_browse_time.yaml maestro/planning_rearrange.yaml \
  maestro/planning_remove_to_plan.yaml maestro/planning_start_over.yaml \
  maestro/subflows/add_plants_to_plan.yaml maestro/subflows/prepare_planning_component.yaml maestro/subflows/select_zone_with_plants.yaml
```

Update `maestro/README.md`: replace the planning flow list with the five `season_*` flows and their one-line purpose.

- [ ] **Step 4: Run the flows**

With the app installed on an emulator: `maestro test maestro/season_add_plants.yaml maestro/season_optimize.yaml maestro/season_carry_over.yaml maestro/season_outdated.yaml maestro/season_remove_plant.yaml`
Expected: all pass. A failure in `season_carry_over` when the default frost date puts Tomaat in a single season is a real finding: report it rather than weakening the flow.

- [ ] **Step 5: Update CLAUDE.md**

In `CLAUDE.md` → Key Screens:
- item 4: `**Component Detail Screen**: Zoomed view of one season (year bar, Lente/Zomer/Herfst/Winter tabs), optimizer, draggable plants with companion indicators; plants carried over from an earlier season are dimmed`
- item 5: `**Add Plant Screen**: Grid selection (multi-select) to add plants to a component's planning; no quantities`
- add after item 5: `**Planning Screen**: Per component and year: plant list with derived seasons, and per season the relative area ratio of each plant`

In Domain Concepts → Growing Calendar add: `Seasons (meteorological) are derived from the calendar: a plant is placed in its first season and stays in the later ones.`

- [ ] **Step 6: Commit**

```bash
git add -A maestro CLAUDE.md
git commit -m "test(maestro): season planning flows

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
