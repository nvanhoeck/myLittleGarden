# Sowing Windows and Succession Plantings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every plant real sowing windows, and let a placed planting be duplicated into, or moved to, another season its window reaches.

**Architecture:** The catalog's single week offsets become windows (`{ fromWeeks, toWeeks }` relative to the last frost). `PlantCalendar` turns them into dates, reachable seasons and the growing seasons of a planting that starts in a given season, exposed to the domain as a `PlantingCalendar`. The `Planning` entity moves from "one plant = one planting" to explicit `plantings` (`{ id, plantId, startSeason, fixedSeasons? }`), with ratios and placements keyed by planting id; `Planning.from` reconciles stored data with the calendar on every load. The optimizer runs per planting by passing planting ids where `fillByRatio` expects plant ids. Storage v5 converts v4 plannings.

**Tech Stack:** React Native 0.81 + Expo 54, TypeScript strict, Zustand 5, Zod 3, i18next (Dutch), NativeWind, `node --test` (Node type stripping), Maestro.

**Spec:** `docs/superpowers/specs/2026-11-06-succession-plantings-design.md` (builds on `docs/superpowers/specs/2026-11-05-season-planning-design.md`)

## Global Constraints

- Windows: `indoorStartWindow`, `transplantWindow`, `directSowWindow`: `{ fromWeeks: number; toWeeks: number } | null`, weeks relative to the last spring frost, `fromWeeks ≤ toWeeks`; the old `indoorStartWeeks`, `transplantWeeks`, `directSowWeeks` are removed.
- Month windows from sources are converted against the average Belgian last frost: 15 April. Trees and shrubs without a calendar keep all windows `null`.
- Planting window = transplant window if present, else direct sow window. Earliest planting date in season S = later of (window start, first day of S); S is reachable when that date is not after the window end (and not after S's last day).
- A planting's end = start + `daysToHarvest.max` days, capped at the end of February Y+1.
- At most one planting per plant per start season. Duplicate and move only for placed plantings (≥ 1 placement), to available seasons (reachable, no planting of that plant yet; earlier seasons allowed). New, duplicated and moved plantings start at ratio 1.
- Removing a plant's last planting removes the plant from the list. A plant without planting window, or whose window reaches no season of the year, stays in the list without plantings ("geen teeltkalender" / "valt buiten dit planningsjaar").
- Placed plantings are never changed by a frost-date change; only unplaced plantings follow the calendar.
- Planting ids are deterministic: `<plantId>-<season>` (suffix `-2`, `-3`… if taken); a moved planting keeps its id.
- Existing v4 plannings are converted to v5, not dropped.
- Season planning rules not listed here are unchanged (statuses, outdated marking, locking, ratios as relative area shares, fill-the-box optimizer).
- All UI strings Dutch via `src/i18n/nl.json`; components presentational; BEM contract documented in `src/styles/planning/season.css`.
- Domain, view models, schemas, migrations and their tests import with relative paths and `.ts` extensions; no TS parameter properties or enums.
- Unit tests: `npm run test:unit`; typecheck: `npm run typecheck` (test files excluded). After Task 3 typecheck may fail only in the store/context/AI-chat/migration files Task 4 rewrites and the screens Task 5 rewrites; after Task 4 only in screens/view models; from Task 5 on it must be clean.
- File writes: Write/Edit. If a write fails (EPERM or any I/O error), stop and report the exact error and path before any workaround. Preserve line endings (several files are CRLF; `plants.json` is LF, 2-space JSON).
- Stage files explicitly (never `git add -A`; `.idea/misc.xml` and untracked root files stay out). Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Branch `feature/succession-plantings`.

## Review Focus

1. **Window starting before March** (e.g. February sowing): the first planting starts in spring on 1 March instead of the plant being reported unplannable. Test in Task 2 (`reachableSeasonsOf` with a window from February to April).
2. **Window ending around a season boundary**: a window ending in late May does not reach summer; one ending in early June does. Test in Task 2.
3. **Repeated loads after a frost change**: `Planning.from` reconciles on every load, so it must be idempotent and keep planting ids stable (otherwise the UI's planting ids stop matching). Test in Task 3 (`reconciled()` twice → same instance, same ids).
4. **Migrated v4 data with loose ends**: placements of a plant without a ratio, and ratios of a plant that is not in `plants`, become proper plantings and are not lost. Test in Task 4.
5. **Removing the first of two plantings**: the remaining planting is renumbered ("Sla", not "Sla (2e teelt)"), and its menu still works. Test in Task 5 view model.

---

## File Structure

- `src/types/plant.types.ts` — `SowingWindow`; window fields on `PlantData` (Task 2)
- `src/schemas/plantSchema.ts` — window schema (Task 2)
- `src/data/plants.json` — v3.0.0 with windows (Task 2, from Task 1's research)
- `docs/plant-windows-2026.md`, `docs/plant-windows-2026.json` — research table and data (Task 1)
- `src/domain/planning/PlantCalendar.ts` — window dates, reachable seasons, growing seasons per start season, `PlantingCalendar` (Task 2, extended in Task 3)
- `src/utils/calendarCalculations.ts` + `src/components/organisms/GrowingCalendar/GrowingCalendar.tsx` — real windows on Plant Details (Task 2)
- `src/types/planning.types.ts` — `PlantingData`, v5 `PlanningData`, `PlacementData.plantingId` (Task 3)
- `src/schemas/planningSchema.ts` — v5 schemas (Task 3)
- `src/domain/planning/Planning.ts` — plantings model (Task 3, rewrite)
- `src/domain/planning/SeasonOptimization.ts` — per planting, `PlantingShare` (Task 3)
- `src/domain/planning/CurrentPlacements.ts`, `src/domain/planning/Season.ts`, `src/domain/planning/index.ts` (Task 3)
- `src/stores/migrations/componentStoreMigrations.ts` — v5 (Task 4)
- `src/stores/{componentStore,planningContext,planningStore}.ts`, `src/hooks/ai/useAiChat.ts` (Task 4)
- `src/screens/PlanningScreen/*`, `src/types/planningViews.types.ts`, `src/components/organisms/{SeasonPlanSection,PlantingActionsSheet}`, `src/components/atoms/PlantingRowMenuButton`, `src/screens/ComponentDetailScreen/{ComponentDetailScreen.tsx,seasonViewModel.ts}`, `src/i18n/nl.json`, `src/styles/planning/season.css` (Task 5)
- `maestro/season_*_planting*.yaml`, `maestro/README.md`, `CLAUDE.md` (Task 6)

---

### Task 1: Sowing-window research (plant specialist) — user review gate

This task produces data only. **After it, execution stops until the user has reviewed and approved `docs/plant-windows-2026.md`.** Use the `plant-product-specialist` agent.

**Files:**
- Create: `docs/plant-windows-2026.md`
- Create: `docs/plant-windows-2026.json`

**Interfaces:**
- Produces: `docs/plant-windows-2026.json` with exactly this shape (consumed by Task 2):

```json
{
  "frostReference": "04-15",
  "plants": {
    "sla": {
      "indoorStartWindow": { "fromWeeks": -10, "toWeeks": 12 },
      "transplantWindow": { "fromWeeks": -6, "toWeeks": 16 },
      "directSowWindow": { "fromWeeks": -6, "toWeeks": 16 }
    }
  }
}
```

  Every `id` of `src/data/plants.json` appears once under `plants`; each window is an object with integer `fromWeeks ≤ toWeeks`, or `null`.

- [ ] **Step 1: List the plants**

Run: `node -e "const p=require('./src/data/plants.json').plants;console.log(p.length);p.forEach(x=>console.log([x.id,x.nameNl,x.category,x.plantType,x.indoorStartWeeks,x.transplantWeeks,x.directSowWeeks].join('\t')))"`
Expected: 176 lines with id, name, category, type and today's single offsets.

- [ ] **Step 2: Research each plant**

For every plant, find the Belgian outdoor periods for starting indoors ("voorzaaien binnen"), planting out ("uitplanten") and sowing outside ("buiten zaaien") in three independent sources, preferring Belgian ones (Aveve, Hubo, Leefmilieu Brussel moestuin guide, seed packets of Belgian seed suppliers, Velt). Rules:
- A method the plant is not grown by stays `null` (e.g. no direct sowing for tomato).
- Trees, shrubs and other perennials planted as stock (`plantType` `tree` or `shrub`, and plants that today have all three offsets `null`) stay `null` for all three.
- Where sources disagree, take the period at least two of the three agree on; note the disagreement.
- A plant that today has a non-null offset for a method must get a window for that method (or a note explaining why not).

- [ ] **Step 3: Convert months to weeks**

Convert each period against 15 April: a period starting in the first half of a month starts on its 1st, else on its 15th; it ends on the last day of its end month (or the 15th for "half <maand>"). `fromWeeks = floor((startDate − 15 April) / 7 days)`, `toWeeks = floor((endDate − 15 April) / 7 days)`, using the same year (a period running into the next year, e.g. October–February, adds 365 days to the end date).
Worked example: "buiten zaaien maart–juli" → 1 March … 31 July → `fromWeeks = floor(−45/7) = −7`, `toWeeks = floor(107/7) = 15`.

- [ ] **Step 4: Write the review table**

`docs/plant-windows-2026.md`: an intro (method, 15 April reference, conversion rule with the worked example), then one table per category with columns: id · naam · voorzaaien binnen (maanden + weken) · uitplanten (maanden + weken) · buiten zaaien (maanden + weken) · bronnen (3 links or titles) · opmerkingen. End with a list of plants left without windows and why.

- [ ] **Step 5: Write the data file and validate it**

Write `docs/plant-windows-2026.json` in the shape above, then run:

```bash
node -e "
const plants = require('./src/data/plants.json').plants;
const data = require('./docs/plant-windows-2026.json').plants;
const methods = [['indoorStartWindow','indoorStartWeeks'],['transplantWindow','transplantWeeks'],['directSowWindow','directSowWeeks']];
let errors = 0;
for (const p of plants) {
  const w = data[p.id];
  if (!w) { console.log('missing', p.id); errors++; continue; }
  for (const [win, old] of methods) {
    const v = w[win];
    if (v !== null && (!Number.isInteger(v.fromWeeks) || !Number.isInteger(v.toWeeks) || v.fromWeeks > v.toWeeks)) { console.log('bad', p.id, win); errors++; }
    if (p[old] !== null && v === null) console.log('note: old offset but no window', p.id, win);
  }
}
for (const id of Object.keys(data)) if (!plants.some((p) => p.id === id)) { console.log('unknown', id); errors++; }
console.log(errors === 0 ? 'OK' : errors + ' errors');
"
```

Expected: `OK`; every "note:" line is explained in the table's opmerkingen.

- [ ] **Step 6: Commit**

```bash
git add docs/plant-windows-2026.md docs/plant-windows-2026.json
git commit -m "docs(catalog): sowing windows for all plants (for review)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: User review gate**

Stop and ask the user to review `docs/plant-windows-2026.md`. Apply requested changes to both files (re-run Step 5), commit, and continue with Task 2 only after explicit approval.

---

### Task 2: Catalog windows, PlantCalendar dates and the Plant Details calendar

**Files:**
- Modify: `src/types/plant.types.ts:138-142`
- Modify: `src/schemas/plantSchema.ts:137-139`
- Modify: `src/data/plants.json`
- Modify: `src/domain/planning/PlantCalendar.ts` (+ `PlantCalendar.test.ts`)
- Modify: `src/domain/planning/index.ts`
- Modify: `src/utils/calendarCalculations.ts` (+ `calendarCalculations.test.ts`)
- Modify: `src/components/organisms/GrowingCalendar/GrowingCalendar.tsx`

**Interfaces:**
- Consumes: `docs/plant-windows-2026.json` (Task 1).
- Produces:
  - `interface SowingWindow { readonly fromWeeks: number; readonly toWeeks: number }`; `PlantData.indoorStartWindow | transplantWindow | directSowWindow: SowingWindow | null`
  - `PlantTiming = Pick<PlantData, 'indoorStartWindow' | 'transplantWindow' | 'directSowWindow' | 'daysToHarvest'>`
  - `interface DateWindow { readonly start: Date; readonly end: Date }` (UTC midnight, inclusive)
  - `sowingDatesOf(plant, frost, year): { indoorStart: DateWindow | null; transplant: DateWindow | null; directSow: DateWindow | null }`
  - `plantingWindowOf(plant, frost, year): DateWindow | null`
  - `earliestPlantingDate(plant, frost, year, season): Date | null`
  - `reachableSeasonsOf(plant, frost, year): Season[]`
  - `growingSeasonsFrom(plant, frost, year, startSeason): Season[]`
  - `seasonsLookup(year, frost, plantOf): SeasonsOf` — kept for the current Planning until Task 3; now = growing seasons of the first planting.
  - `splitAtYearEnd(range: DateRange): DateRange[]` in `calendarCalculations.ts`.

- [ ] **Step 1: Types and schema**

In `src/types/plant.types.ts`, before `PlantData` add:

```ts
/**
 * A sowing or planting period in weeks relative to the last spring frost
 * (negative = before the frost), both ends inclusive
 */
export interface SowingWindow {
    readonly fromWeeks: number;
    readonly toWeeks: number;
}
```

and replace the three fields under `// Growing calendar - weeks relative to last spring frost` with:

```ts
    // Growing calendar - windows relative to last spring frost; null when the plant is not grown this way
    readonly indoorStartWindow: SowingWindow | null;
    readonly transplantWindow: SowingWindow | null;
    readonly directSowWindow: SowingWindow | null;
```

In `src/schemas/plantSchema.ts`, before `plantDataSchema` add:

```ts
/**
 * Sowing window schema: whole weeks relative to the last frost, start not after end
 */
export const sowingWindowSchema = z
    .object({ fromWeeks: z.number().int(), toWeeks: z.number().int() })
    .refine((window) => window.fromWeeks <= window.toWeeks, {
        message: 'Zaaiperiode eindigt voor ze begint',
        path: ['toWeeks'],
    });
```

and replace the three `…Weeks` lines in `plantDataSchema` with:

```ts
    indoorStartWindow: sowingWindowSchema.nullable(),
    transplantWindow: sowingWindowSchema.nullable(),
    directSowWindow: sowingWindowSchema.nullable(),
```

- [ ] **Step 2: Apply the researched data to plants.json**

```bash
node -e "
const fs = require('fs');
const path = 'src/data/plants.json';
const db = JSON.parse(fs.readFileSync(path, 'utf8'));
const windows = require('./docs/plant-windows-2026.json').plants;
db.version = '3.0.0';
db.plants = db.plants.map((p) => {
  const w = windows[p.id];
  if (!w) throw new Error('no windows for ' + p.id);
  const { indoorStartWeeks, transplantWeeks, directSowWeeks, ...rest } = p;
  const out = {};
  for (const [key, value] of Object.entries(rest)) {
    out[key] = value;
    if (key === 'daysToHarvest') {
      out.indoorStartWindow = w.indoorStartWindow;
      out.transplantWindow = w.transplantWindow;
      out.directSowWindow = w.directSowWindow;
    }
  }
  return out;
});
fs.writeFileSync(path, JSON.stringify(db, null, 2) + '\n', 'utf8');
console.log('done', db.plants.length);
"
```

Expected: `done 176`. Then `grep -cE '"(indoorStart|transplant|directSow)Weeks"' src/data/plants.json` → `0`.

- [ ] **Step 3: Write the failing PlantCalendar tests**

Replace `src/domain/planning/PlantCalendar.test.ts` with:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  earliestPlantingDate,
  frostDayOf,
  growingSeasonsFrom,
  plantingWindowOf,
  reachableSeasonsOf,
  seasonsLookup,
  sowingDatesOf,
} from './PlantCalendar.ts';
import type { PlantTiming } from './PlantCalendar.ts';

const day = (date: Date | null | undefined): string | null => (date ? date.toISOString().slice(0, 10) : null);
const frost = { month: 4, day: 15 };

const timing = (overrides: Partial<PlantTiming>): PlantTiming => ({
  indoorStartWindow: null,
  transplantWindow: null,
  directSowWindow: null,
  daysToHarvest: { min: 1, max: 60 },
  ...overrides,
});

// Tomato: plant out 29 April – 27 May, harvest up to 85 days later
const tomato = timing({
  indoorStartWindow: { fromWeeks: -8, toWeeks: -6 },
  transplantWindow: { fromWeeks: 2, toWeeks: 6 },
  daysToHarvest: { min: 60, max: 85 },
});
// Lettuce: sow outside 4 March – 5 August, harvest up to 60 days later
const lettuce = timing({ directSowWindow: { fromWeeks: -6, toWeeks: 16 }, daysToHarvest: { min: 25, max: 60 } });

describe('frostDayOf', () => {
  test('reads month and day from a stored date; null for none or invalid', () => {
    assert.deepEqual(frostDayOf('2026-04-15'), { month: 4, day: 15 });
    assert.equal(frostDayOf(null), null);
    assert.equal(frostDayOf('2026-02-30'), null);
  });
});

describe('sowingDatesOf', () => {
  test('turns each window into dates around the last frost; a method without window is null', () => {
    const dates = sowingDatesOf(tomato, frost, 2026);
    assert.deepEqual([day(dates.indoorStart?.start), day(dates.indoorStart?.end)], ['2026-02-18', '2026-03-04']);
    assert.deepEqual([day(dates.transplant?.start), day(dates.transplant?.end)], ['2026-04-29', '2026-05-27']);
    assert.equal(dates.directSow, null);
  });
});

describe('plantingWindowOf', () => {
  test('is the transplant window when there is one, else the direct sow window, else null', () => {
    assert.equal(day(plantingWindowOf(tomato, frost, 2026)?.start), '2026-04-29');
    assert.equal(day(plantingWindowOf(lettuce, frost, 2026)?.end), '2026-08-05');
    assert.equal(plantingWindowOf(timing({}), frost, 2026), null);
  });
});

describe('earliestPlantingDate', () => {
  test('is the window start inside its own season, else the first day of a later season inside the window', () => {
    assert.equal(day(earliestPlantingDate(lettuce, frost, 2026, 'spring')), '2026-03-04');
    assert.equal(day(earliestPlantingDate(lettuce, frost, 2026, 'summer')), '2026-06-01');
    assert.equal(earliestPlantingDate(lettuce, frost, 2026, 'autumn'), null);
  });
});

describe('reachableSeasonsOf', () => {
  test('gives every season the window reaches', () => {
    assert.deepEqual(reachableSeasonsOf(tomato, frost, 2026), ['spring']);
    assert.deepEqual(reachableSeasonsOf(lettuce, frost, 2026), ['spring', 'summer']);
  });

  test('given a window starting in February, the plant starts in spring on 1 March', () => {
    const early = timing({ directSowWindow: { fromWeeks: -9, toWeeks: 2 } }); // 11 Feb – 29 Apr
    assert.deepEqual(reachableSeasonsOf(early, frost, 2026), ['spring']);
    assert.equal(day(earliestPlantingDate(early, frost, 2026, 'spring')), '2026-03-01');
  });

  test('given a window ending in late May, summer is not reached; ending in early June it is', () => {
    const endsMay = timing({ directSowWindow: { fromWeeks: 0, toWeeks: 6 } }); // 15 Apr – 27 May
    const endsJune = timing({ directSowWindow: { fromWeeks: 0, toWeeks: 7 } }); // 15 Apr – 3 June
    assert.deepEqual(reachableSeasonsOf(endsMay, frost, 2026), ['spring']);
    assert.deepEqual(reachableSeasonsOf(endsJune, frost, 2026), ['spring', 'summer']);
  });

  test('given a window entirely before March of the planning year, no season is reached', () => {
    const autumnBefore = timing({ directSowWindow: { fromWeeks: -26, toWeeks: -22 } }); // Oct – Nov of the year before
    assert.deepEqual(reachableSeasonsOf(autumnBefore, frost, 2026), []);
  });

  test('given no planting window, no season is reached', () => {
    assert.deepEqual(reachableSeasonsOf(timing({ indoorStartWindow: { fromWeeks: -8, toWeeks: -6 } }), frost, 2026), []);
  });
});

describe('growingSeasonsFrom', () => {
  test('runs from the earliest planting date in the start season until the latest harvest', () => {
    assert.deepEqual(growingSeasonsFrom(tomato, frost, 2026, 'spring'), ['spring', 'summer']);
    assert.deepEqual(growingSeasonsFrom(lettuce, frost, 2026, 'spring'), ['spring']);
    assert.deepEqual(growingSeasonsFrom(lettuce, frost, 2026, 'summer'), ['summer']);
  });

  test('gives no seasons for a season the window does not reach or without harvest time', () => {
    assert.deepEqual(growingSeasonsFrom(lettuce, frost, 2026, 'autumn'), []);
    assert.deepEqual(growingSeasonsFrom(timing({ directSowWindow: { fromWeeks: 0, toWeeks: 4 }, daysToHarvest: { min: 0, max: 0 } }), frost, 2026, 'spring'), []);
  });

  test('ends at the latest at the end of the planning year\'s winter', () => {
    const late = timing({ transplantWindow: { fromWeeks: 15, toWeeks: 20 }, daysToHarvest: { min: 200, max: 300 } });
    assert.deepEqual(growingSeasonsFrom(late, frost, 2026, 'summer'), ['summer', 'autumn', 'winter']);
  });
});

describe('seasonsLookup', () => {
  test('gives the growing seasons of the first planting; unknown plants or no frost date give none', () => {
    const catalog = new Map([['tomaat', tomato]]);
    assert.deepEqual(seasonsLookup(2026, frost, (id) => catalog.get(id))('tomaat'), ['spring', 'summer']);
    assert.deepEqual(seasonsLookup(2026, frost, (id) => catalog.get(id))('onbekend'), []);
    assert.deepEqual(seasonsLookup(2026, null, (id) => catalog.get(id))('tomaat'), []);
  });
});
```

Date checks (15 April 2026): −56 d = 18 Feb; −42 d = 4 Mar; +14 = 29 Apr; +42 = 27 May; +112 = 5 Aug; −63 d = 11 Feb; +49 = 3 Jun; 29 Apr + 85 = 23 Jul; 1 Jun + 60 = 31 Jul; 4 Mar + 60 = 3 May; 29 Jul (+105) is in summer.

Run: `node --test src/domain/planning/PlantCalendar.test.ts` — Expected: FAIL (missing exports).

- [ ] **Step 4: Implement the window functions**

In `src/domain/planning/PlantCalendar.ts`:
- change the type import to `import type { PlantData, SowingWindow } from '../../types/plant.types.ts';`
- replace `PlantTiming`, `PlantingDates`, `OutdoorPeriod`, `plantingDatesOf`, `outdoorPeriodOf`, `growingSeasonsOf` and `seasonsLookup` with the code below (keep `FrostDay`, `frostDayOf`, `frostDateIn`, `plusDays`, `DAY_MS`, `DAYS_PER_WEEK`):

```ts
/** The catalog fields that decide when a plant is sown, planted and harvested */
export type PlantTiming = Pick<PlantData, 'indoorStartWindow' | 'transplantWindow' | 'directSowWindow' | 'daysToHarvest'>;

/** A period of days, both inclusive, as UTC midnights */
export interface DateWindow {
  readonly start: Date;
  readonly end: Date;
}

export interface SowingDates {
  readonly indoorStart: DateWindow | null;
  readonly transplant: DateWindow | null;
  readonly directSow: DateWindow | null;
}

function datesOf(window: SowingWindow | null, frost: Date): DateWindow | null {
  return window === null
    ? null
    : { start: plusDays(frost, window.fromWeeks * DAYS_PER_WEEK), end: plusDays(frost, window.toWeeks * DAYS_PER_WEEK) };
}

/**
 * The sowing and planting windows of a plant in a planning year, as dates:
 * the last spring frost plus the catalog's weeks (negative = before the frost).
 * The Plant Details calendar and the season planning both use these dates.
 */
export function sowingDatesOf(plant: PlantTiming, lastSpringFrost: FrostDay, year: number): SowingDates {
  const frost = frostDateIn(year, lastSpringFrost);
  return {
    indoorStart: datesOf(plant.indoorStartWindow, frost),
    transplant: datesOf(plant.transplantWindow, frost),
    directSow: datesOf(plant.directSowWindow, frost),
  };
}

/** When the plant goes into the component: its transplant window, else its direct sow window */
export function plantingWindowOf(plant: PlantTiming, lastSpringFrost: FrostDay, year: number): DateWindow | null {
  const dates = sowingDatesOf(plant, lastSpringFrost, year);
  return dates.transplant ?? dates.directSow;
}

/**
 * The first day a planting can start in a season: the later of the window
 * start and the season's first day. Null when that day is after the window
 * or after the season (the season is not reachable).
 */
export function earliestPlantingDate(plant: PlantTiming, lastSpringFrost: FrostDay, year: number, season: Season): Date | null {
  const window = plantingWindowOf(plant, lastSpringFrost, year);
  if (window === null) {
    return null;
  }
  const range = seasonRange(year, season);
  const start = window.start > range.start ? window.start : range.start;
  return start <= window.end && start <= range.end ? start : null;
}

/** The seasons of the planning year a planting can start in, in order */
export function reachableSeasonsOf(plant: PlantTiming, lastSpringFrost: FrostDay, year: number): Season[] {
  return SEASONS.filter((season) => earliestPlantingDate(plant, lastSpringFrost, year, season) !== null);
}

/**
 * The seasons a planting starting in startSeason grows in: from its earliest
 * planting date until the latest harvest, at the latest the end of the
 * planning year's winter. None when the season is not reachable or there is
 * no harvest time.
 */
export function growingSeasonsFrom(plant: PlantTiming, lastSpringFrost: FrostDay, year: number, startSeason: Season): Season[] {
  const start = earliestPlantingDate(plant, lastSpringFrost, year, startSeason);
  const harvestDays = plant.daysToHarvest.max;
  if (start === null || !Number.isFinite(harvestDays) || harvestDays <= 0) {
    return [];
  }
  const lastDay = seasonRange(year, 'winter').end;
  const end = new Date(Math.min(plusDays(start, harvestDays).getTime(), lastDay.getTime()));
  return SEASONS.filter((season) => {
    const range = seasonRange(year, season);
    return start <= range.end && end >= range.start;
  });
}

/** Growing seasons of each plant's first planting for one planning year; unknown plants or no frost date give none */
export function seasonsLookup(
  year: number,
  lastSpringFrost: FrostDay | null,
  plantOf: (plantId: string) => PlantTiming | undefined,
): SeasonsOf {
  return (plantId) => {
    const plant = plantOf(plantId);
    if (plant === undefined || lastSpringFrost === null) {
      return [];
    }
    const first = reachableSeasonsOf(plant, lastSpringFrost, year)[0];
    return first === undefined ? [] : growingSeasonsFrom(plant, lastSpringFrost, year, first);
  };
}
```

In `src/domain/planning/index.ts` replace the PlantCalendar export lines with:

```ts
export {
  earliestPlantingDate,
  frostDayOf,
  growingSeasonsFrom,
  plantingWindowOf,
  reachableSeasonsOf,
  seasonsLookup,
  sowingDatesOf,
} from './PlantCalendar';
export type { DateWindow, FrostDay, PlantTiming, SowingDates } from './PlantCalendar';
```

Run: `node --test src/domain/planning/PlantCalendar.test.ts` — Expected: PASS.

- [ ] **Step 5: Plant Details calendar shows the windows (test first)**

Replace `src/utils/calendarCalculations.test.ts` with:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateGrowingCalendar, splitAtYearEnd } from './calendarCalculations.ts';
import type { PlantData } from '../types/plant.types.ts';

const day = (date: Date): string => date.toISOString().slice(0, 10);
const plant = (windows: Pick<PlantData, 'indoorStartWindow' | 'transplantWindow' | 'directSowWindow'>): PlantData =>
  ({ ...windows, daysToHarvest: { min: 60, max: 85 } }) as PlantData;

describe('calculateGrowingCalendar', () => {
  test('gives each window from its first to its last day, counted from the last frost', () => {
    const calendar = calculateGrowingCalendar(
      plant({ indoorStartWindow: { fromWeeks: -8, toWeeks: -6 }, transplantWindow: { fromWeeks: 2, toWeeks: 6 }, directSowWindow: null }),
      '2026-04-15',
    );
    assert.deepEqual(calendar.indoorStart && [day(calendar.indoorStart.start), day(calendar.indoorStart.end)], ['2026-02-18', '2026-03-04']);
    assert.deepEqual(calendar.transplant && [day(calendar.transplant.start), day(calendar.transplant.end)], ['2026-04-29', '2026-05-27']);
    assert.equal(calendar.directSow, null);
  });

  test('given no valid frost date, there are no ranges', () => {
    const calendar = calculateGrowingCalendar(plant({ indoorStartWindow: null, transplantWindow: { fromWeeks: 2, toWeeks: 6 }, directSowWindow: null }), '');
    assert.deepEqual(calendar, { indoorStart: null, transplant: null, directSow: null });
  });
});

describe('splitAtYearEnd', () => {
  test('keeps a range within one year and splits one that runs into the next year', () => {
    const inYear = { start: new Date(Date.UTC(2026, 2, 1)), end: new Date(Date.UTC(2026, 4, 31)) };
    assert.deepEqual(splitAtYearEnd(inYear), [inYear]);
    const parts = splitAtYearEnd({ start: new Date(Date.UTC(2026, 10, 1)), end: new Date(Date.UTC(2027, 1, 15)) });
    assert.deepEqual(parts.map((r) => [day(r.start), day(r.end)]), [['2026-11-01', '2026-12-31'], ['2027-01-01', '2027-02-15']]);
  });
});
```

Run it — Expected: FAIL. Then in `src/utils/calendarCalculations.ts`:
- replace the import `plantingDatesOf` with `sowingDatesOf`;
- delete `addWeeks` and `createDateRange`;
- update the header comment ("Weeks relative to last spring frost" → "Sowing windows relative to the last spring frost");
- replace `calculateGrowingCalendar`'s body after the `frostDay === null` check with:

```ts
  // The same windows the season planning uses
  const dates = sowingDatesOf(plant, frostDay, Number(lastSpringFrost.slice(0, 4)));
  return {
    indoorStart: dates.indoorStart,
    transplant: dates.transplant,
    directSow: dates.directSow,
  };
```

- add after `calculateGrowingCalendar`:

```ts
/**
 * A range on the one-year timeline: a range that runs past 31 December is
 * drawn as two bars, up to the year end and from 1 January
 */
export function splitAtYearEnd(range: DateRange): DateRange[] {
  const startYear = range.start.getUTCFullYear();
  if (range.end.getUTCFullYear() === startYear) {
    return [range];
  }
  return [
    { start: range.start, end: new Date(Date.UTC(startYear, 11, 31)) },
    { start: new Date(Date.UTC(startYear + 1, 0, 1)), end: range.end },
  ];
}
```

In `GrowingCalendar.tsx`, `TimelineBar` renders one `CalendarPhaseBar` per part: replace each of the three bar blocks with the pattern

```tsx
          {calendar.indoorStart &&
            splitAtYearEnd(calendar.indoorStart).map((part) => (
              <CalendarPhaseBar key={`indoor-${part.start.getTime()}`} range={part} color={CALENDAR_COLORS.indoorStart} />
            ))}
```

(same for `transplant` and `directSow` with their colors and key prefixes), and add `splitAtYearEnd` to its import from `@/utils/calendarCalculations`. Labels (`CalendarPhaseLabel`) keep the full range.

Run: `node --test src/utils/calendarCalculations.test.ts` — Expected: PASS.

- [ ] **Step 6: Verify and commit**

Run: `npm run test:unit` and `npm run typecheck` — Expected: both pass (the current Planning keeps working through `seasonsLookup`).

```bash
git add src/types/plant.types.ts src/schemas/plantSchema.ts src/data/plants.json src/domain/planning/PlantCalendar.ts src/domain/planning/PlantCalendar.test.ts src/domain/planning/index.ts src/utils/calendarCalculations.ts src/utils/calendarCalculations.test.ts src/components/organisms/GrowingCalendar/GrowingCalendar.tsx
git commit -m "feat(catalog): sowing windows per method, shown on Plant Details

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Plantings in the domain

**Files:**
- Modify: `src/types/planning.types.ts`
- Modify: `src/schemas/planningSchema.ts` (+ `planningSchema.test.ts`)
- Modify: `src/domain/planning/PlantCalendar.ts` (add `PlantingCalendar`, `plantingCalendarFor`; remove `seasonsLookup`) (+ test)
- Modify: `src/domain/planning/Season.ts` (remove `SeasonsOf`)
- Rewrite: `src/domain/planning/Planning.ts`, `src/domain/planning/Planning.test.ts`
- Modify: `src/domain/planning/SeasonOptimization.ts` (+ test)
- Modify: `src/domain/planning/CurrentPlacements.ts` (+ test)
- Modify: `src/domain/planning/index.ts`

**Interfaces:**
- Consumes: `reachableSeasonsOf`, `growingSeasonsFrom`, `plantingWindowOf`, `PlantTiming`, `FrostDay` (Task 2).
- Produces:

```ts
// src/types/planning.types.ts
export interface PlantingData {
  readonly id: string;
  readonly plantId: string;
  readonly startSeason: Season;
  /** The growing seasons saved when the planting was placed; frost-date changes no longer alter them */
  readonly fixedSeasons?: readonly Season[];
}
// PlacementData gains: readonly plantingId: string;
// SeasonPlanData.ratios keyed by planting id
// PlanningData: { plants: readonly string[]; plantings: readonly PlantingData[]; seasons: Readonly<Record<Season, SeasonPlanData>> }

// src/domain/planning/PlantCalendar.ts
export interface PlantingCalendar {
  hasCalendar(plantId: string): boolean;
  reachableSeasons(plantId: string): readonly Season[];
  growingSeasons(plantId: string, startSeason: Season): readonly Season[];
}
export function plantingCalendarFor(year: number, lastSpringFrost: FrostDay | null, plantOf: (plantId: string) => PlantTiming | undefined): PlantingCalendar;

// src/domain/planning/Planning.ts — class Planning
static from(data: PlanningData | undefined, calendar: PlantingCalendar): Planning   // reconciles
toData(): PlanningData
plants: readonly string[]; plantings: readonly PlantingData[]
hasCalendar(plantId): boolean; reachableSeasonsOf(plantId): readonly Season[]
plantingById(id): PlantingData | undefined; plantingsOf(plantId): PlantingData[]  // in season order
plantingNumberOf(plantingId): number                                               // 1 = first in season order
growingSeasonsOf(planting): readonly Season[]
plantingsStartingIn(season): PlantingData[]; plantingsCarriedInto(season): PlantingData[]
statusOf(season); ratioOf(season, plantingId): number
placementsIn(season); placementsOf(plantingId); isPlaced(plantingId): boolean
carriedPlacementsIn(season); fixedPlacementsIn(season)
seasonsAvailableFor(plantingId): Season[]
addPlants(plantIds); removePlant(plantId); removePlanting(plantingId)
setRatio(season, plantingId, ratio); duplicatePlanting(plantingId, season); movePlanting(plantingId, season)
applyPlacement(season, placements); movePlacement; resizePatch; removePlacement; toggleLock; setAllLocked
reconciled(): Planning

// src/domain/planning/SeasonOptimization.ts
export interface PlantingShare extends PlantShare { readonly plantingId: string }  // plantId = the plant
SeasonOptimizationOutcome.shares: readonly PlantingShare[]

// src/domain/planning/CurrentPlacements.ts
placementsGrowingOn(component, date, calendarOfYear: (year: number) => PlantingCalendar): PlacementData[]
```

- [ ] **Step 1: Types and schema (test first)**

In `src/types/planning.types.ts`: add `PlantingData` (above), add `readonly plantingId: string; // The planting this placement belongs to` to `PlacementData` after `plantId`, change the `ratios` comment to "Relative share of the free area per planting id; a missing planting has ratio 1", and replace `PlanningData` with:

```ts
/** What grows in one component during one planning year */
export interface PlanningData {
  /** The plants in the planning, without amounts */
  readonly plants: readonly string[];
  /** Each time a plant is planted; at most one per plant per start season */
  readonly plantings: readonly PlantingData[];
  readonly seasons: Readonly<Record<Season, SeasonPlanData>>;
}
```

Replace `src/schemas/planningSchema.test.ts` with:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { planningDataSchema } from './planningSchema.ts';

const emptySeason = { ratios: {}, placements: [], status: 'notPlanned' };
const valid = {
  plants: ['sla'],
  plantings: [
    { id: 'sla-spring', plantId: 'sla', startSeason: 'spring', fixedSeasons: ['spring'] },
    { id: 'sla-summer', plantId: 'sla', startSeason: 'summer' },
  ],
  seasons: {
    spring: {
      ratios: { 'sla-spring': 2 },
      placements: [{ id: 'p1', plantId: 'sla', plantingId: 'sla-spring', positionX: 25, positionY: 25 }],
      status: 'planned',
    },
    summer: { ...emptySeason, ratios: { 'sla-summer': 1 } },
    autumn: emptySeason,
    winter: emptySeason,
  },
};

describe('planningDataSchema', () => {
  test('accepts a planning with plantings', () => {
    assert.ok(planningDataSchema.safeParse(valid).success);
  });

  test('rejects a placement without planting id, a planting with an unknown season, and a missing plantings list', () => {
    const { plantingId: _p, ...placement } = valid.seasons.spring.placements[0];
    assert.equal(planningDataSchema.safeParse({ ...valid, seasons: { ...valid.seasons, spring: { ...valid.seasons.spring, placements: [placement] } } }).success, false);
    assert.equal(planningDataSchema.safeParse({ ...valid, plantings: [{ id: 'x', plantId: 'sla', startSeason: 'lente' }] }).success, false);
    const { plantings: _q, ...withoutPlantings } = valid;
    assert.equal(planningDataSchema.safeParse(withoutPlantings).success, false);
  });
});
```

Run it — Expected: FAIL. In `src/schemas/planningSchema.ts`: add `plantingId: z.string().min(1),` after `plantId` in `placementDataSchema`; add

```ts
export const plantingDataSchema = z.object({
  id: z.string().min(1),
  plantId: z.string().min(1),
  startSeason: seasonSchema,
  fixedSeasons: z.array(seasonSchema).optional(),
}) satisfies z.ZodType<PlantingData>;
```

(import `PlantingData`), and add `plantings: z.array(plantingDataSchema),` after `plants` in `planningDataSchema`. Export `plantingDataSchema` from `src/schemas/index.ts`. Run the test — Expected: PASS.

- [ ] **Step 2: PlantingCalendar (test first)**

Append to `src/domain/planning/PlantCalendar.test.ts` (and remove the `seasonsLookup` describe block and import):

```ts
import { plantingCalendarFor } from './PlantCalendar.ts';

describe('plantingCalendarFor', () => {
  const catalog = new Map<string, PlantTiming>([
    ['tomaat', tomato],
    ['sla', lettuce],
    ['appel', timing({})],
  ]);
  const calendar = plantingCalendarFor(2026, frost, (id) => catalog.get(id));

  test('knows which plants have a planting window', () => {
    assert.equal(calendar.hasCalendar('sla'), true);
    assert.equal(calendar.hasCalendar('appel'), false);
    assert.equal(calendar.hasCalendar('onbekend'), false);
  });

  test('gives reachable seasons and the growing seasons per start season', () => {
    assert.deepEqual(calendar.reachableSeasons('sla'), ['spring', 'summer']);
    assert.deepEqual(calendar.growingSeasons('tomaat', 'spring'), ['spring', 'summer']);
    assert.deepEqual(calendar.growingSeasons('sla', 'summer'), ['summer']);
    assert.deepEqual(calendar.growingSeasons('sla', 'winter'), []);
  });

  test('without frost date nothing is reachable, but plants still have a calendar', () => {
    const noFrost = plantingCalendarFor(2026, null, (id) => catalog.get(id));
    assert.equal(noFrost.hasCalendar('sla'), true);
    assert.deepEqual(noFrost.reachableSeasons('sla'), []);
  });
});
```

Replace `seasonsLookup` in `PlantCalendar.ts` with:

```ts
/** What the planning needs to know about the plants' calendars in one planning year */
export interface PlantingCalendar {
  /** True when the plant has a planting window (transplant or direct sow) */
  hasCalendar(plantId: string): boolean;
  /** The seasons a planting of the plant can start in, in order */
  reachableSeasons(plantId: string): readonly Season[];
  /** The seasons a planting starting in startSeason grows in; none when that season is not reachable */
  growingSeasons(plantId: string, startSeason: Season): readonly Season[];
}

/** The planting calendar of a planning year, from the catalog and the garden's last frost */
export function plantingCalendarFor(
  year: number,
  lastSpringFrost: FrostDay | null,
  plantOf: (plantId: string) => PlantTiming | undefined,
): PlantingCalendar {
  return {
    hasCalendar: (plantId) => {
      const plant = plantOf(plantId);
      return plant !== undefined && (plant.transplantWindow !== null || plant.directSowWindow !== null);
    },
    reachableSeasons: (plantId) => {
      const plant = plantOf(plantId);
      return plant !== undefined && lastSpringFrost !== null ? reachableSeasonsOf(plant, lastSpringFrost, year) : [];
    },
    growingSeasons: (plantId, startSeason) => {
      const plant = plantOf(plantId);
      return plant !== undefined && lastSpringFrost !== null ? growingSeasonsFrom(plant, lastSpringFrost, year, startSeason) : [];
    },
  };
}
```

Remove the `SeasonsOf` import from `PlantCalendar.ts`, and delete `SeasonsOf` (type and doc comment) from `Season.ts`. Run: `node --test src/domain/planning/PlantCalendar.test.ts` — Expected: PASS.

- [ ] **Step 3: Write the failing Planning tests**

Replace `src/domain/planning/Planning.test.ts` with:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Planning } from './Planning.ts';
import type { PlantingCalendar } from './PlantCalendar.ts';
import type { PlacementData, PlanningData, Season } from '../../types/planning.types.ts';

type CalendarTable = Record<string, { reach: readonly Season[]; grow: Partial<Record<Season, readonly Season[]>> }>;

const TABLE: CalendarTable = {
  tomaat: { reach: ['spring'], grow: { spring: ['spring', 'summer'] } },
  sla: { reach: ['spring', 'summer'], grow: { spring: ['spring'], summer: ['summer'] } },
  boerenkool: { reach: ['summer', 'autumn'], grow: { summer: ['summer', 'autumn'], autumn: ['autumn'] } },
  knoflook: { reach: [], grow: {} }, // has a window, but outside this planning year
};

function calendarOf(table: CalendarTable): PlantingCalendar {
  return {
    hasCalendar: (id) => id in table,
    reachableSeasons: (id) => table[id]?.reach ?? [],
    growingSeasons: (id, season) => table[id]?.grow[season] ?? [],
  };
}
const calendar = calendarOf(TABLE);

const placement = (id: string, plantingId: string, extra: Partial<PlacementData> = {}): PlacementData => ({
  id,
  plantId: plantingId.split('-')[0],
  plantingId,
  positionX: 10,
  positionY: 10,
  ...extra,
});

const withPlants = (...plantIds: string[]): Planning => Planning.from(undefined, calendar).addPlants(plantIds);

describe('adding plants', () => {
  test('a plant with a calendar gets its first planting in its first reachable season, ratio 1', () => {
    const planning = withPlants('sla', 'boerenkool');
    assert.deepEqual(planning.plantings.map((p) => [p.id, p.startSeason]), [['sla-spring', 'spring'], ['boerenkool-summer', 'summer']]);
    assert.equal(planning.ratioOf('spring', 'sla-spring'), 1);
  });

  test('a plant without calendar or outside the year is listed without plantings; duplicates are ignored', () => {
    const planning = withPlants('appel', 'knoflook', 'appel');
    assert.deepEqual(planning.plants, ['appel', 'knoflook']);
    assert.deepEqual(planning.plantings, []);
    assert.equal(planning.hasCalendar('appel'), false);
    assert.equal(planning.hasCalendar('knoflook'), true);
  });
});

describe('carrying over', () => {
  test('a planting is carried into its later growing seasons with its placements', () => {
    const planning = withPlants('tomaat').applyPlacement('spring', [placement('t1', 'tomaat-spring')]);
    assert.deepEqual(planning.plantingsCarriedInto('summer').map((p) => p.id), ['tomaat-spring']);
    assert.deepEqual(planning.carriedPlacementsIn('summer').map((p) => p.id), ['t1']);
    assert.deepEqual(planning.fixedPlacementsIn('summer').map((p) => p.id), ['t1']);
  });
});

describe('duplicating a planting', () => {
  const placed = withPlants('sla').applyPlacement('spring', [placement('s1', 'sla-spring')]);

  test('is only possible for a placed planting, into an available season', () => {
    assert.throws(() => withPlants('sla').duplicatePlanting('sla-spring', 'summer'), /niet geplaatst/);
    assert.throws(() => placed.duplicatePlanting('sla-spring', 'autumn'), /niet beschikbaar/);
    assert.deepEqual(placed.seasonsAvailableFor('sla-spring'), ['summer']);
  });

  test('adds a second planting in that season with ratio 1, numbered 2', () => {
    const duplicated = placed.duplicatePlanting('sla-spring', 'summer');
    assert.deepEqual(duplicated.plantingsOf('sla').map((p) => [p.id, p.startSeason]), [['sla-spring', 'spring'], ['sla-summer', 'summer']]);
    assert.equal(duplicated.ratioOf('summer', 'sla-summer'), 1);
    assert.equal(duplicated.plantingNumberOf('sla-summer'), 2);
    assert.deepEqual(duplicated.seasonsAvailableFor('sla-spring'), []);
  });

  test('outdates the target season when it was planned', () => {
    const planning = withPlants('sla', 'boerenkool')
      .applyPlacement('summer', [placement('b1', 'boerenkool-summer')])
      .applyPlacement('spring', [placement('s1', 'sla-spring')]);
    assert.equal(planning.duplicatePlanting('sla-spring', 'summer').statusOf('summer'), 'outdated');
  });
});

describe('moving a planting', () => {
  const placed = withPlants('sla').applyPlacement('spring', [placement('s1', 'sla-spring')]);

  test('keeps its id, loses its placements and fixed seasons, starts at ratio 1, and outdates both seasons', () => {
    const moved = placed.setRatio('spring', 'sla-spring', 3).applyPlacement('spring', [placement('s1', 'sla-spring')]).movePlanting('sla-spring', 'summer');
    const planting = moved.plantingById('sla-spring');
    assert.deepEqual([planting?.startSeason, planting?.fixedSeasons], ['summer', undefined]);
    assert.deepEqual(moved.placementsIn('spring'), []);
    assert.equal(moved.ratioOf('summer', 'sla-spring'), 1);
    assert.equal(moved.toData().seasons.spring.ratios['sla-spring'], undefined);
    assert.equal(moved.statusOf('spring'), 'outdated');
  });

  test('can move back to an earlier season once placed again', () => {
    const inSummer = placed.movePlanting('sla-spring', 'summer').applyPlacement('summer', [placement('s2', 'sla-spring')]);
    assert.deepEqual(inSummer.seasonsAvailableFor('sla-spring'), ['spring']);
    assert.equal(inSummer.movePlanting('sla-spring', 'spring').plantingById('sla-spring')?.startSeason, 'spring');
  });

  test('a second planting created in a season whose id is taken by a moved planting gets a suffix', () => {
    const inSummer = placed.movePlanting('sla-spring', 'summer').applyPlacement('summer', [placement('s2', 'sla-spring')]);
    const duplicated = inSummer.duplicatePlanting('sla-spring', 'spring');
    assert.deepEqual(duplicated.plantingsOf('sla').map((p) => p.id), ['sla-spring-2', 'sla-spring']);
  });
});

describe('removing', () => {
  test('removing one of two plantings keeps the plant and renumbers the other', () => {
    const planning = withPlants('sla')
      .applyPlacement('spring', [placement('s1', 'sla-spring')])
      .duplicatePlanting('sla-spring', 'summer')
      .removePlanting('sla-spring');
    assert.deepEqual(planning.plants, ['sla']);
    assert.deepEqual(planning.plantings.map((p) => p.id), ['sla-summer']);
    assert.equal(planning.plantingNumberOf('sla-summer'), 1);
    assert.deepEqual(planning.placementsIn('spring'), []);
    assert.equal(planning.statusOf('spring'), 'outdated');
  });

  test('removing the last planting removes the plant', () => {
    assert.deepEqual(withPlants('sla').removePlanting('sla-spring').plants, []);
  });

  test('removing a plant removes all its plantings, ratios and placements', () => {
    const planning = withPlants('sla').applyPlacement('spring', [placement('s1', 'sla-spring')]).duplicatePlanting('sla-spring', 'summer').removePlant('sla');
    assert.deepEqual([planning.plants, planning.plantings, planning.placementsIn('spring')], [[], [], []]);
    assert.deepEqual(planning.toData().seasons.summer.ratios, {});
  });
});

describe('setRatio', () => {
  test('only for a planting starting in the season, with a whole ratio of at least 1', () => {
    const planning = withPlants('tomaat');
    assert.equal(planning.setRatio('spring', 'tomaat-spring', 2).ratioOf('spring', 'tomaat-spring'), 2);
    assert.throws(() => planning.setRatio('summer', 'tomaat-spring', 2), /start niet/);
    assert.throws(() => planning.setRatio('spring', 'tomaat-spring', 0), /Ongeldige verhouding/);
  });
});

describe('applyPlacement', () => {
  test('freezes the growing seasons of placed plantings and clears them for unplaced ones', () => {
    const planning = withPlants('tomaat', 'sla').applyPlacement('spring', [placement('t1', 'tomaat-spring')]);
    assert.deepEqual(planning.plantingById('tomaat-spring')?.fixedSeasons, ['spring', 'summer']);
    assert.equal(planning.plantingById('sla-spring')?.fixedSeasons, undefined);
    assert.equal(planning.statusOf('spring'), 'planned');
  });

  test('outdates a planned later season that the placed planting is carried into', () => {
    const planning = withPlants('tomaat', 'boerenkool')
      .applyPlacement('summer', [placement('b1', 'boerenkool-summer')])
      .applyPlacement('spring', [placement('t1', 'tomaat-spring')]);
    assert.equal(planning.statusOf('summer'), 'outdated');
  });

  test('keeps locked placements', () => {
    const planning = withPlants('sla')
      .applyPlacement('spring', [placement('locked', 'sla-spring', { locked: true }), placement('loose', 'sla-spring')])
      .applyPlacement('spring', [placement('new', 'sla-spring')]);
    assert.deepEqual(planning.placementsIn('spring').map((p) => p.id), ['locked', 'new']);
  });
});

describe('reconciling with a new calendar (frost-date change and every load)', () => {
  const placedTomato = withPlants('tomaat', 'sla').applyPlacement('spring', [placement('t1', 'tomaat-spring')]);
  // After a later frost date: tomato and lettuce only reach summer
  const later = calendarOf({
    ...TABLE,
    tomaat: { reach: ['summer'], grow: { summer: ['summer'] } },
    sla: { reach: ['summer'], grow: { summer: ['summer'] } },
  });

  test('a placed planting keeps its season, placements, fixed seasons and its season status', () => {
    const onlyTomato = withPlants('tomaat').applyPlacement('spring', [placement('t1', 'tomaat-spring')]);
    const planning = Planning.from(onlyTomato.toData(), later);
    assert.deepEqual(planning.plantingById('tomaat-spring')?.startSeason, 'spring');
    assert.deepEqual(planning.plantingById('tomaat-spring')?.fixedSeasons, ['spring', 'summer']);
    assert.deepEqual(planning.placementsIn('spring').map((p) => p.id), ['t1']);
    assert.equal(planning.statusOf('spring'), 'planned');
  });

  test('an unplaced planting moves to the first available season with ratio 1; the season it left becomes outdated', () => {
    const planning = Planning.from(placedTomato.setRatio('spring', 'sla-spring', 4).toData(), later);
    assert.deepEqual([planning.plantingById('sla-spring')?.startSeason, planning.ratioOf('summer', 'sla-spring')], ['summer', 1]);
    assert.equal(planning.toData().seasons.spring.ratios['sla-spring'], undefined);
    assert.equal(planning.statusOf('spring'), 'outdated');
  });

  test('an unplaced planting is dropped when every reachable season already has a planting of the plant', () => {
    const data: PlanningData = {
      plants: ['sla'],
      plantings: [
        { id: 'sla-spring', plantId: 'sla', startSeason: 'spring' },
        { id: 'sla-summer', plantId: 'sla', startSeason: 'summer' },
      ],
      seasons: {
        spring: { ratios: { 'sla-spring': 1 }, placements: [], status: 'notPlanned' },
        summer: { ratios: { 'sla-summer': 1 }, placements: [placement('s2', 'sla-summer')], status: 'planned' },
        autumn: { ratios: {}, placements: [], status: 'notPlanned' },
        winter: { ratios: {}, placements: [], status: 'notPlanned' },
      },
    };
    assert.deepEqual(Planning.from(data, later).plantings.map((p) => p.id), ['sla-summer']);
  });

  test('a placed planting without fixed seasons (migrated) gets them from the calendar', () => {
    const data = placedTomato.toData();
    const withoutFixed: PlanningData = { ...data, plantings: data.plantings.map(({ fixedSeasons: _f, ...p }) => p) };
    assert.deepEqual(Planning.from(withoutFixed, calendar).plantingById('tomaat-spring')?.fixedSeasons, ['spring', 'summer']);
  });

  test('a plant in the list without planting gets its first planting', () => {
    const data: PlanningData = { ...Planning.from(undefined, calendar).toData(), plants: ['boerenkool'] };
    assert.deepEqual(Planning.from(data, calendar).plantings.map((p) => p.id), ['boerenkool-summer']);
  });

  test('is idempotent: reconciling again gives the same planning and the same ids', () => {
    const once = Planning.from(placedTomato.setRatio('spring', 'sla-spring', 4).toData(), later);
    assert.equal(once.reconciled(), once);
    assert.deepEqual(Planning.from(once.toData(), later).toData(), once.toData());
  });
});

describe('changing one placement', () => {
  const planned = withPlants('tomaat', 'boerenkool')
    .applyPlacement('spring', [placement('t1', 'tomaat-spring')])
    .applyPlacement('summer', [placement('b1', 'boerenkool-summer')]);

  test('moving a carried planting outdates the later seasons it grows in, not its own season', () => {
    const moved = planned.movePlacement('spring', 't1', 50, 60);
    assert.deepEqual([moved.placementsIn('spring')[0].positionX, moved.statusOf('spring'), moved.statusOf('summer')], [50, 'planned', 'outdated']);
  });

  test('locking changes no status', () => {
    assert.equal(planned.toggleLock('spring', 't1').setAllLocked('summer', true).statusOf('summer'), 'planned');
  });
});
```

Run: `node --test src/domain/planning/Planning.test.ts` — Expected: FAIL.

- [ ] **Step 4: Implement the Planning entity**

Replace `src/domain/planning/Planning.ts` with:

```ts
import type { PlacementData, PlantingData, PlanningData, Season, SeasonPlanData, SeasonStatus } from '../../types/planning.types.ts';
import type { PlantingCalendar } from './PlantCalendar.ts';
import { SEASONS } from './Season.ts';

const EMPTY_SEASON: SeasonPlanData = { ratios: {}, placements: [], status: 'notPlanned' };
const EMPTY_DATA: PlanningData = {
  plants: [],
  plantings: [],
  seasons: { spring: EMPTY_SEASON, summer: EMPTY_SEASON, autumn: EMPTY_SEASON, winter: EMPTY_SEASON },
};

/**
 * Planning is the entity for what grows in one component during one year:
 * the plant list and its plantings. A planting starts in one season, is
 * placed there and is carried into the later seasons it grows in. A plant
 * has at most one planting per start season. Ratios and placements belong
 * to plantings. A season whose inputs change after it was placed becomes
 * outdated. Immutable: every change returns a new Planning.
 */
export class Planning {
  private readonly data: PlanningData;
  private readonly calendar: PlantingCalendar;

  private constructor(data: PlanningData, calendar: PlantingCalendar) {
    this.data = data;
    this.calendar = calendar;
  }

  /** A stored planning brought in line with the calendar (see reconciled); a year without one is empty */
  static from(data: PlanningData | undefined, calendar: PlantingCalendar): Planning {
    return new Planning(data ?? EMPTY_DATA, calendar).reconciled();
  }

  toData(): PlanningData {
    return this.data;
  }

  get plants(): readonly string[] {
    return this.data.plants;
  }

  get plantings(): readonly PlantingData[] {
    return this.data.plantings;
  }

  /** True when the plant has a planting window at all */
  hasCalendar(plantId: string): boolean {
    return this.calendar.hasCalendar(plantId);
  }

  reachableSeasonsOf(plantId: string): readonly Season[] {
    return this.calendar.reachableSeasons(plantId);
  }

  plantingById(plantingId: string): PlantingData | undefined {
    return this.data.plantings.find((p) => p.id === plantingId);
  }

  /** The plant's plantings in season order */
  plantingsOf(plantId: string): PlantingData[] {
    return this.data.plantings
      .filter((p) => p.plantId === plantId)
      .sort((a, b) => SEASONS.indexOf(a.startSeason) - SEASONS.indexOf(b.startSeason));
  }

  /** 1 for the plant's first planting in season order, 2 for the next, … (0 when unknown) */
  plantingNumberOf(plantingId: string): number {
    const planting = this.plantingById(plantingId);
    return planting === undefined ? 0 : this.plantingsOf(planting.plantId).findIndex((p) => p.id === plantingId) + 1;
  }

  /** The seasons a planting grows in: frozen while placed, else from the calendar */
  growingSeasonsOf(planting: PlantingData): readonly Season[] {
    return planting.fixedSeasons ?? this.calendar.growingSeasons(planting.plantId, planting.startSeason);
  }

  plantingsStartingIn(season: Season): PlantingData[] {
    return this.data.plantings.filter((p) => p.startSeason === season);
  }

  /** Plantings still in the ground from an earlier season */
  plantingsCarriedInto(season: Season): PlantingData[] {
    return this.data.plantings.filter((p) => p.startSeason !== season && this.growingSeasonsOf(p).includes(season));
  }

  statusOf(season: Season): SeasonStatus {
    return this.data.seasons[season].status;
  }

  ratioOf(season: Season, plantingId: string): number {
    return this.data.seasons[season].ratios[plantingId] ?? 1;
  }

  /** Placements of the plantings that start in the season */
  placementsIn(season: Season): readonly PlacementData[] {
    return this.data.seasons[season].placements;
  }

  /** A planting's placements, in its start season */
  placementsOf(plantingId: string): PlacementData[] {
    const planting = this.plantingById(plantingId);
    return planting === undefined ? [] : this.placementsIn(planting.startSeason).filter((p) => p.plantingId === plantingId);
  }

  isPlaced(plantingId: string): boolean {
    return this.placementsOf(plantingId).length > 0;
  }

  /** Placements of the plantings carried into the season, from their start season */
  carriedPlacementsIn(season: Season): PlacementData[] {
    return this.plantingsCarriedInto(season).flatMap((p) => this.placementsOf(p.id));
  }

  /** What the optimizer must leave where it is: carried placements and locked placements of the season */
  fixedPlacementsIn(season: Season): PlacementData[] {
    return [...this.carriedPlacementsIn(season), ...this.placementsIn(season).filter((p) => p.locked === true)];
  }

  /** Seasons the plant's window reaches that have no planting of the plant yet (earlier ones too) */
  seasonsAvailableFor(plantingId: string): Season[] {
    const planting = this.plantingById(plantingId);
    if (planting === undefined) {
      return [];
    }
    const taken = new Set(this.plantingsOf(planting.plantId).map((p) => p.startSeason));
    return this.calendar.reachableSeasons(planting.plantId).filter((season) => !taken.has(season));
  }

  addPlants(plantIds: readonly string[]): Planning {
    const added = plantIds.filter((id, index) => !this.data.plants.includes(id) && plantIds.indexOf(id) === index);
    let next = this.with({ plants: [...this.data.plants, ...added] });
    for (const plantId of added) {
      next = next.withFirstPlanting(plantId);
    }
    return added.length === 0 ? this : next;
  }

  removePlant(plantId: string): Planning {
    if (!this.data.plants.includes(plantId)) {
      return this;
    }
    let next: Planning = this;
    for (const planting of this.plantingsOf(plantId)) {
      next = next.withoutPlanting(planting.id);
    }
    return next.with({ plants: next.data.plants.filter((id) => id !== plantId) });
  }

  /** Removes one planting; the plant leaves the list with its last planting */
  removePlanting(plantingId: string): Planning {
    const planting = this.plantingById(plantingId);
    if (planting === undefined) {
      return this;
    }
    const next = this.withoutPlanting(plantingId);
    return next.plantingsOf(planting.plantId).length > 0
      ? next
      : next.with({ plants: next.data.plants.filter((id) => id !== planting.plantId) });
  }

  /**
   * @throws Error when the planting does not start in the season or the
   * ratio is not a whole number of at least 1
   */
  setRatio(season: Season, plantingId: string, ratio: number): Planning {
    if (!Number.isInteger(ratio) || ratio < 1) {
      throw new Error(`Ongeldige verhouding ${ratio}`);
    }
    if (this.plantingById(plantingId)?.startSeason !== season) {
      throw new Error(`${plantingId} start niet in ${season}`);
    }
    if (this.ratioOf(season, plantingId) === ratio) {
      return this;
    }
    return this.withRatio(season, plantingId, ratio).markedOutdated([season]);
  }

  /**
   * Plants the same plant again in another season, at ratio 1.
   * @throws Error when the planting is not placed or the season is not available
   */
  duplicatePlanting(plantingId: string, season: Season): Planning {
    const planting = this.placedPlanting(plantingId, season);
    return this.withNewPlanting(planting.plantId, season);
  }

  /**
   * Moves a planting to another season: its placements go, it starts at ratio 1.
   * @throws Error when the planting is not placed or the season is not available
   */
  movePlanting(plantingId: string, season: Season): Planning {
    const planting = this.placedPlanting(plantingId, season);
    return this.withoutPlanting(plantingId).withPlanting({ id: planting.id, plantId: planting.plantId, startSeason: season });
  }

  /**
   * The result of a placement run: unlocked placements are replaced, locked
   * ones stay. Placed plantings starting here keep their growing seasons
   * from now on; unplaced ones follow the calendar again.
   */
  applyPlacement(season: Season, placements: readonly PlacementData[]): Planning {
    const before = this.plantingsStartingIn(season);
    const placed = this.withSeason(season, (plan) => ({
      ...plan,
      placements: [...plan.placements.filter((p) => p.locked === true), ...placements],
      status: 'planned',
    }));
    const next = placed.with({
      plantings: placed.data.plantings.map((p) => (p.startSeason === season ? placed.withFrozenSeasons(p) : p)),
    });
    const carried = [
      ...before.flatMap((p) => this.growingSeasonsOf(p)),
      ...next.plantingsStartingIn(season).flatMap((p) => next.growingSeasonsOf(p)),
    ].filter((s) => s !== season);
    return next.markedOutdated(carried);
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
      .markedOutdated(this.laterSeasonsOf(placement.plantingId));
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
   * Brings the planning in line with the calendar, on every load and after
   * a new frost date. Placed plantings keep everything (missing fixed
   * seasons are filled in). An unplaced planting whose start season is no
   * longer reachable moves to the first available season at ratio 1, or is
   * dropped when none is left. A plant with a reachable season but no
   * planting gets its first planting. Returns this planning when nothing changes.
   */
  reconciled(): Planning {
    let next: Planning = this;
    for (const planting of this.data.plantings) {
      if (this.isPlaced(planting.id)) {
        if (planting.fixedSeasons === undefined) {
          next = next.withPlantingChanged(planting.id, (p) => next.withFrozenSeasons(p));
        }
        continue;
      }
      if (this.calendar.reachableSeasons(planting.plantId).includes(planting.startSeason)) {
        continue;
      }
      const target = next.seasonsAvailableFor(planting.id)[0];
      next = next.withoutPlanting(planting.id);
      if (target !== undefined) {
        next = next.withPlanting({ id: planting.id, plantId: planting.plantId, startSeason: target });
      }
    }
    for (const plantId of next.data.plants) {
      if (next.plantingsOf(plantId).length === 0) {
        next = next.withFirstPlanting(plantId);
      }
    }
    return next;
  }

  private with(changes: Partial<PlanningData>): Planning {
    return new Planning({ ...this.data, ...changes }, this.calendar);
  }

  private withSeason(season: Season, change: (plan: SeasonPlanData) => SeasonPlanData): Planning {
    return this.with({ seasons: { ...this.data.seasons, [season]: change(this.data.seasons[season]) } });
  }

  private withRatio(season: Season, plantingId: string, ratio: number): Planning {
    return this.withSeason(season, (plan) => ({ ...plan, ratios: { ...plan.ratios, [plantingId]: ratio } }));
  }

  private withPlantingChanged(plantingId: string, change: (planting: PlantingData) => PlantingData): Planning {
    return this.with({ plantings: this.data.plantings.map((p) => (p.id === plantingId ? change(p) : p)) });
  }

  /** A placed planting keeps the seasons it grows in now; an unplaced one follows the calendar */
  private withFrozenSeasons(planting: PlantingData): PlantingData {
    const { fixedSeasons: _previous, ...unfrozen } = planting;
    if (!this.isPlaced(planting.id)) {
      return unfrozen;
    }
    const derived = this.calendar.growingSeasons(planting.plantId, planting.startSeason);
    const seasons = derived.length > 0 ? derived : (planting.fixedSeasons ?? [planting.startSeason]);
    return { ...unfrozen, fixedSeasons: [...seasons] };
  }

  /** Adds a planting at ratio 1; its season becomes outdated if planned */
  private withPlanting(planting: PlantingData): Planning {
    return this.with({ plantings: [...this.data.plantings, planting] })
      .withRatio(planting.startSeason, planting.id, 1)
      .markedOutdated([planting.startSeason]);
  }

  private withNewPlanting(plantId: string, season: Season): Planning {
    return this.withPlanting({ id: this.newPlantingId(plantId, season), plantId, startSeason: season });
  }

  private withFirstPlanting(plantId: string): Planning {
    const season = this.calendar.reachableSeasons(plantId)[0];
    return season === undefined ? this : this.withNewPlanting(plantId, season);
  }

  /** Removes a planting with its ratio and placements; the seasons it touched become outdated */
  private withoutPlanting(plantingId: string): Planning {
    const planting = this.plantingById(plantingId);
    if (planting === undefined) {
      return this;
    }
    const touched = [planting.startSeason, ...this.growingSeasonsOf(planting)];
    return this.with({ plantings: this.data.plantings.filter((p) => p.id !== plantingId) })
      .withSeason(planting.startSeason, (plan) => {
        const { [plantingId]: _removed, ...ratios } = plan.ratios;
        return { ...plan, ratios, placements: plan.placements.filter((p) => p.plantingId !== plantingId) };
      })
      .markedOutdated(touched);
  }

  /** "<plantId>-<season>", with -2, -3, … when taken (a moved planting keeps its old id) */
  private newPlantingId(plantId: string, season: Season): string {
    const taken = new Set(this.data.plantings.map((p) => p.id));
    const base = `${plantId}-${season}`;
    let id = base;
    for (let n = 2; taken.has(id); n++) {
      id = `${base}-${n}`;
    }
    return id;
  }

  /** @throws Error when the planting is not placed or the season is not available for it */
  private placedPlanting(plantingId: string, season: Season): PlantingData {
    const planting = this.plantingById(plantingId);
    if (planting === undefined || !this.isPlaced(plantingId)) {
      throw new Error(`${plantingId} is niet geplaatst`);
    }
    if (!this.seasonsAvailableFor(plantingId).includes(season)) {
      throw new Error(`${season} is niet beschikbaar voor ${plantingId}`);
    }
    return planting;
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

  /** The seasons a planting grows in after its start season */
  private laterSeasonsOf(plantingId: string): Season[] {
    const planting = this.plantingById(plantingId);
    return planting === undefined ? [] : this.growingSeasonsOf(planting).filter((s) => s !== planting.startSeason);
  }

  private changePlacement(season: Season, placementId: string, change: (placement: PlacementData) => PlacementData): Planning {
    const placement = this.placementsIn(season).find((p) => p.id === placementId);
    if (placement === undefined) {
      return this;
    }
    return this.withSeason(season, (plan) => ({
      ...plan,
      placements: plan.placements.map((p) => (p.id === placementId ? change(p) : p)),
    })).markedOutdated(this.laterSeasonsOf(placement.plantingId));
  }
}
```

Run: `node --test src/domain/planning/Planning.test.ts` — Expected: PASS. If an expectation fails, debug the entity against the spec (§4.2) and the Global Constraints; change a test only when you can show it contradicts the spec, and say so in the report.

- [ ] **Step 5: Optimizer per planting (test first)**

In `src/domain/planning/SeasonOptimization.test.ts`: replace the `seasonsOf`/`SEASONS_BY_PLANT` fixtures with a `PlantingCalendar` (`hasCalendar: (id) => id in TABLE`, `reachableSeasons: (id) => [TABLE[id][0]] when present`, `growingSeasons: (id, s) => (TABLE[id]?.[0] === s ? TABLE[id] : [])` where `TABLE` is the old `SEASONS_BY_PLANT`), build plannings with `Planning.from(undefined, calendar).addPlants([...])`, use planting ids (`'sla-spring'`) in `setRatio` and in the locked placement (`plantingId: 'sla-spring'`), and assert `outcome.shares.map((s) => [s.plantingId, s.plantId])`. Add:

```ts
  test('places two plantings of one plant in different seasons independently, keeping the carried one fixed', () => {
    const calendar2: PlantingCalendar = {
      hasCalendar: () => true,
      reachableSeasons: (id) => (id === 'sla' ? ['spring', 'summer'] : []),
      growingSeasons: (_id, s) => (s === 'spring' ? ['spring', 'summer'] : s === 'summer' ? ['summer'] : []),
    };
    let planning = Planning.from(undefined, calendar2).addPlants(['sla']);
    planning = optimizeSeason(input(planning, 'spring')).planning;
    planning = planning.duplicatePlanting('sla-spring', 'summer');
    const summer = optimizeSeason(input(planning, 'summer')).planning;
    assert.ok(summer.placementsIn('summer').every((p) => p.plantingId === 'sla-summer' && p.plantId === 'sla'));
    assert.deepEqual(summer.carriedPlacementsIn('summer'), summer.placementsOf('sla-spring'));
    for (const own of summer.placementsIn('summer')) {
      for (const fixed of summer.carriedPlacementsIn('summer')) {
        assert.ok(!boundsOverlap(boundsOf(own), boundsOf(fixed)));
      }
    }
  });
```

(Use the file's existing `input`, `boundsOf`, `boundsOverlap` helpers; `input(planning, season)` builds `{ planning, season, areas, hasLayers, plantOf, newId }`. Import `type PlantingCalendar` from `./PlantCalendar.ts`.) Run — Expected: FAIL.

Replace the body of `optimizeSeason` and add `PlantingShare` in `src/domain/planning/SeasonOptimization.ts`:

```ts
/** A planting's share of the free area; plantId is the plant, plantingId the planting */
export interface PlantingShare extends PlantShare {
  readonly plantingId: string;
}

export interface SeasonOptimizationOutcome {
  readonly planning: Planning;
  readonly shares: readonly PlantingShare[];
}

/**
 * Optimize one season: the plantings starting in it fill the free area by
 * ratio around the carried-over and locked plantings. Unlocked placements
 * of the season are replaced. Plantings of plants missing from the catalog
 * are skipped. fillByRatio sees planting ids as its plant ids, so two
 * plantings of one plant are placed independently; relations still use the plant.
 */
export function optimizeSeason(input: SeasonOptimizationInput): SeasonOptimizationOutcome {
  const { planning, season, plantOf } = input;
  const plantIdOf = new Map(planning.plantings.map((p) => [p.id, p.plantId]));
  const plantOfPlanting = (plantingId: string): string => plantIdOf.get(plantingId) ?? plantingId;
  const catalogRelations = relationsFromCatalog(planning.plants.flatMap((plantId) => plantOf(plantId) ?? []));

  const fixed = planning.fixedPlacementsIn(season).map((placement) => ({
    plantId: placement.plantingId,
    layerIndex: placement.layerIndex ?? 0,
    footprint: footprintOf(plantOf(placement.plantId), placement),
    xCm: placement.positionX,
    yCm: placement.positionY,
  }));
  const plantings = planning.plantingsStartingIn(season).flatMap((planting) => {
    const plant = plantOf(planting.plantId);
    return plant === undefined ? [] : [{ plantId: planting.id, ratio: planning.ratioOf(season, planting.id), traits: plant }];
  });

  const result = fillByRatio({
    layers: input.areas,
    fixed,
    plants: plantings,
    relations: (a, b) => catalogRelations(plantOfPlanting(a), plantOfPlanting(b)),
  });

  const placements = result.placements.map((placed): PlacementData => ({
    id: input.newId(),
    plantId: plantOfPlanting(placed.plantId),
    plantingId: placed.plantId,
    positionX: placed.xCm,
    positionY: placed.yCm,
    ...(input.hasLayers ? { layerIndex: placed.layerIndex } : {}),
    ...(placed.patch !== undefined
      ? { patchWidthInCm: placed.patch.widthCm, patchHeightInCm: placed.patch.heightCm, patchRotationDeg: placed.patch.rotationDeg }
      : {}),
  }));

  return {
    planning: planning.applyPlacement(season, placements),
    shares: result.shares.map((share) => ({ ...share, plantingId: share.plantId, plantId: plantOfPlanting(share.plantId) })),
  };
}
```

Run: `node --test src/domain/planning/SeasonOptimization.test.ts` — Expected: PASS.

- [ ] **Step 6: CurrentPlacements**

In `src/domain/planning/CurrentPlacements.ts` replace `SeasonsOf` with `PlantingCalendar` (`import type { PlantingCalendar } from './PlantCalendar.ts';`), rename the parameter to `calendarOfYear: (year: number) => PlantingCalendar`, and call `Planning.from(component.plannings[String(year)], calendarOfYear(year))`. In its test, build the planning with a `PlantingCalendar` fixture (tomaat: reach `['spring']`, grows `['spring','summer']`; boerenkool: reach `['summer']`, grows `['summer']`), placements with `plantingId` `'tomaat-spring'` / `'boerenkool-summer'`, and pass `() => calendar`. Expected assertions stay the same.

- [ ] **Step 7: Exports, other domain tests, verify, commit**

`src/domain/planning/index.ts`: remove `SeasonsOf` and `seasonsLookup`; export `plantingCalendarFor` and `type PlantingCalendar` from `./PlantCalendar`, and `type PlantingShare` from `./SeasonOptimization`.

Run: `npm run test:unit` — Expected: PASS (fix any remaining domain test that builds `PlanningData` without `plantings` or placements without `plantingId`).
Run: `npm run typecheck` — Expected: errors only in `src/stores/componentStore.ts`, `src/stores/planningContext.ts`, `src/stores/planningStore.ts`, `src/stores/migrations/componentStoreMigrations.ts`, `src/hooks/ai/useAiChat.ts`, `src/screens/**`, `src/types/planningViews.types.ts` consumers (Tasks 4–5).

```bash
git add src/types/planning.types.ts src/schemas/planningSchema.ts src/schemas/planningSchema.test.ts src/schemas/index.ts src/domain/planning/PlantCalendar.ts src/domain/planning/PlantCalendar.test.ts src/domain/planning/Season.ts src/domain/planning/Planning.ts src/domain/planning/Planning.test.ts src/domain/planning/SeasonOptimization.ts src/domain/planning/SeasonOptimization.test.ts src/domain/planning/CurrentPlacements.ts src/domain/planning/CurrentPlacements.test.ts src/domain/planning/index.ts
git commit -m "feat(planning)!: plantings with their own start season

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Storage v5, store actions and planning context

**Files:**
- Modify: `src/stores/migrations/componentStoreMigrations.ts` (+ test)
- Modify: `src/stores/planningContext.ts`
- Modify: `src/stores/componentStore.ts`
- Modify: `src/stores/planningStore.ts` (+ test)
- Modify: `src/hooks/ai/useAiChat.ts`

**Interfaces:**
- Consumes: `Planning`, `PlantingCalendar`, `plantingCalendarFor`, `PlantingShare`, `plantingDataSchema`, `placementDataSchema` (Task 3).
- Produces:
  - `COMPONENT_STORE_VERSION = 5`
  - `plantingCalendarOfYear(year): PlantingCalendar`, `usePlantingCalendar(year): PlantingCalendar`, `usePlanning(component, year)`, `useCurrentPlacementsById(components)` (planningContext)
  - store actions: `setRatio(componentId, year, season, plantingId, ratio)`, `duplicatePlanting(componentId, year, plantingId, season)`, `movePlanting(componentId, year, plantingId, season)`, `removePlanting(componentId, year, plantingId)`, `optimizeSeason(...) → readonly PlantingShare[] | null`; others unchanged
  - `usePlanningStore`: `lastShares: Record<string, readonly PlantingShare[]>`, `setLastShares(key, shares: readonly PlantingShare[])`, `sharesOf(key): readonly PlantingShare[] | undefined`

- [ ] **Step 1: Migration tests**

Replace the v4-specific tests in `src/stores/migrations/componentStoreMigrations.test.ts` (keep the v1, v3, garbage and merge tests; update the expected version to 5) and add:

```ts
const emptySeason = { ratios: {}, placements: [], status: 'notPlanned' };

describe('migrating a v4 planning to plantings', () => {
  test('each plant with a ratio or placements in a season becomes a planting of that season', () => {
    const v4 = {
      plants: ['sla', 'tomaat'],
      seasons: {
        spring: {
          ratios: { sla: 2 },
          placements: [{ id: 'p1', plantId: 'sla', positionX: 1, positionY: 1 }, { id: 'p2', plantId: 'tomaat', positionX: 5, positionY: 5 }],
          status: 'planned',
        },
        summer: { ratios: { sla: 1 }, placements: [], status: 'notPlanned' },
        autumn: emptySeason,
        winter: emptySeason,
      },
    };
    const [component] = migrateComponentState({ components: [{ id: 'c1', plannings: { '2026': v4 } }] }, 4).components;
    const planning = component.plannings['2026'];
    assert.deepEqual(planning.plantings, [
      { id: 'sla-spring', plantId: 'sla', startSeason: 'spring' },
      { id: 'tomaat-spring', plantId: 'tomaat', startSeason: 'spring' },
      { id: 'sla-summer', plantId: 'sla', startSeason: 'summer' },
    ]);
    assert.deepEqual(planning.seasons.spring.ratios, { 'sla-spring': 2 });
    assert.deepEqual(planning.seasons.spring.placements.map((p) => p.plantingId), ['sla-spring', 'tomaat-spring']);
    assert.deepEqual(planning.seasons.summer.ratios, { 'sla-summer': 1 });
    assert.equal(planning.seasons.spring.status, 'planned');
  });

  test('a ratio of a plant missing from the plant list still becomes a planting and the plant joins the list', () => {
    const v4 = { plants: [], seasons: { spring: { ratios: { sla: 1 }, placements: [], status: 'notPlanned' }, summer: emptySeason, autumn: emptySeason, winter: emptySeason } };
    const planning = migrateComponentState({ components: [{ id: 'c1', plannings: { '2026': v4 } }] }, 4).components[0].plannings['2026'];
    assert.deepEqual(planning.plants, ['sla']);
    assert.deepEqual(planning.plantings.map((p) => p.id), ['sla-spring']);
  });
});

describe('salvaging a v5 planning', () => {
  const v5 = {
    plants: ['sla'],
    plantings: [{ id: 'sla-spring', plantId: 'sla', startSeason: 'spring', fixedSeasons: ['spring'] }],
    seasons: {
      spring: {
        ratios: { 'sla-spring': 2, ghost: 1 },
        placements: [
          { id: 'p1', plantId: 'sla', plantingId: 'sla-spring', positionX: 1, positionY: 1 },
          { id: 'p2', plantId: 'sla', plantingId: 'ghost', positionX: 2, positionY: 2 },
        ],
        status: 'planned',
      },
      summer: emptySeason,
      autumn: emptySeason,
      winter: emptySeason,
    },
  };

  test('keeps valid plantings, drops ratios and placements of unknown plantings and outdates that season', () => {
    const planning = migrateComponentState({ components: [{ id: 'c1', plannings: { '2026': v5 } }] }, 5).components[0].plannings['2026'];
    assert.deepEqual(planning.plantings, v5.plantings);
    assert.deepEqual(planning.seasons.spring.ratios, { 'sla-spring': 2 });
    assert.deepEqual(planning.seasons.spring.placements.map((p) => p.id), ['p1']);
    assert.equal(planning.seasons.spring.status, 'outdated');
  });

  test('drops an invalid planting entry', () => {
    const bad = { ...v5, plantings: [...v5.plantings, { id: 'x', plantId: 'sla', startSeason: 'lente' }] };
    const planning = migrateComponentState({ components: [{ id: 'c1', plannings: { '2026': bad } }] }, 5).components[0].plannings['2026'];
    assert.deepEqual(planning.plantings.map((p) => p.id), ['sla-spring']);
  });
});
```

Run — Expected: FAIL.

- [ ] **Step 2: Implement migration v5**

In `src/stores/migrations/componentStoreMigrations.ts`:
- import `plantingDataSchema` alongside `placementDataSchema`, and type `PlantingData`;
- set `COMPONENT_STORE_VERSION = 5` and add to the version comment: `Version 5: plants have plantings (one per start season); ratios and placements belong to plantings. v4 plannings are converted.`;
- replace `salvageSeason` and `salvagePlanning` with:

```ts
interface SalvagedSeason {
  readonly plan: SeasonPlanData;
  readonly droppedAny: boolean;
}

/** Valid ratios (whole, ≥ 1) of known plantings and valid placements of known plantings */
function salvageSeason(value: unknown, knownPlanting: (plantingId: string) => boolean): SalvagedSeason {
  if (!isRecord(value)) {
    return { plan: EMPTY_SEASON, droppedAny: false };
  }
  const ratioEntries = isRecord(value.ratios) ? Object.entries(value.ratios) : [];
  const ratios = Object.fromEntries(
    ratioEntries.filter(([id, ratio]) => knownPlanting(id) && Number.isInteger(ratio) && (ratio as number) >= 1),
  ) as Record<string, number>;
  const placementEntries = Array.isArray(value.placements) ? value.placements : [];
  const placements: PlacementData[] = placementEntries.flatMap((entry) => {
    const parsed = placementDataSchema.safeParse(entry);
    return parsed.success && knownPlanting(parsed.data.plantingId) ? [parsed.data] : [];
  });
  const status = STATUSES.find((candidate) => candidate === value.status) ?? 'notPlanned';
  const droppedAny = Object.keys(ratios).length < ratioEntries.length || placements.length < placementEntries.length;
  return { plan: { ratios, placements, status: droppedAny && status === 'planned' ? 'outdated' : status }, droppedAny };
}

/**
 * A v4 planning keyed ratios and placements by plant id per season: each
 * plant with a ratio or placements in season S becomes planting "<plantId>-<S>".
 */
function withPlantingsFromV4(value: Record<string, unknown>, plants: string[]): Record<string, unknown> {
  const seasons = isRecord(value.seasons) ? value.seasons : {};
  const plantings: PlantingData[] = [];
  const converted: Record<string, unknown> = {};
  for (const season of SEASONS) {
    const plan = isRecord(seasons[season]) ? seasons[season] : {};
    const ratios = isRecord(plan.ratios) ? plan.ratios : {};
    const placements = Array.isArray(plan.placements) ? plan.placements.filter(isRecord) : [];
    const plantIds = [...new Set([...Object.keys(ratios), ...placements.map((p) => p.plantId).filter((id): id is string => typeof id === 'string')])];
    for (const plantId of plantIds) {
      plantings.push({ id: `${plantId}-${season}`, plantId, startSeason: season });
      if (!plants.includes(plantId)) plants.push(plantId);
    }
    converted[season] = {
      ...plan,
      ratios: Object.fromEntries(Object.entries(ratios).map(([plantId, ratio]) => [`${plantId}-${season}`, ratio])),
      placements: placements.map((p) => ({ ...p, plantingId: `${String(p.plantId)}-${season}` })),
    };
  }
  return { ...value, plantings, seasons: converted };
}

/** Salvages one year: null when it has no usable plants list or seasons */
function salvagePlanning(value: unknown): PlanningData | null {
  if (!isRecord(value) || !Array.isArray(value.plants) || !isRecord(value.seasons)) {
    return null;
  }
  const plants = value.plants.filter((plant): plant is string => typeof plant === 'string' && plant.length > 0);
  const droppedPlant = plants.length < value.plants.length;
  const current = Array.isArray(value.plantings) ? value : withPlantingsFromV4(value, plants);
  const plantingEntries = Array.isArray(current.plantings) ? current.plantings : [];
  const plantings: PlantingData[] = plantingEntries.flatMap((entry) => {
    const parsed = plantingDataSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
  const known = new Set(plantings.map((p) => p.id));
  const seasons = isRecord(current.seasons) ? current.seasons : {};
  const salvaged = SEASONS.map((season) => salvageSeason(seasons[season], (id) => known.has(id)).plan);
  const outdateAll = droppedPlant || plantings.length < plantingEntries.length;
  const [spring, summer, autumn, winter] = outdateAll
    ? salvaged.map((season) => (season.status === 'planned' ? { ...season, status: 'outdated' as const } : season))
    : salvaged;
  return { plants, plantings, seasons: { spring, summer, autumn, winter } };
}
```

Run: `node --test src/stores/migrations/componentStoreMigrations.test.ts` — Expected: PASS.

- [ ] **Step 3: Planning context**

Replace `src/stores/planningContext.ts` with:

```ts
import { useMemo } from 'react';
import { Planning, frostDayOf, placementsGrowingOn, plantingCalendarFor } from '@/domain/planning';
import type { PlantingCalendar } from '@/domain/planning';
import type { ComponentData, PlacedPlantData } from '@/types';
import { useEnvironmentStore } from './environmentStore';
import { usePlantStore } from './plantStore';

/** The planting calendar of a planning year, from the catalog and the garden's last frost (outside React) */
export function plantingCalendarOfYear(year: number): PlantingCalendar {
  return plantingCalendarFor(year, frostDayOf(useEnvironmentStore.getState().lastSpringFrost), (plantId) =>
    usePlantStore.getState().getPlantById(plantId),
  );
}

/** Same as plantingCalendarOfYear, re-computed when the frost date or the catalog changes */
export function usePlantingCalendar(year: number): PlantingCalendar {
  const lastSpringFrost = useEnvironmentStore((state) => state.lastSpringFrost);
  const getPlantById = usePlantStore((state) => state.getPlantById);
  return useMemo(() => plantingCalendarFor(year, frostDayOf(lastSpringFrost), getPlantById), [year, lastSpringFrost, getPlantById]);
}

/** The component's planning of a year; null without a component */
export function usePlanning(component: ComponentData | undefined, year: number): Planning | null {
  const calendar = usePlantingCalendar(year);
  const data = component?.plannings[String(year)];
  return useMemo(() => (component ? Planning.from(data, calendar) : null), [component, data, calendar]);
}

/** What grows today in each component, by component id */
export function useCurrentPlacementsById(components: readonly ComponentData[]): ReadonlyMap<string, readonly PlacedPlantData[]> {
  const lastSpringFrost = useEnvironmentStore((state) => state.lastSpringFrost);
  const getPlantById = usePlantStore((state) => state.getPlantById);
  return useMemo(() => {
    const today = new Date();
    const calendarOfYear = (year: number): PlantingCalendar => plantingCalendarFor(year, frostDayOf(lastSpringFrost), getPlantById);
    return new Map(components.map((component) => [component.id, placementsGrowingOn(component, today, calendarOfYear)]));
  }, [components, lastSpringFrost, getPlantById]);
}
```

In `src/hooks/ai/useAiChat.ts` replace the `seasonsOfYear` import and use with `plantingCalendarOfYear`.

- [ ] **Step 4: Planning store shares per planting**

In `src/stores/planningStore.ts` change the share type import to `import type { PlantingShare } from '../domain/planning/SeasonOptimization.ts';` and every `PlantShare` to `PlantingShare`. In `planningStore.test.ts` add `plantingId: 'sla-spring'` to the share fixture. Run `node --test src/stores/planningStore.test.ts` — Expected: PASS.

- [ ] **Step 5: Store actions**

In `src/stores/componentStore.ts`:
- replace `import { seasonsOfYear } from './planningContext';` with `import { plantingCalendarOfYear } from './planningContext';`, and `PlantShare` with `PlantingShare` in the type import;
- `planningOf` becomes `return Planning.from(component.plannings[String(year)], plantingCalendarOfYear(year));`;
- in `ComponentState` change `setRatio`'s `plantId` parameter to `plantingId`, `optimizeSeason`'s return type to `readonly PlantingShare[] | null`, and add:

```ts
  /** Plants a placed planting again in another available season, at ratio 1 */
  duplicatePlanting: (componentId: string, year: number, plantingId: string, season: Season) => void;
  /** Moves a placed planting to another available season; its placements go */
  movePlanting: (componentId: string, year: number, plantingId: string, season: Season) => void;
  /** Removes one planting; the plant leaves the planning with its last planting */
  removePlanting: (componentId: string, year: number, plantingId: string) => void;
```

- implement them next to `setRatio`:

```ts
      setRatio: (componentId, year, season, plantingId, ratio) => {
        set((state) => ({ components: withPlanning(state.components, componentId, year, (p) => p.setRatio(season, plantingId, ratio)) }));
      },

      duplicatePlanting: (componentId, year, plantingId, season) => {
        set((state) => ({ components: withPlanning(state.components, componentId, year, (p) => p.duplicatePlanting(plantingId, season)) }));
      },

      movePlanting: (componentId, year, plantingId, season) => {
        set((state) => ({ components: withPlanning(state.components, componentId, year, (p) => p.movePlanting(plantingId, season)) }));
      },

      removePlanting: (componentId, year, plantingId) => {
        set((state) => ({ components: withPlanning(state.components, componentId, year, (p) => p.removePlanting(plantingId)) }));
      },
```

- `reconcilePlannings` stays as is (`Planning.from` already reconciles; the action persists the result);
- add the three new actions to `useComponentActions`.

Note: `withPlanning` compares `next === current`; since `Planning.from` may reconcile, the first change after a frost-date change also persists the reconciled data — intended.

- [ ] **Step 6: Verify and commit**

Run: `npm run test:unit` — Expected: PASS.
Run: `npm run typecheck` — Expected: errors only in `src/screens/**` and the view models/types Task 5 rewrites.

```bash
git add src/stores/migrations/componentStoreMigrations.ts src/stores/migrations/componentStoreMigrations.test.ts src/stores/planningContext.ts src/stores/componentStore.ts src/stores/planningStore.ts src/stores/planningStore.test.ts src/hooks/ai/useAiChat.ts
git commit -m "feat(planning)!: store plantings (v5) with duplicate, move and remove actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Screens — planting rows, actions menu, labels

**Files:**
- Modify: `src/types/planningViews.types.ts`
- Modify: `src/screens/PlanningScreen/planningScreenViewModel.ts` (+ test)
- Modify: `src/screens/PlanningScreen/PlanningScreen.tsx`
- Modify: `src/components/organisms/SeasonPlanSection/SeasonPlanSection.tsx`
- Create: `src/components/atoms/PlantingRowMenuButton/{PlantingRowMenuButton.tsx,index.ts}`
- Create: `src/components/organisms/PlantingActionsSheet/{PlantingActionsSheet.tsx,index.ts}`
- Modify: `src/screens/ComponentDetailScreen/{ComponentDetailScreen.tsx,seasonViewModel.ts,seasonViewModel.test.ts}`
- Modify: `src/components/atoms/index.ts`, `src/components/organisms/index.ts`
- Modify: `src/i18n/nl.json`, `src/styles/planning/season.css`

**Interfaces:**
- Consumes: Planning API and store actions (Tasks 3–4), `PlantingShare`.
- Produces:

```ts
// src/types/planningViews.types.ts
export interface PlantingMenuItemView { readonly key: string; readonly label: string; readonly kind: 'duplicate' | 'move' | 'remove'; readonly season: Season; readonly testID: string }
export interface PlantingMenuView { readonly isPlaced: boolean; readonly isLastPlanting: boolean; readonly items: readonly PlantingMenuItemView[] }
export interface RatioRowView { plantingId; plantId; name; ratio; targetLabel; resultLabel: string | null; fits; menu: PlantingMenuView }
export interface CarriedRowView { plantingId; plantId; name; label }
// SeasonSectionView unchanged otherwise
// planningScreenViewModel.ts
export interface PlantListItemView { plantId; name; detail: string; detailKind: 'plantings' | 'noCalendar' | 'outsideYear' }
export function plantingName(planning, plantingId, nameOf, t): string
```

- [ ] **Step 1: Strings**

Add to `"seasonPlanning"` in `src/i18n/nl.json` (keep indentation/line endings; validate with `node -e "JSON.parse(require('fs').readFileSync('src/i18n/nl.json','utf8'))"`):

```json
    "outsideYear": "valt buiten dit planningsjaar",
    "plantingNumber": "{{name}} ({{number}}e teelt)",
    "menuButton": "Acties voor {{name}}",
    "menuTitle": "{{name}} — {{season}}",
    "duplicateTo": "Ook planten in {{season}}",
    "moveTo": "Verplaatsen naar {{season}}",
    "removeFrom": "Verwijderen uit {{season}}",
    "notPlacedHint": "Optimaliseer eerst dit seizoen om te dupliceren of te verplaatsen.",
    "moveTitle": "{{name}} verplaatsen naar {{season}}?",
    "moveMessage": "De plaatsingen van {{name}} in {{from}} worden verwijderd.",
    "moveConfirm": "Verplaatsen",
    "removePlantingTitle": "{{name}} verwijderen uit {{season}}?",
    "removePlantingMessage": "De plaatsingen van {{name}} in {{season}} worden verwijderd.",
    "removeLastPlantingMessage": "{{name}} wordt uit de planning verwijderd."
```

- [ ] **Step 2: View model tests**

Replace `src/screens/PlanningScreen/planningScreenViewModel.test.ts` with:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlantList, buildSeasonSections, plantingName } from './planningScreenViewModel.ts';
import { Planning } from '../../domain/planning/Planning.ts';
import type { PlantingCalendar } from '../../domain/planning/PlantCalendar.ts';
import type { PlacementData, Season } from '../../types/planning.types.ts';

const t = (key: string, options?: Record<string, unknown>): string => (options ? `${key} ${JSON.stringify(options)}` : key);
const nameOf = (id: string): string => id.toUpperCase();
const REACH: Record<string, readonly Season[]> = { sla: ['spring', 'summer'], tomaat: ['spring'], knoflook: [] };
const GROW: Record<string, readonly Season[]> = { 'sla:spring': ['spring'], 'sla:summer': ['summer'], 'tomaat:spring': ['spring', 'summer'] };
const calendar: PlantingCalendar = {
  hasCalendar: (id) => id in REACH,
  reachableSeasons: (id) => REACH[id] ?? [],
  growingSeasons: (id, s) => GROW[`${id}:${s}`] ?? [],
};
const placement = (id: string, plantingId: string): PlacementData => ({ id, plantId: plantingId.split('-')[0], plantingId, positionX: 1, positionY: 1 });
const base = Planning.from(undefined, calendar).addPlants(['tomaat', 'sla', 'knoflook', 'appel']);
const placedSla = base.applyPlacement('spring', [placement('s1', 'sla-spring'), placement('t1', 'tomaat-spring')]);
const twoSla = placedSla.duplicatePlanting('sla-spring', 'summer');

describe('buildPlantList', () => {
  test('lists plantings by season, numbering extra ones, and flags plants without plantings', () => {
    assert.deepEqual(buildPlantList(twoSla, nameOf, t).map((i) => [i.plantId, i.detailKind, i.detail]), [
      ['tomaat', 'plantings', 'season.spring'],
      ['sla', 'plantings', 'season.spring · season.summer (2e)'],
      ['knoflook', 'outsideYear', 'seasonPlanning.outsideYear'],
      ['appel', 'noCalendar', 'seasonPlanning.noCalendar'],
    ]);
  });
});

describe('plantingName', () => {
  test('the first planting is the plant name, later ones are numbered', () => {
    assert.equal(plantingName(twoSla, 'sla-spring', nameOf, t), 'SLA');
    assert.equal(plantingName(twoSla, 'sla-summer', nameOf, t), 'seasonPlanning.plantingNumber {"name":"SLA","number":2}');
  });

  test('after removing the first planting, the remaining one is not numbered', () => {
    assert.equal(plantingName(twoSla.removePlanting('sla-spring'), 'sla-summer', nameOf, t), 'SLA');
  });
});

describe('buildSeasonSections', () => {
  test('gives one row per planting starting in the season, with target percent', () => {
    const [spring, summer] = buildSeasonSections(twoSla, nameOf, () => undefined, t);
    assert.deepEqual(spring.ratioRows.map((r) => [r.plantingId, r.targetLabel]), [
      ['tomaat-spring', 'seasonPlanning.target {"percent":50}'],
      ['sla-spring', 'seasonPlanning.target {"percent":50}'],
    ]);
    assert.deepEqual(summer.ratioRows.map((r) => [r.plantingId, r.name]), [['sla-summer', 'seasonPlanning.plantingNumber {"name":"SLA","number":2}']]);
    assert.deepEqual(summer.carriedRows.map((r) => r.plantingId), ['tomaat-spring']);
  });

  test('a placed planting offers duplicate and move to available seasons and remove; an unplaced one only remove', () => {
    const [springPlaced] = buildSeasonSections(placedSla, nameOf, () => undefined, t);
    const sla = springPlaced.ratioRows.find((r) => r.plantingId === 'sla-spring');
    assert.deepEqual(sla?.menu.items.map((i) => [i.kind, i.season, i.testID]), [
      ['duplicate', 'summer', 'planting-action-duplicate-summer'],
      ['move', 'summer', 'planting-action-move-summer'],
      ['remove', 'spring', 'planting-action-remove'],
    ]);
    assert.deepEqual([sla?.menu.isPlaced, sla?.menu.isLastPlanting], [true, true]);
    const [springBase] = buildSeasonSections(base, nameOf, () => undefined, t);
    assert.deepEqual(springBase.ratioRows.find((r) => r.plantingId === 'sla-spring')?.menu.items.map((i) => i.kind), ['remove']);
  });

  test('shows results only for a planned season, matched by planting', () => {
    const shares = [{ plantId: 'sla', plantingId: 'sla-spring', count: 3, actualShare: 0.5, targetShare: 0.5 }];
    const [spring] = buildSeasonSections(placedSla, nameOf, (s) => (s === 'spring' ? shares : undefined), t);
    assert.equal(spring.ratioRows.find((r) => r.plantingId === 'sla-spring')?.resultLabel, 'seasonPlanning.result {"count":3,"actual":50,"target":50}');
  });
});
```

Run — Expected: FAIL.

- [ ] **Step 3: View types and view model**

Replace `RatioRowView` and `CarriedRowView` in `src/types/planningViews.types.ts` with the Interfaces above (each field documented as before), and add `PlantingMenuItemView` and `PlantingMenuView`.

Replace `src/screens/PlanningScreen/planningScreenViewModel.ts` with:

```ts
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
  /** "Lente · Zomer (2e)", or the reason the plant has no plantings */
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
        .map((p, index) => (index === 0 ? seasonLabel(p.startSeason, t) : `${seasonLabel(p.startSeason, t)} (${index + 1}e)`))
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
```

Run: `node --test src/screens/PlanningScreen/planningScreenViewModel.test.ts` — Expected: PASS.

- [ ] **Step 4: Menu button atom and actions sheet organism**

Create `src/components/atoms/PlantingRowMenuButton/PlantingRowMenuButton.tsx`:

```tsx
import React from 'react';
import { Pressable, Text } from 'react-native';

interface PlantingRowMenuButtonProps {
  accessibilityLabel: string;
  onPress: () => void;
  testID: string;
}

/**
 * ⋯ button of a planting row, a 48 dp touch target.
 * BEM contract (src/styles/planning/season.css): .planting-menu-button, __icon
 */
export function PlantingRowMenuButton({ accessibilityLabel, onPress, testID }: PlantingRowMenuButtonProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      className="w-12 h-12 items-center justify-center"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Text className="text-gray-300 text-xl">⋯</Text>
    </Pressable>
  );
}
```

with `index.ts` `export { PlantingRowMenuButton } from './PlantingRowMenuButton';` and the same line in `src/components/atoms/index.ts`.

Create `src/components/organisms/PlantingActionsSheet/PlantingActionsSheet.tsx`:

```tsx
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import type { PlantingMenuItemView } from '@/types';

interface PlantingActionsSheetProps {
  visible: boolean;
  title: string;
  items: readonly PlantingMenuItemView[];
  /** Shown above the items, e.g. why duplicate and move are missing */
  hint?: string;
  cancelLabel: string;
  onSelect: (item: PlantingMenuItemView) => void;
  onClose: () => void;
}

/**
 * Bottom sheet with the actions of one planting.
 * BEM contract (src/styles/planning/season.css): .planting-sheet, __backdrop, __panel, __title, __hint, __item, __item--destructive
 */
export function PlantingActionsSheet({ visible, title, items, hint, cancelLabel, onSelect, onClose }: PlantingActionsSheetProps): React.JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose} accessibilityRole="button" accessibilityLabel={cancelLabel}>
        <Pressable className="bg-gray-900 rounded-t-2xl pb-6" onPress={() => undefined} testID="planting-actions-sheet">
          <Text className="text-white font-semibold px-4 pt-4 pb-2">{title}</Text>
          {hint !== undefined && <Text className="text-gray-400 px-4 pb-2" testID="planting-actions-hint">{hint}</Text>}
          {items.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item)}
              className="h-12 px-4 justify-center border-t border-gray-800"
              accessibilityRole="button"
              testID={item.testID}
            >
              <Text className={item.kind === 'remove' ? 'text-error' : 'text-white'}>{item.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} className="h-12 px-4 justify-center border-t border-gray-800" accessibilityRole="button">
            <Text className="text-gray-400">{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
```

with `index.ts` and the barrel line in `src/components/organisms/index.ts`. Append to `src/styles/planning/season.css`:

```css
/* ⋯ on a planting row */
.planting-menu-button {
  @apply w-12 h-12 items-center justify-center;
}
.planting-menu-button__icon {
  @apply text-gray-300 text-xl;
}

/* Bottom sheet with a planting's actions */
.planting-sheet__backdrop {
  @apply flex-1 bg-black/50 justify-end;
}
.planting-sheet__panel {
  @apply bg-gray-900 rounded-t-2xl pb-6;
}
.planting-sheet__title {
  @apply text-white font-semibold px-4 pt-4 pb-2;
}
.planting-sheet__hint {
  @apply text-gray-400 px-4 pb-2;
}
.planting-sheet__item {
  @apply h-12 px-4 justify-center border-t border-gray-800;
}
.planting-sheet__item--destructive {
  @apply text-error;
}
```

- [ ] **Step 5: SeasonPlanSection**

In `SeasonPlanSection.tsx`:
- props: `onRatioChange: (plantingId: string, ratio: number) => void;` and add `onOpenMenu: (row: RatioRowView) => void;` (import `RatioRowView` from `@/types`);
- ratio rows: `key={row.plantingId}`, keep `testID={`ratio-row-${view.season}-${row.plantId}`}` and the stepper `testID={`ratio-${view.season}-${row.plantId}`}` (one planting per plant per season keeps them unique), `onChange={(ratio) => onRatioChange(row.plantingId, ratio)}`, and add after the stepper:

```tsx
            <PlantingRowMenuButton
              accessibilityLabel={t('seasonPlanning.menuButton', { name: row.name })}
              onPress={() => onOpenMenu(row)}
              testID={`planting-menu-${view.season}-${row.plantId}`}
            />
```

- carried rows: `key={row.plantingId}` (testID unchanged).

- [ ] **Step 6: Planning screen**

In `PlanningScreen.tsx`:
- plant list detail line: `<Text className={`text-xs ${item.detailKind === 'plantings' ? 'text-gray-400' : 'text-orange-400'}`}>{item.detail}</Text>`;
- store actions: add `duplicatePlanting`, `movePlanting`, `removePlanting` selectors;
- state: `const [menuFor, setMenuFor] = useState<{ season: Season; row: RatioRowView } | null>(null);`
- `SeasonPlanSection` gets `onOpenMenu={(row) => setMenuFor({ season: view.season, row })}`;
- handler:

```tsx
  const handleMenuSelect = useCallback(
    (item: PlantingMenuItemView) => {
      if (!menuFor) return;
      const { row, season } = menuFor;
      setMenuFor(null);
      const lower = (s: Season) => t(`season.${s}`).toLowerCase();
      if (item.kind === 'duplicate') {
        duplicatePlanting(componentId, year, row.plantingId, item.season);
        return;
      }
      if (item.kind === 'move') {
        Alert.alert(
          t('seasonPlanning.moveTitle', { name: row.name, season: lower(item.season) }),
          t('seasonPlanning.moveMessage', { name: row.name, from: lower(season) }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('seasonPlanning.moveConfirm'), onPress: () => movePlanting(componentId, year, row.plantingId, item.season) },
          ],
        );
        return;
      }
      Alert.alert(
        t('seasonPlanning.removePlantingTitle', { name: row.name, season: lower(season) }),
        row.menu.isLastPlanting
          ? t('seasonPlanning.removeLastPlantingMessage', { name: row.name })
          : t('seasonPlanning.removePlantingMessage', { name: row.name, season: lower(season) }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.delete'), style: 'destructive', onPress: () => removePlanting(componentId, year, row.plantingId) },
        ],
      );
    },
    [menuFor, t, duplicatePlanting, movePlanting, removePlanting, componentId, year],
  );
```

- render inside the `SafeAreaView`, after the `ScrollView`:

```tsx
      <PlantingActionsSheet
        visible={menuFor !== null}
        title={menuFor ? t('seasonPlanning.menuTitle', { name: menuFor.row.name, season: t(`season.${menuFor.season}`) }) : ''}
        items={menuFor?.row.menu.items ?? []}
        hint={menuFor && !menuFor.row.menu.isPlaced ? t('seasonPlanning.notPlacedHint') : undefined}
        cancelLabel={t('common.cancel')}
        onSelect={handleMenuSelect}
        onClose={() => setMenuFor(null)}
      />
```

(imports: `PlantingActionsSheet` from `@/components/organisms/PlantingActionsSheet`, types `RatioRowView`, `PlantingMenuItemView` from `@/types`.) The per-plant ✕ (remove plant) stays.

- [ ] **Step 7: Component Detail and its view model**

`seasonViewModel.ts`: `startingCount = planning.plantingsStartingIn(season).length`, `carriedCount = planning.plantingsCarriedInto(season).length`; `optimizeResultMessage(shares: readonly PlantingShare[], …)` (type import from `../../domain/planning/SeasonOptimization.ts`). Update `seasonViewModel.test.ts` fixtures to a `PlantingCalendar` and shares with `plantingId`; expectations unchanged.

`ComponentDetailScreen.tsx`: `canOptimize = (planning?.plantingsStartingIn(season).length ?? 0) > 0`; carried label: `const start = planning.plantingById(plant.plantingId)?.startSeason;`.

- [ ] **Step 8: Verify and commit**

Run: `npm run test:unit` — Expected: PASS. Run: `npm run typecheck` — Expected: clean. Run `git grep -n "plantsStartingIn\|plantsCarriedInto\|seasonsOfPlant\|startSeasonOf\|seasonsOfYear\|SeasonsOf\b" -- src` — Expected: no output.

```bash
git add src/types/planningViews.types.ts src/screens/PlanningScreen src/components/organisms/SeasonPlanSection src/components/atoms/PlantingRowMenuButton src/components/organisms/PlantingActionsSheet src/components/atoms/index.ts src/components/organisms/index.ts src/screens/ComponentDetailScreen/ComponentDetailScreen.tsx src/screens/ComponentDetailScreen/seasonViewModel.ts src/screens/ComponentDetailScreen/seasonViewModel.test.ts src/i18n/nl.json src/styles/planning/season.css
git commit -m "feat(planning): duplicate, move and remove plantings from the Planning screen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Maestro flows and docs

**Files:**
- Create: `maestro/season_duplicate_planting.yaml`, `maestro/season_move_planting.yaml`, `maestro/season_remove_last_planting.yaml`, `maestro/season_planting_menu_hint.yaml`
- Create: `maestro/subflows/optimize_first_season.yaml`
- Modify: `maestro/README.md`, `CLAUDE.md`

Frost dates come from the picker default (the run date), so the flows find seasons through accessibility labels and test ids, and use Sla (sown outside over many months).

- [ ] **Step 1: Subflow**

`maestro/subflows/optimize_first_season.yaml`:

```yaml
appId: com.mylittlegarden.app
---
# Shared: on the Planning screen with plants added -> back -> optimize the first
# season with plants to place -> back on the Planning screen.
- back
- extendedWaitUntil:
    visible:
      id: "component-detail-screen"
    timeout: 5000
- runFlow: select_season_with_plants.yaml
- tapOn:
    id: "optimize-button"
- extendedWaitUntil:
    visible:
      id: "optimize-snackbar"
    timeout: 15000
- tapOn:
    id: "open-planning-button"
- extendedWaitUntil:
    visible:
      id: "planning-screen"
    timeout: 5000
```

- [ ] **Step 2: Flows**

`maestro/season_planting_menu_hint.yaml`:

```yaml
appId: com.mylittlegarden.app
name: Plantings - an unplaced planting only offers removal, with a hint
---
- runFlow: subflows/open_planning.yaml
- runFlow: subflows/add_plants_to_planning.yaml
- tapOn:
    id: "planting-menu-.*-sla"
- assertVisible:
    id: "planting-actions-hint"
- assertVisible:
    id: "planting-action-remove"
- assertNotVisible:
    id: "planting-action-duplicate-.*"
```

`maestro/season_duplicate_planting.yaml`:

```yaml
appId: com.mylittlegarden.app
name: Plantings - duplicating a placed planting adds a second planting
---
- runFlow: subflows/open_planning.yaml
- runFlow: subflows/add_plants_to_planning.yaml
- runFlow: subflows/optimize_first_season.yaml
- tapOn:
    id: "planting-menu-.*-sla"
- tapOn:
    id: "planting-action-duplicate-.*"
- assertVisible:
    text: "Sla \\(2e teelt\\)"
- assertVisible:
    text: ".*\\(2e\\).*"
```

`maestro/season_move_planting.yaml`:

```yaml
appId: com.mylittlegarden.app
name: Plantings - moving a placed planting asks for confirmation and outdates the season it left
---
- runFlow: subflows/open_planning.yaml
- runFlow: subflows/add_plants_to_planning.yaml
- runFlow: subflows/optimize_first_season.yaml
- tapOn:
    id: "planting-menu-.*-sla"
- tapOn:
    id: "planting-action-move-.*"
- assertVisible:
    text: "Sla verplaatsen naar .*\\?"
- tapOn:
    text: "Verplaatsen"
- assertVisible:
    text: "Verouderd"
```

`maestro/season_remove_last_planting.yaml`:

```yaml
appId: com.mylittlegarden.app
name: Plantings - removing the last planting removes the plant
---
- runFlow: subflows/open_planning.yaml
- runFlow: subflows/add_plants_to_planning.yaml
- tapOn:
    id: "planting-menu-.*-sla"
- tapOn:
    id: "planting-action-remove"
- assertVisible:
    text: "Sla wordt uit de planning verwijderd."
- tapOn:
    text: "Verwijderen"
- assertNotVisible:
    id: "planning-plant-sla"
```

Validate every new YAML file with js-yaml (`node -e "const y=require('js-yaml');for(const f of process.argv.slice(1)) y.loadAll(require('fs').readFileSync(f,'utf8'));console.log('ok')" maestro/season_*planting*.yaml maestro/subflows/optimize_first_season.yaml`) and check each `id:` against a testID in `src` and each `text:` against `nl.json`.

- [ ] **Step 3: Docs**

`maestro/README.md`: add the four flows with one line each, and note that duplicate/move need Sla's window to reach a second season at the run date's frost (true for most of the year with the researched windows; run March–November to be safe).

`CLAUDE.md`, Key Screens item 6: `**Planning Screen**: Per component and year: plant list with its plantings (lente · zomer (2e)), and per season a ratio row per planting with a ⋯ menu to duplicate, move or remove a placed planting`. Domain Concepts → Growing Calendar: replace the seasons sentence with `Sowing windows (from–to weeks around the last frost) decide which seasons a planting can start in; a plant can have one planting per season, placed in its start season and carried (fixed) into the later ones.`

- [ ] **Step 4: Commit**

```bash
git add maestro/season_duplicate_planting.yaml maestro/season_move_planting.yaml maestro/season_remove_last_planting.yaml maestro/season_planting_menu_hint.yaml maestro/subflows/optimize_first_season.yaml maestro/README.md CLAUDE.md
git commit -m "test(maestro): planting duplicate, move and remove flows

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

If a Maestro CLI and device are available, run the four flows; otherwise report that they were statically checked only.
