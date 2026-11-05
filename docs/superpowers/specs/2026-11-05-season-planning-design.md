# Season-based planning — design

Date: 2026-11-05
Status: approved in brainstorming, awaiting spec review
Replaces: `2026-11-04-time-based-planning-design.md` and `2026-11-04-time-planning-ui-brief.md` (week-based planning)

## 1. Why

The client rejected the week-based planning (ISO-week timeline, time zones, per-plant growing periods)
and the way plants are added to components. They want a simpler concept: a component has a plant list,
the app derives in which seasons each plant is in the ground, and per season the user sets how much space
each plant gets *relative to the others*. The app then fills the component as well as it can.

Kept unchanged: garden, components (boxes, pots, towers, layers), plant catalog and names,
companion/combative relationships, locking/unlocking, the growing calendar on the Plant Details screen.

## 2. Ubiquitous language

| Term | Meaning |
|---|---|
| **Season** | `spring` · `summer` · `autumn` · `winter` (Dutch UI: lente · zomer · herfst · winter). Meteorological: Mar–May, Jun–Aug, Sep–Nov, Dec–Feb. Winter *Y* runs Dec *Y* – Feb *Y+1* and is the last season of planning year *Y*. |
| **Planning** | One per component per year. Holds the plant list and one season plan per season. |
| **Plant list** | The plants added to a planning, without amounts (`plantId[]`). |
| **Growing seasons** | The consecutive run of seasons a plant is in the ground, *derived* from its calendar. Never stored, never chosen by the user. |
| **Start season** | The first of a plant's growing seasons. The plant is placed there. |
| **Carried-over plant** | A plant seen in a season after its start season. It occupies its start-season positions and is fixed. |
| **Ratio** | Whole number ≥ 1 (default 1) per plant per start season. A plant with ratio 2 gets twice the area of a plant with ratio 1. |
| **Season plan** | Ratios, placements and status of one season. |
| **Status** | `notPlanned` · `planned` · `outdated`. |

## 3. Domain model

### 3.1 PlantCalendar (one shared calculation)
Given a catalog plant and the garden's last spring frost date:
- transplant date = frost + `transplantWeeks`; direct sow date = frost + `directSowWeeks`; indoor start = frost + `indoorStartWeeks` (unchanged formulas).
- Used by **both** the Plant Details growing calendar and the season calculation. It replaces the duplicated logic in
  `src/utils/calendarCalculations.ts` and `src/domain/planning/GrowingPeriod.ts`. The Plant Details calendar must look and behave exactly as today.

### 3.2 Growing seasons of a plant
For planning year *Y*:
- **Start** = transplant date if the plant has `transplantWeeks`, else direct sow date.
- **End** = start + `daysToHarvest.max`, capped at the end of February *Y+1*.
- **Growing seasons** = every season of year *Y* that the period [start, end] overlaps. This is always a consecutive run.
- One planting per plant: a plant appears in exactly one run of seasons.
- A plant with neither `transplantWeeks` nor `directSowWeeks` has **no calendar**: it stays in the plant list with a
  "geen teeltkalender" warning and is in no season.
- No carry-over across years.

### 3.3 Planning (entity, per component per year)
```
Planning
  plants: plantId[]
  seasons: { spring | summer | autumn | winter → SeasonPlan }

SeasonPlan
  ratios: { plantId → integer ≥ 1 }      // only plants whose start season is this season
  placements: Placement[]                // only plants whose start season is this season
  status: 'notPlanned' | 'planned' | 'outdated'

Placement
  id, plantId, positionX, positionY, layerIndex, locked,
  patchWidthInCm?, patchHeightInCm?, patchRotationDeg?
```
`Placement` is today's `PlacedPlantData` without `growingPeriod` and `placedAt`.

Behaviour lives on the entity (not in UI or store):
- `addPlant(plantId)` — adds to the list; ratio 1 in its start season; marks that season and later seasons that share carried-over plants `outdated` (if they were `planned`).
- `removePlant(plantId)` — removes from the list, removes its ratio and placements; marks affected seasons `outdated`.
- `setRatio(season, plantId, ratio)` — only for plants starting in that season; marks the season (if `planned`) and later affected seasons `outdated`.
- `applyPlacement(season, result)` — replaces the season's unlocked placements; status `planned`; every later season that shows a plant carried over from this season becomes `outdated` (if `planned`).
- `fixedPlantsIn(season)` — locked placements of the season + placements of carried-over plants from earlier seasons.
- `plantsStartingIn(season)`, `plantsCarriedInto(season)` — queries for the UI.
- Lock/unlock of a placement, lock all / unlock all per season (existing behaviour, scoped to one season).
- A changed last-frost date can move plants between seasons: every planning whose seasons change is marked `outdated` for the affected seasons; ratios of plants whose start season changed are moved along (kept value), their placements dropped.

### 3.4 What is removed from the domain
`GrowingPeriod`, `PlantingWeek`, `TimeZone`, `PlanningQueries`, `GrowingPeriodOptions`, `ComponentPlanning` use cases
`rearrangePlanting`/`startPlantingOver`, `plantsToPlan`, `PlantToPlanData`, `GrowingPeriodData`.
`AutoPlacement`'s candidate-position search and scoring are kept (refactored as needed) and reused by `SeasonPlacement`.

## 4. SeasonPlacement (placement algorithm)

Local, deterministic domain service. Reuses `PlantingArea` (box, pot, tower layers), `PlantFootprint`, `PlantRelations`
and the candidate-position search + scoring from `AutoPlacement`.

**Input:** the layer areas of the component (one for box/pot, one per layer for towers), fixed plants
(`fixedPlantsIn(season)`), the plants starting in the season with their ratios, relations.

**Algorithm:**
1. **Free area** = sum of layer areas − area of fixed footprints.
2. **Target area** per plant = ratio / Σratios × free area.
3. **Patch plants first** (`plantingStyle` `patch` or `thinning`): each gets one rectangle with area close to its target,
   shrunk stepwise until it fits somewhere on any layer, never below the minimum patch side
   (`2 × sowingSpacingCm`, fallback `2 × spacingRadiusCm`).
4. **Fill loop** for individual plants, repeat:
   - pick the non-full plant with the lowest placedArea / targetArea (ties: larger footprint, then plantId);
   - place one copy at the best-scoring free spot over all layers (scoring as today: +1 per adjacent companion,
     −2 per adjacent combative; ties: lowest layer, then smallest y, then smallest x);
   - if no spot fits, the plant is **full** and leaves the loop;
   - stop when every plant is full.
   Leftover space thus goes to plants that can still use it (fill the box; ratio is a guide).
5. Combative adjacency is a penalty, never a hard ban.

**Output per plant:** count, actual share of free area, target share; plants with zero copies are reported as "past niet".

**Re-optimizing** a season discards its unlocked placements and reruns; locked and carried-over plants stay.
Manual drag and lock after optimizing behave as today.

## 5. Screens

### 5.1 Component Detail screen (garden view)
1. Header (back, component name) and year bar (existing `YearBar`; a year without planning starts empty).
2. **Season tabs** Lente · Zomer · Herfst · Winter, each with months hint ("mrt–mei") and status dot
   (grey `notPlanned`, green `planned`, orange `outdated`).
3. **Canvas** of the selected season: plants starting here (draggable, lockable); carried-over plants dimmed with a
   "uit lente" badge, not movable; companion/combative indicators unchanged.
4. **Outdated banner**: "Deze planning is verouderd door wijzigingen in een eerder seizoen" + [Opnieuw optimaliseren].
5. **Action bar**: [Optimaliseren] (selected season), lock all / unlock all (selected season), [Planning].

### 5.2 Planning screen (new; per component per year)
1. Header "Planning — <component> · <year>", back button.
2. **Planten**: plant list; each with derived season chips or "geen teeltkalender" warning; [+ Plant toevoegen];
   remove with confirmation dialog.
3. **Accordion per season** (name, months, status):
   - plants starting in this season: icon, name, − [n] + ratio stepper, live target %; after optimizing
     "12 planten · 61% (doel 67%)" or "Past niet";
   - carried-over plants read-only: "Tomaat — doorlopend uit lente";
   - empty season: "Geen planten in dit seizoen".
4. Changes save immediately; affected season dots update.
5. No last-frost date set → redirect to the Environment screen.

### 5.3 Add Plant screen
Same category grid; quantity controls replaced by select/deselect (checkmark on tile). Plants already in the planning
show selected. [Toevoegen] returns to the Planning screen. Opened from the Planning screen only.

### 5.4 Unchanged
Home canvas, component create/edit/delete, Plant Details (including growing calendar), Settings, AI chat.

All strings Dutch via i18n; styling in BEM CSS files with `@apply`; components presentational (atomic design).

## 6. Storage

`componentStore` migration v3 → v4:
- Each component gets `plannings: { [year: string]: Planning }` (empty object on migration).
- `plants`, `plantsToPlan` and all `growingPeriod` data are dropped. Existing plantings are **not** converted;
  components themselves (name, type, size, position, layers, border) are kept.
- Zod schemas for `Planning`, `SeasonPlan`, `Placement`.
- `planningStore` (unplaced reasons per week run) is removed; the last placement result per season may be kept
  in memory for the result rows on the Planning screen (not persisted).

## 7. Removed features and code
- Week timeline UI: `WeekTimeline`, `TimeZoneSegment`, `ViewModeToggle`, `WeekSlot`, `ToPlanAccordion`, `ToPlanRow`,
  `PlanningCaption`, `usePlanningTimeline`, `planningViewModel` (week parts), `src/styles/planning/*` where unused.
- Remote AI optimize: `optimizeComponentService`, `useOptimizeComponent`, `aiOptimizeComponentStore`,
  `OptimizationAlternativesModal`, `OptimizationMiniCanvas`, `ScoreChips`, `AlternativePageDots`,
  `buildComponentOptimizeRequest`, optimize request/response schemas. Shared AI infrastructure
  (`aiHttpClient`, `aiRetry`, `AiError`, `aiConfig`, `buildGardenSnapshot`) stays if the AI chat still uses it.
- Existing Maestro time-planning flows are replaced.

## 8. Error handling and edge cases
- Plant without calendar data: warning, in no season.
- No frost date: Planning screen redirects to the Environment screen.
- Plant gets zero copies: "Past niet" in its row + snackbar summary after optimizing.
- Destructive actions (remove plant from planning) require a confirmation dialog.
- Season with no starting plants: [Optimaliseren] disabled.

## 9. Testing
- **Jest unit tests:** `PlantCalendar` (incl. parity with today's Plant Details dates); growing-season calculation
  and season boundaries (incl. winter across the year end, cap at end of February); `Planning` entity (carry-over,
  outdated marking, ratio scoping, frost-date change); `SeasonPlacement` (ratio fill, leftover redistribution,
  locked and carried-over plants as fixed, tower layers, patch plants, determinism).
- **Maestro flows:** add plants → set ratios → optimize a season → counts visible on canvas; carry-over from lente
  to zomer shown dimmed; re-optimizing lente marks zomer outdated; remove plant with confirmation.

## 10. Delivery
Branch `feature/season-planning`, delivered through the project's agent workflow
(architect → developer → review → Maestro → user validation).

## 11. Out of scope (later)
- Same plant more than once in a planning (succession sowing).
- Copying a planning to the next year; carry-over across years.
- Layer preferences for towers ("strawberries on top").
- AI-based placement for the season concept.
