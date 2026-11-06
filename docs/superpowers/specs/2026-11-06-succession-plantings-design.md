# Sowing windows and succession plantings — design

Date: 2026-11-06
Status: approved in brainstorming, awaiting spec review
Builds on: `2026-11-05-season-planning-design.md` (season-based planning)

## 1. Why

A plant placed in one season can often be planted again, or instead, in another season (sla in spring and
again in summer). The client wants to duplicate a placed planting into another season, or move it there.
Whether that is possible depends on the plant's sowing window — and the catalog has no windows: it stores
one offset per method (inherited from the Planter app), and the Plant Details calendar only draws ±1 week
around it. Belgian sowing calendars (Aveve, Hubo, Leefmilieu Brussel) give real periods.

Two parts, delivered in order:
- **A. Sowing windows** in the catalog (all 176 plants), used by the season calculation and shown on Plant Details.
- **B. Plantings**: a plant in a planning can have several plantings, each starting in its own season; a
  placed planting can be duplicated or moved to another season its window reaches.

Unchanged: components, companion/combative relations, optimizer scoring, locking, season tabs, ratios as
relative area shares, "fill the box".

## 2. Ubiquitous language

| Term | Meaning |
|---|---|
| **Sowing window** | Per method (indoor start, transplant, direct sow): from–to in weeks relative to the last spring frost. Negative = before the frost. |
| **Planting** | One time a plant is planted in a component in a planning year: `{ id, plantId, startSeason, fixedSeasons? }`. At most one planting per plant per start season. |
| **First planting** | The planting created when a plant is added; starts in the first season its window reaches. |
| **Extra planting** | Any other planting of the same plant; labelled "(2e teelt)", "(3e teelt)" in start-season order. |
| **Placed planting** | A planting with at least one placement (its season was optimized). |
| **Reachable season** | A season whose earliest planting date (below) lies inside the plant's window. |
| **Available season** (for a planting) | A reachable season with no planting of the same plant yet. Earlier and later seasons both count. |
| **Fixed seasons** | The growing seasons saved on a planting when it is placed; frost-date changes no longer alter them. |

## 3. Part A — sowing windows

### 3.1 Catalog data
- `PlantData` replaces `indoorStartWeeks`, `transplantWeeks`, `directSowWeeks` (single numbers) with
  `indoorStartWindow`, `transplantWindow`, `directSowWindow`: `{ fromWeeks: number; toWeeks: number } | null`,
  `fromWeeks ≤ toWeeks`, weeks relative to the last spring frost.
- `plants.json` version 3.0.0. Zod `plantSchema` validates the windows (`fromWeeks ≤ toWeeks`).
- Trees and shrubs without a calendar today keep all three windows `null`.

### 3.2 Research (separate step, reviewed by the user)
- The plant-product-specialist determines the windows for all 176 plants from Belgian sources (Aveve,
  Hubo, Leefmilieu Brussel moestuin guide, seed packets), each window confirmed by three sources.
- Month windows are converted to weeks against the average Belgian last frost: **15 April**
  (e.g. "maart–juli" → from the first week of March to the last week of July, relative to 15 April).
- Deliverable: `docs/plant-windows-2026.md` — a table per plant (id, name, three windows in weeks and as
  months, sources) — plus the updated `plants.json`. **The user reviews the table before the data is used.**

### 3.3 Dates
- **Planting window** of a plant: its transplant window if it has one, else its direct sow window.
  No planting window → the plant has no calendar ("geen teeltkalender") and gets no plantings.
- **Earliest planting date in a season S** of year Y: the later of (window start date, first day of S).
  S is **reachable** when that date is not after the window end date.
- **First planting**: starts in the first reachable season, at the window start date (as today).
- **Planting start date**: the earliest planting date in its start season.
- **End date**: start + `daysToHarvest.max` days, capped at the end of February Y+1 (as today).
- **Growing seasons** of a planting: every season its [start, end] period overlaps; it is placed in its start
  season and carried (fixed) into the later ones.

### 3.4 Plant Details calendar
The growing-calendar bars show the real windows (from window start date to window end date, per method)
instead of ±1 week around one date. All callers of the old fields switch to the windows
(`PlantCalendar`, `calculateGrowingCalendar`, `GrowingCalendar`, `useAiChat`, plant store).

## 4. Part B — plantings

### 4.1 Stored data (`PlanningData`, store version 5)
```
PlanningData
  plants: plantId[]                         // plant list; a plant without calendar may be here with no plantings
  plantings: Planting[]
  seasons: { spring | summer | autumn | winter → SeasonPlanData }

Planting
  id: string
  plantId: string
  startSeason: Season
  fixedSeasons?: Season[]                   // set while the planting is placed

SeasonPlanData
  ratios: { [plantingId]: integer ≥ 1 }     // only plantings starting in this season
  placements: PlacementData[]               // each with plantingId
  status: 'notPlanned' | 'planned' | 'outdated'

PlacementData gains plantingId: string
```

### 4.2 Rules (on the Planning entity)
- **Growing seasons of a planting**: `fixedSeasons` when set, else derived from its start date (3.3).
- `addPlants(plantIds)`: each new plant joins `plants`; a plant with a calendar gets its first planting
  (ratio 1); the start season becomes outdated if planned. Duplicates ignored.
- `seasonsAvailableFor(plantingId)`: reachable seasons without a planting of the same plant.
- `duplicatePlanting(plantingId, season)`: only for a placed planting and an available season → new planting
  in `season`, ratio 1; `season` becomes outdated if planned.
- `movePlanting(plantingId, season)`: only for a placed planting and an available season → the planting's
  placements are removed, `fixedSeasons` cleared, `startSeason = season`, ratio 1; the old start season,
  the seasons it was carried into and `season` become outdated if planned.
- `removePlanting(plantingId)`: removes its ratio and placements; its seasons become outdated if planned;
  if it was the plant's last planting, the plant leaves `plants`.
- `removePlant(plantId)`: removes the plant and all its plantings (as today).
- `setRatio(season, plantingId, ratio)`: only for plantings starting in `season` (as today, per planting).
- `applyPlacement(season, placements)`: as today; additionally sets `fixedSeasons` on every planting that
  has placements in `season` afterwards (its current growing seasons), and clears it on plantings starting
  in `season` that end up with no placements.
- Moving, resizing, removing a placement, locking: as today, keyed by placement id; later seasons that
  carry the planting become outdated where they do today.
- **Frost-date change (`reconciled`)**: placed plantings are not affected at all (start season, placements,
  fixed seasons and statuses stay). Unplaced plantings are re-derived: if their start season is no longer
  reachable they move to the first reachable season (ratio 1); if that season already has a planting of the
  same plant, the moved planting is dropped (and if it was the plant's last, the plant stays in the list
  only when it has no calendar, else it leaves). A plant in `plants` with a calendar but no planting gets its
  first planting. Only seasons whose plantings changed become outdated. This replaces the conservative
  "outdate every planned season with plants" rule of the season-planning design.

### 4.3 Optimizer
Works per planting: ratios, `PlantShare` and placements are keyed by planting id (`plantingId`);
companion/combative relations use the plant id. Fixed plantings (carried + locked) as today.

### 4.4 Screens
- **Planning screen — plant list**: each plant with its plantings by start season, e.g. "Sla — lente ·
  zomer (2e teelt)"; plants without a planting window keep "geen teeltkalender".
- **Planning screen — season accordions**: one ratio row per planting starting in the season (name with
  "(2e teelt)" etc., stepper, target %, last result as today) and a **⋯ button** (48 dp) opening a bottom
  sheet (`PlantingActionsSheet` organism):
  - "Ook planten in <seizoen>" per available season — placed plantings only;
  - "Verplaatsen naar <seizoen>" per available season — placed plantings only; confirmation
    "De plaatsingen van <naam> in <seizoen> worden verwijderd.";
  - "Verwijderen uit <seizoen>" — always; confirmation, and when it is the last planting:
    "<naam> wordt uit de planning verwijderd.";
  - an unplaced planting shows the hint "Optimaliseer eerst dit seizoen om te dupliceren of te verplaatsen."
- Carried rows read-only: "Sla (2e teelt) — doorlopend uit zomer".
- **Component Detail**: no new controls; season-tab counts count plantings.
- New: `PlantingActionsSheet` organism, `PlantingRowMenuButton` atom; strings in `nl.json`; BEM contract
  in `src/styles/planning/season.css`.

## 5. Storage migration v4 → v5
- Existing plannings are converted: for every season S, every plant id with a ratio or placements under S
  becomes a planting `{ id: "<plantId>-<S>", plantId, startSeason: S }`; ratios and placements are re-keyed
  to that id (placements get `plantingId`).
- Plants in `plants` with no ratio or placements get their first planting when the planning is loaded
  (needs the catalog and frost date, so not in the pure migration).
- Placed migrated plantings get `fixedSeasons` filled from the current calendar on first load.
- Per-entry salvage as in v4: invalid entries dropped, their season outdated.

## 6. Error handling and edge cases
- Window with `fromWeeks > toWeeks` is rejected by the schema.
- A planting whose window reaches no season (period entirely before March of year Y or after February Y+1):
  the plant has no plantings that year and shows "valt buiten dit planningsjaar" in the plant list.
- Duplicate/move items never offer a season that already has a planting of the plant.
- Destructive actions (move, remove planting) ask for confirmation.

## 7. Testing
- **Unit (`node --test`)**: window dates, earliest date per season and reachability; Plant Details calendar
  showing windows; planting rules (add, duplicate, move, remove incl. last planting, one per season, earlier
  seasons, ratio 1); `fixedSeasons` set/cleared by `applyPlacement`; frost-date change freezes placed and
  re-derives/drops unplaced plantings; optimizer with two plantings of one plant and a carried planting next
  to a new one; v4→v5 migration; Planning-screen view model labels and menu items.
- **Maestro**: duplicate a placed planting to another season → "(2e teelt)" row; move → confirmation →
  outdated status; remove the last planting → plant leaves the list; ⋯ on an unplaced planting shows the hint.

## 8. Delivery
Branch `feature/succession-plantings`: (1) window research and the reviewable table → **user review**;
(2) code tasks through the subagent workflow (catalog windows, planting model, optimizer per planting,
migration, screens, Maestro).

## 9. Out of scope
- Several plantings of the same plant in one season (staggered sowing within a season).
- User-chosen start dates within a window.
- Windows for trees and shrubs.
