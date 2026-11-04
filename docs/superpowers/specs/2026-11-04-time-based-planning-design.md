# Time-Based Planning and Auto-Placement Design

Date: 2026-11-04
Status: decisions agreed in conversation; user asked to start implementing.
Sections 2-4 were not reviewed one by one; deviations go back to the user.

## Goal

Give every component a weekly timeline per calendar year. Each placed plant
occupies a rectangular footprint during a growing period derived from the
catalog. The app can auto-place a list of plants in a component (or tower
layer) so that as many as possible fit in space and time, with companions next
to each other and hostile plants apart. The user browses the year week by week
or by time zone (a run of weeks with an identical layout), can still move
plants by hand, and can rearrange or start over.

## Decisions (from the user)

| # | Question | Decision |
|---|----------|----------|
| 1 | Who sets a plant's period? | Derived from the catalog, not editable. |
| 2 | What does auto-placement choose? | Position and start: one of the 3 weeks of the window (calculated week ±1) and transplant vs direct sow. |
| 3 | Time axis | One plan per calendar year, ISO weeks 1-52/53. Periods are cut at the last week of the year. Every year starts empty. No perennials. |
| 4 | Relation to the AI optimize | Auto-placement is local, deterministic, one result. AI optimize stays separate. |
| 5 | Rerun semantics | Two actions: Rearrange and Start over, applied directly without preview. Start over asks for confirmation (destructive). Locked plants never move. |
| 6 | Objective | Fit the most plants first; then companions adjacent and hostile plants apart. No sun or height. |
| - | Algorithm | Greedy placement on a 5 cm grid. |

## Non-goals

- No perennials, no multi-year plants, no carry-over between years.
- No manual editing of a plant's period.
- No preview of auto-placement results.
- No manual drag of a "to plan" plant onto the canvas (only auto-placement places them).
- No backend change. The AI optimize keeps its current contract (see UI section).
- No sun direction or plant height in the scoring.

## 1. Domain model (`src/domain/planning/`)

Pure TypeScript with relative `.ts` imports and no React Native imports, so
`npm run test:unit` (node --test) runs the tests, like
`src/domain/component/towerLayerGeometry.ts`.

### PlantingWeek
Value object: `year` + ISO-8601 `week` (Monday to Sunday).
- `PlantingWeek.containing(date)`, `PlantingWeek.weeksInYear(year)` (52 or 53).
- `firstDay()`, `lastDay()` for the slot's date label.
- `isBefore`, `equals`, `plus(weeks)`.

### GrowingPeriod
Value object: `{ year, startWeek, endWeek, method: 'transplant' | 'directSow' }`,
both weeks inclusive and in the same year.
- `includes(week)`, `overlaps(other)`, `lengthInWeeks`.
- Derived from the catalog:
  - start = ISO week of `lastSpringFrost(year) + transplantWeeks` (or `directSowWeeks`) weeks
  - transplant end = start + ceil(`daysToHarvest.max` / 7) weeks
  - direct sow end = start + ceil(`daysToHarvest.max` / 7) weeks (seed-catalog convention counts from sowing; verified by the plant specialist)
  - end is capped at the last week of the year; a start outside the year is not an option.
- The frost date is the garden's spring frost day and month applied to the planning year.

### GrowingPeriodOptions
`GrowingPeriodOptions.forPlant(plant, lastSpringFrost, year): GrowingPeriod[]`.
For each method the plant supports (non-null weeks), the calculated week -1, 0
and +1. Order: transplant before direct sow, earlier before later (this order
breaks ties). A plant without any timing gets no options and cannot be
auto-placed (reason `noPlantingWindow`).

### PlantFootprint
Width x length in cm, always axis-aligned, centred on the plant position.
- Individual (and thinning) plant: square of `2 * spacingRadiusCm`.
- Patch plant: `patchWidthInCm` x `patchHeightInCm`; rotated patches use the
  axis-aligned bounding box of the rotated rectangle.
- Two footprints conflict when their rectangles overlap with positive area AND
  their periods overlap. Touching edges is allowed.

### TimeZone
`calculateTimeZones(plants, year): TimeZone[]`, where a zone is
`{ startWeek, endWeek, plantIds }`: maximal runs of consecutive weeks with the
same set of active plant ids. It covers every week of the year, including
empty weeks. It is always calculated, never stored.

### AutoPlacement
`placePlants(request): PlacementResult`, pure and deterministic.

Request:
- `area`: `{ shape: 'rectangle', widthCm, lengthCm }` or `{ shape: 'circle', diameterCm }`.
  These are the inner dimensions: the component (or tower layer) minus `borderWidthInCm` on each side.
- `fixed`: plants that must not move: `{ id, plantId, footprint, period, xCm, yCm }`.
- `candidates`: `{ id, plantId, footprint, periodOptions }`. For Rearrange,
  `periodOptions` holds only the plant's current period.
- `relations(plantIdA, plantIdB)`: `'companion' | 'hostile' | 'neutral'`.
  A relation is symmetric when either plant lists the other.

Algorithm:
1. Grid of 5 cm cells over the area. A rectangle fits in a circle when all
   four corners are inside it.
2. Sort the candidates by footprint area (descending), then longest period
   option (descending), then plantId, then id. This makes the result deterministic.
3. For each candidate, for each period option, for each grid position whose
   footprint lies in the area and conflicts with no fixed or already placed
   plant during that period, compute the score:
   - +1 for each companion whose footprint shares an edge (touching or within 5 cm)
   - -2 for each hostile plant within 5 cm
   - each term is weighted by the number of overlapping weeks / the candidate's period length
4. Pick the highest score. Ties go to the earliest period option, then the
   smallest y, then the smallest x. If no position fits, mark the candidate
   unplaced with reason `noSpace` (window weeks reported) or `noPlantingWindow`.

Result: `{ placed: { id, xCm, yCm, period }[], unplaced: { id, reason, weeks? }[] }`.

Performance target: 50 candidates in a 120 x 240 cm box in under 500 ms on a
mid-range device. Week occupancy uses one bitmask per cell (53 weeks fit in two 32-bit ints).

## 2. Storage (`src/types`, `src/schemas`, `src/stores`)

- `PlacedPlantData.growingPeriod: { year, startWeek, endWeek, method }` (required after migration).
- New `PlantToPlanData { id, plantId, year, layerIndex? }` and
  `BaseComponentData.plantsToPlan: readonly PlantToPlanData[]` (default `[]`).
- Zod schemas updated (`plantSchema.ts`, component schema).
- `componentStore` version 3. `migrateComponentState` v<3:
  - existing plants get `growingPeriod` in the year of `placedAt`, with start = week of `placedAt` and method `transplant`;
    end = start + ceil(daysToHarvest.max / 7) using the catalog, or the last
    week of that year when the plant is unknown; capped at year end.
  - `plantsToPlan: []`.
  - Pure function with tests, like v2. The catalog lookup is passed in as a function.
- Store actions:
  - `addPlantsToPlan(componentId, plantId, quantity, year, layerIndex?)`
  - `removePlantToPlan(componentId, id)`
  - `applyPlacement(componentId, result, consumedToPlanIds)`: placed
    candidates become `PlacedPlantData` (keep id; `placedAt` = now for new
    ones), placed ones that came from the list leave `plantsToPlan`, and
    previously placed unlocked plants that end up unplaced move back to
    `plantsToPlan`.
- The non-persisted store `planningStore` keeps the reasons from the last run, per component.

## 3. Use cases (`src/domain/planning/` or a hook)

For the selected component, year and layer:
- Rearrange: fixed = locked placed plants of that year/layer. Candidates =
  unlocked placed plants, each with only its current period, plus `plantsToPlan`
  of that year/layer with all options.
- Start over (after confirmation): fixed = locked plants. Candidates = all
  unlocked placed plants plus `plantsToPlan`, each with all options.
- Both apply the result directly via `applyPlacement`.
- Coordinates: AutoPlacement works in the inner area (border removed, origin
  top-left of the inner area). `PlacedPlantData.positionX/Y` are relative to the
  full component/layer. The use case adds `borderWidthInCm` to results and
  subtracts it from fixed plants, with a test.
- Frost days are passed to the domain as `{ month, day }`, read with local
  getters from the garden store's Date values.

## 4. UI

### Component Detail screen
- **Year bar**: `‹ 2026 ›`. Defaults to the current year.
- **Week strip**: horizontal list with one slot per ISO week. Each slot shows
  "W18" and "27 apr - 3 mei". The selected slot is highlighted. Defaults to the
  current week (or week 1 of another year), and scrolls to the selection.
- **Zone band**: under the strip, one segment per time zone spanning its weeks,
  in alternating tones, with the number of plants in it. Tapping a segment
  selects the zone: its weeks are highlighted and the canvas shows its
  (identical) layout. Tapping a single slot selects that week.
- **Canvas**: shows plants whose period includes the selected week (or the
  zone's first week), filtered per layer as today. Plants are drawn as their
  footprint rectangle instead of a circle. A footprint conflict is drawn red
  (warning only; never blocks a drag). Locking, dragging and patch editing
  keep working; a drag changes position only, never the period.
- **"Te plannen" accordion**: plants on the list for this year/layer, grouped
  by plant with a count. Unplaced reasons from the last run are shown, e.g.
  "Geen plaats in week 18-24". Each item can be removed.
- **Actions**: "Herschikken" (Rearrange) and "Opnieuw beginnen" (Start over,
  with a confirmation dialog). They are disabled when nothing can be placed.
- **AI optimize**: keeps its current behaviour, but only sends the plants
  visible in the selected week. Applying it can create conflicts in other
  weeks; those show as red warnings. Extending the backend contract with time
  is a follow-up.

### Plant Selection screen
Adding plants with a quantity creates `PlantToPlanData` entries for the
selected year and layer (passed as route params) instead of placing plants in
the centre.

### i18n
All new labels in Dutch in `src/i18n`.

## Delivery slices

Each slice ends with user validation (CLAUDE.md workflow).

1. **Planning domain**: PlantingWeek, GrowingPeriod, GrowingPeriodOptions,
   PlantFootprint, TimeZone, AutoPlacement with node:test unit tests. No UI.
2. **Storage**: types, schemas, migration v3, store actions, use cases. Unit
   tests for the migration and `applyPlacement`.
3. **UI**: year bar, week strip, zone band, footprint canvas filtered by week,
   "Te plannen" list, actions, Plant Selection change, i18n.
4. **Maestro** flows: add plants to plan → Rearrange → browse weeks/zones → Start over.
5. **Harvest window** (user decision B): `daysToHarvest` is the time to the first
   harvest, so it understates how long repeat-harvest crops occupy the bed.
   - New catalog field `harvestWindow`: `{ kind: 'once' }` | `{ kind: 'weeks', weeks }` | `{ kind: 'untilFrost' }`.
     Optional in the schema, defaulting to `once`.
   - GrowingPeriod end = start + ceil(daysToHarvest.max / 7) + the window weeks.
     `untilFrost` ends in the week of the garden's first fall frost in that year;
     if harvest begins after that, there is no extra time.
   - The plant specialist fills in the field for every plant in `plants.json`
     (verified with 3 sources). Values: once for single-harvest crops,
     4-8 weeks for repeat picking, untilFrost for tomato, pepper and aubergine.
   - Existing placed plants keep their stored period; new runs use the new formula.

## Open point for the plant specialist

Does `daysToHarvest` in `src/data/plants.json` count from transplanting (for
transplanted crops) and from sowing (for direct-sown crops)? The period
formula assumes: from transplant, and from germination for direct sowing.
