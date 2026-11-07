# Area-based Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace plant-by-plant placement with area-first layout (one area per planting, filled with a computed grid) so any component size optimizes and renders fast.

**Architecture:** A new pure domain module `AreaLayout` (free-space decomposition → companion ordering → assignment → strips/treemap partition → snapping) produces `AreaData` per planting; `AreaGrid` derives plant counts and grid positions. The `Planning` entity stores areas instead of placements; storage v6 migrates. A new `SeasonAreaCanvas` organism draws and edits areas.

**Tech Stack:** React Native 0.81 + Expo 54, TypeScript strict, Zustand 5, Zod 3, i18next (Dutch), NativeWind, `node --test` (type stripping), Maestro.

**Spec:** `docs/superpowers/specs/2026-11-07-area-planning-design.md`

> Note: the user asked to proceed directly to implementation. This plan gives exact interfaces, files and test cases;
> implementers write the code (TDD) against them. Where a detail is not fixed here, the spec decides; where neither
> does, the implementer chooses the simplest option and reports it.

## Global Constraints

- Always areas, every component size. An area = 1..3 rectangular pieces on one layer. Max 3 pieces.
- Strips when a free rectangle's long side ≥ 2 × its short side, else squarified treemap.
- One piece per planting unless its target would be off by > 10 %, then a second (or third) piece.
- Ordering score: +1 per adjacent companion pair, −2 per adjacent combative pair; exhaustive for ≤ 7 plantings, greedy above; ties by planting id (deterministic, independent of input order).
- Minimum piece side: 2 × spacingRadius (individual) or minimumPatchSideCm (patch/thinning); smaller → no area, reported "past niet".
- Plant count = grid with spacing 2 × spacingRadius whose footprints lie inside the piece (and inside a circular layer). Patch/thinning: no count ("zaaivlak").
- Draw individual plant icons only when an area holds ≤ 50 plants.
- Carry-over, plantings, ratios, fixed seasons, frost rules, outdated marking: unchanged semantics, applied to areas; a planting is placed when it has an area.
- Storage v6: placements dropped, `areas: []`, planned seasons → outdated; plantings and ratios kept.
- Performance: domain layout + counts for 1500 × 2000 with 10 catalog plants < 50 ms (Node, JIT); `scripts/bench-areas.mjs` (compiled JS) < 1 s with `node --jitless`.
- Domain, schemas, migrations, view models and their tests: relative `.ts` imports, no parameter properties/enums.
- All UI strings Dutch via `src/i18n/nl.json`; components presentational; BEM contract in `src/styles/planning/season.css`.
- File writes: Write/Edit; on EPERM or any I/O error stop and report. Preserve line endings. Stage explicitly (never `git add -A`; `.idea/misc.xml` and untracked root files stay out). Commit trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Branch `feature/area-planning`.
- Time discipline for agents: wrap node runs in `timeout 180`; never wait on runs longer than that — shrink the case and investigate.
- Typecheck may be red between Task 2 and Task 4 only in files those tasks rewrite; clean from Task 4 on.

## Review Focus

1. Free space around several fixed pieces (carried + locked) — no area may overlap a fixed piece or another area, or leave the layer (circles!). Test in Task 1.
2. Many plantings in a tiny component — areas below minimum size become "past niet", no crash, no zero-size pieces. Test in Task 1.
3. Determinism and input-order independence of the layout. Test in Task 1.
4. Migration of real v5 data — no throw on any shape, plantings and ratios kept. Test in Task 3.
5. Dragging/resizing an area into another area or outside the layer — rejected or clamped. Test in Task 2 (entity) and Task 4 (canvas view model).

---

### Task 1: AreaLayout and AreaGrid (pure domain)

**Files:**
- Create: `src/types/planning.types.ts` additions: `AreaPiece { xCm; yCm; widthCm; lengthCm }`, `AreaData { id; plantingId; plantId; layerIndex?; pieces: readonly AreaPiece[]; locked? }`
- Create: `src/domain/planning/FreeSpace.ts` (+ test) — `freeRectangles(layer: PlantingArea, fixed: readonly AreaPiece[], minSideCm: number): AreaPiece[]`
- Create: `src/domain/planning/AreaOrder.ts` (+ test) — `orderForNeighbours(ids: readonly string[], relationOf: (a: string, b: string) => PlantRelation): string[]`
- Create: `src/domain/planning/AreaGrid.ts` (+ test) — `gridPositions(piece: AreaPiece, spacingCm: number, layer: PlantingArea, limit?: number): { xCm; yCm }[]` and `plantCountOf(area: Pick<AreaData,'pieces'>, traits: FootprintTraits, layer: PlantingArea): number | null` (null for patch/thinning)
- Create: `src/domain/planning/AreaLayout.ts` (+ test) — `layoutAreas(request: AreaLayoutRequest): AreaLayoutResult`

**Interfaces:**

```ts
export interface AreaLayoutRequest {
  readonly layers: readonly PlantingArea[];                 // index = layerIndex
  readonly fixed: readonly { layerIndex: number; piece: AreaPiece }[];
  readonly plantings: readonly { plantingId: string; plantId: string; ratio: number; traits: FootprintTraits }[];
  readonly relations: PlantRelations;                       // by plant id
}
export interface LaidOutArea { readonly plantingId: string; readonly plantId: string; readonly layerIndex: number; readonly pieces: readonly AreaPiece[] }
export interface AreaShare { readonly plantingId: string; readonly plantId: string; readonly targetShare: number; readonly actualShare: number; readonly plantCount: number | null; readonly fits: boolean }
export interface AreaLayoutResult { readonly areas: readonly LaidOutArea[]; readonly shares: readonly AreaShare[] }
```

**Tests (exact cases; write first):**
- FreeSpace: 100×100 no fixed → `[{0,0,100,100}]`; fixed {0,0,40,40} → 2 rectangles covering exactly the L (areas sum 8400, no overlap with fixed); fixed in the middle {40,40,20,20} → ≤ 4 rectangles, total 9600; rectangles thinner than minSide dropped; circle Ø60 → its bounding square.
- AreaOrder: a–b companion, b–c combative, 3 ids → b is never next to c, a next to b; same result for any input order; 9 ids uses greedy and still never puts a combative pair adjacent when avoidable.
- AreaGrid: piece 100×100, spacing 20 → 25 positions; circle Ø60 at piece {0,0,60,60} spacing 20 → only positions whose 20×20 footprint fits in the circle (count 4); patch traits → plantCountOf null; limit 50 respected.
- AreaLayout:
  - 2 plantings ratio 1:1 in 100×100 (spacing 20) → 2 pieces of 50×100 or 100×50 snapped to multiples of 20 where possible, no overlap, inside layer, shares ≈ 0.5 each (±10 %).
  - Long rectangle 400×100 with 3 plantings → strips (each piece full 100 wide side).
  - Squarish 300×300 with 4 plantings → treemap pieces with aspect ratio ≤ 3.
  - Fixed corner piece → nothing overlaps it; total placed area ≤ free area.
  - Ratio 1:9 where the small one is below min size → small one `fits: false`, no area.
  - Two free rectangles where one planting needs more than the remainder → that planting gets 2 pieces and its actualShare within 10 % of target.
  - Tower: layers [200×200, 100×100] → areas on both layers, each with correct layerIndex.
  - Determinism: reversed input → deepEqual result.
  - Performance: 1500×2000 with the 10 catalog plants (tomaat, sla, wortel, basilicum, boerenkool, radijs, ui, spinazie, courgette, struikboon from `src/data/plants.json`, ratio 1) → completes < 50 ms (measure with `performance.now()`, assert < 200 ms in the test to stay robust), all areas inside, no overlaps, plantCount sum > 5000.

- [ ] Write tests for FreeSpace, AreaOrder, AreaGrid, AreaLayout as above; see them fail.
- [ ] Implement the four modules per spec §5; run `node --test src/domain/planning/{FreeSpace,AreaOrder,AreaGrid,AreaLayout}.test.ts`.
- [ ] Add `scripts/bench-areas.mjs`: compiles nothing itself — it imports a JS build produced by `node scripts/build-domain-js.mjs` (also create: transpiles `src/domain/planning/*.ts` (non-test) with the `typescript` package into `.bench-js/` mapping `.ts` imports to `.mjs`, as done ad hoc before) and times layoutAreas + plantCountOf for the 1500×2000 case; document `node scripts/build-domain-js.mjs && node --jitless scripts/bench-areas.mjs` in the script header. Add `.bench-js/` to `.gitignore`.
- [ ] `npm run test:unit` green (existing tests untouched), `npm run typecheck` clean; commit "feat(planning): area-first layout".

### Task 2: Planning entity and optimizer on areas

**Files:** Modify `src/types/planning.types.ts` (`SeasonPlanData.areas` replaces `placements`; remove `PlacementData` after consumers move — keep a type alias only if needed by Task 3/4 files until they are rewritten), `src/schemas/planningSchema.ts` (`areaDataSchema`, pieces 1..3, positive sizes), `src/domain/planning/Planning.ts` (+ test), `src/domain/planning/SeasonOptimization.ts` (+ test), `src/domain/planning/CurrentPlacements.ts` → `CurrentAreas.ts` (+ test), `src/domain/planning/index.ts`. Delete `SeasonPlacement.ts`, `PositionSearch.ts` (and `PlacementLayer.ts`, `SearchStarts.ts`, `MinHeap.ts` if present) with their tests.

**Interfaces (Planning):** `areasIn(season)`, `areaOf(plantingId)`, `isPlaced(plantingId)` (has an area), `carriedAreasIn(season)`, `fixedAreasIn(season)` (carried + locked), `applyAreas(season, areas: readonly AreaData[])` (replaces unlocked areas; freezes/unfreezes fixedSeasons as before; marks status planned; outdates later seasons carrying them), `moveArea(season, areaId, dxCm, dyCm)`, `resizeArea(season, areaId, pieceIndex, widthCm, lengthCm)`, `removeArea(season, areaId)`, `toggleLock(season, areaId)`, `setAllLocked(season, locked)`; move/resize must keep pieces inside the layer bounding box and not overlapping other areas of the season or fixed areas — the entity receives a `PlantingArea[]`-aware validator via a method argument `bounds: (layerIndex) => PlantingArea` and returns `this` unchanged when the change is invalid. All other Planning behaviour (plantings, ratios, duplicate/move/remove planting, reconciled, frost rules) unchanged with "placements" read as "area".

**optimizeSeason**: builds `AreaLayoutRequest` from `plantingAreasOf(component)`-style `areas` input, `fixedAreasIn(season)` pieces, plantings starting in the season with ratio and catalog traits, `relationsFromCatalog`; calls `layoutAreas`; maps to `AreaData` with `newId()`; `planning.applyAreas`; returns `{ planning, shares: AreaShare[] }` (replaces `PlantingShare`).

**Tests:** port the Planning tests that used placements to areas (same scenarios: carry-over, duplicate/move/remove planting, applyAreas freezing, reconcile cases incl. stranded migrated plantings); add move/resize rejected when overlapping or outside; optimizeSeason: two plantings in different seasons of one plant, carried area fixed and not overlapped; locked area kept.

- [ ] Tests first; implement; `npm run test:unit` (domain green; store/screen/migration tests may fail — Task 3/4), typecheck errors only in stores, migrations, hooks/ai, screens, components that Tasks 3–4 rewrite; commit "feat(planning)!: plantings get areas instead of placements".

### Task 3: Storage v6, store, context, AI snapshot

**Files:** `src/stores/migrations/componentStoreMigrations.ts` (+ test): version 6; v5→v6 keeps plants/plantings/ratios, `areas: []`, planned → outdated; salvage areas per entry (invalid pieces dropped; area without valid piece dropped; areas of unknown plantings dropped). `src/stores/componentStore.ts`: actions `moveArea(componentId, year, season, areaId, dx, dy)`, `resizeArea(..., areaId, pieceIndex, w, l)`, `removeArea`, `toggleAreaLock`, `setAllAreasLocked` replace placement actions (bounds from `plantingAreasOf(component)`); `optimizeSeason` returns `readonly AreaShare[] | null`. `src/stores/planningStore.ts` shares type `AreaShare`. `src/stores/planningContext.ts`: `useCurrentAreasById(components)`. `src/hooks/ai/useAiChat.ts` + `src/domain/ai/buildGardenSnapshot.ts`: one snapshot plant per area at its first piece centre, `patchWidthInCm/patchHeightInCm` = that piece's size.

- [ ] Migration tests first (v5 planning with placements → areas [], plantings/ratios kept, planned → outdated; garbage shapes don't throw; v6 salvage), implement; `npm run test:unit` all non-screen tests green; typecheck errors only in screens/components for Task 4; commit "feat(storage)!: v6 areas".

### Task 4: SeasonAreaCanvas, Component Detail, Home, Planning screen

**Files:** Create `src/components/organisms/SeasonAreaCanvas/{SeasonAreaCanvas.tsx,index.ts}` and a pure view model `src/screens/ComponentDetailScreen/areaCanvasViewModel.ts` (+ test): per area → `{ id, rects (cm), label: "Ui · 780" | "Spinazie · zaaivlak", icons: grid positions when count ≤ 50, dimmed (carried), locked, relationsAtEdges: { otherAreaId, kind: 'companion'|'combative' }[] }` (touching = pieces share an edge within 5 cm); modify `ComponentDetailScreen.tsx` (use SeasonAreaCanvas; drag/resize/select/lock/remove call store area actions; carried label), delete `useSeasonCanvas.ts`; `ComponentSlide.tsx` / `ComponentListRow` (counts = Σ plant counts) / `LayerOverviewModal.tsx` draw areas; `src/screens/PlanningScreen/planningScreenViewModel.ts` result label "≈ {{count}} planten · {{actual}}% (doel {{target}}%)" or "zaaivlak · {{m2}} m²"; `src/screens/ComponentDetailScreen/seasonViewModel.ts` result message counts plants from shares; `nl.json` strings; `season.css` BEM for `.season-area*`. Remove `PlantPlacementCanvas` if no longer imported anywhere (grep), plus `companionRelationships.ts` functions only it used.

**Canvas behaviour:** scale to fit; areas as rounded rectangles tinted per category (reuse category colours/icons from `PLANT_CATEGORIES`/`getPlantIcon`); name + count label; icons drawn at grid positions when ≤ 50; edit mode (existing ✏️ toggle): drag an area (PanResponder on the area) → `moveArea` with dx/dy in cm on release; corner handle on the selected area's first piece → `resizeArea` snapped to plant spacing; tap selects → existing `CanvasEditActions` (lock/unlock, delete → removeArea with confirmation); carried areas dimmed, not interactive; companion/combative edge markers between touching areas; testIDs `season-area-<plantId>`, `carried-area-<plantId>`, `season-area-resize`. Must stay smooth with 20 areas on a 15 × 20 m component (no per-plant React elements above 50 plants per area).

- [ ] View-model tests first (labels, ≤ 50 icon rule, touching-edge relations, carried dimmed); implement; `npm run test:unit` and `npm run typecheck` clean; commit "feat(planning): area canvas".

### Task 5: Performance gate, Maestro, docs

- [ ] Run `node scripts/build-domain-js.mjs && timeout 120 node --jitless scripts/bench-areas.mjs`; must report < 1 s for 1500×2000 with 10 plants (layout + counts + canvas view model if importable). Record the numbers in the commit message.
- [ ] Update Maestro flows/subflows that reference `planning-footprint-.*` / `carried-plant-.*` to `season-area-.*` / `carried-area-.*`; validate YAML with js-yaml; statically check every id/text.
- [ ] `CLAUDE.md`: Component Detail Screen line → "one season as areas per planting (drag, resize, lock), plant counts, carried areas dimmed"; Growing Calendar paragraph: add "Each planting gets one area (strips or blocks) filled with a plant grid".
- [ ] Commit "test(maestro): area canvas flows; docs".
