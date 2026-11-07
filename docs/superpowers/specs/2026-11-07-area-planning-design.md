# Area-based planning — design

Date: 2026-11-07
Status: user asked to proceed straight to plan and implementation; open points decided by the controller (listed in §10)
Builds on: `2026-11-05-season-planning-design.md`, `2026-11-06-succession-plantings-design.md`

## 1. Why

Filling a large component plant by plant does not scale: a 15 × 20 m area with 8 plants holds ~7,400 plants.
Measured "Hermes-like" (Node `--jitless`): optimizer 13.9 s, canvas overlap check 9.8 s, canvas companion
indicators crash (27.5 million pairs). On the phone it never finishes. The user asked for the reverse order:
**decide each plant's area first, then fill it**, and compute companionship between areas, not plants.

Target: a 15 × 20 m component with 10 plants optimizes and renders in well under 30 s on the phone
(goal: under 1 s for the domain in Node `--jitless`).

## 2. Ubiquitous language

| Term | Meaning |
|---|---|
| **Area** | The space a planting gets in its start season: one or a few rectangular **pieces** on one layer. Replaces individual placements. |
| **Piece** | `{ xCm, yCm, widthCm, lengthCm }`, top-left based, inside the layer. |
| **Plant count** | Derived: the number of plants on a regular grid with spacing 2 × spacing radius that fit in the area's pieces (and inside a circular layer). Patch/thinning plants show "zaaivlak" instead of a count. |
| **Free space** | A layer minus the pieces of fixed areas (locked areas of the season, areas carried over from earlier seasons). |
| **Free rectangle** | One rectangle of a decomposition of the free space into as few disjoint rectangles as practical. |

## 3. Decisions (from the user)

1. **Always areas**, for every component size. Plants are drawn individually inside an area only when the area holds
   at most 50 plants; above that the area shows its plant count.
2. **Editing works on areas**: drag (move) and resize an area; its plants re-grid. Lock applies to a whole area; a
   locked area stays put on the next optimization.
3. **Shape**: **strips** when a free rectangle is long (long side ≥ 2 × short side), **blocks** (squarified
   treemap) when it is squarish.
4. **Irregular free space**: one rectangle per planting where possible; a second piece only when the ratio would
   otherwise be off by more than 10 %.

## 4. Model

```
AreaData
  id: string
  plantingId: string
  plantId: string
  layerIndex?: number              // towers only
  pieces: { xCm, yCm, widthCm, lengthCm }[]   // 1..3
  locked?: boolean
SeasonPlanData
  ratios: { [plantingId]: integer ≥ 1 }
  areas: AreaData[]                // replaces placements
  status
```

- Carry-over, plantings, fixed seasons, outdated marking, frost-date rules: unchanged, applied to areas
  (a planting is *placed* when it has an area).
- Minimum piece size: each side ≥ 2 × spacing radius (individual) or the minimum patch side (patch/thinning). A
  planting whose area would be smaller gets no area and is reported as "past niet".

## 5. Layout algorithm (`layoutAreas`)

Input: layers (rectangle or circle), fixed pieces per layer, plantings starting in the season (ratio, traits),
relations (by plant id). Output: areas + per-planting share (target %, actual %, plant count, fits).

1. **Free space**: per layer, band decomposition — cut the layer's bounding rectangle at every fixed piece's top and
   bottom edge into horizontal bands; within each band take the x-intervals not covered by fixed pieces; merge
   vertically adjacent rectangles with the same x-interval. Drop rectangles thinner than the smallest plant side.
   Circles use their bounding square; plant counts only count grid points whose footprint lies inside the circle.
2. **Order** plantings so companions are adjacent and hostile plants apart: score of an order = Σ adjacent pairs
   (+1 companion, −2 combative). ≤ 7 plantings: try all permutations; more: greedy (start with the planting with
   most relations, repeatedly append the best-scoring next one). Ties by planting id → deterministic.
3. **Targets**: free area F = Σ free rectangles; target_i = ratio_i / Σ ratios × F.
4. **Assign** plantings (in order) to free rectangles: fill the largest free rectangle first, then the next; a
   planting that does not fit in the remainder of the current rectangle goes to the next rectangle, unless its target
   would then be off by > 10 %, in which case it gets a piece in both (max 3 pieces).
5. **Partition** each free rectangle among its assigned plantings in order: **strips** along the long side (each strip
   full width, length ∝ target) when long side ≥ 2 × short side, else a **squarified treemap**.
6. **Snap** each piece down to whole plant spacings for individual plants (so the grid fits exactly); the slack is
   given to the next piece in the same rectangle.
7. **Towers**: every layer is its own free space; free rectangles of all layers take part in step 4 (lowest layer first).

Complexity: O(fixed pieces² + plantings! for ≤ 7, else plantings²) — independent of the number of plants.

## 6. Screens

- **Component Detail canvas** (new `SeasonAreaCanvas` organism replaces `PlantPlacementCanvas` there): draws each area
  as a rounded rectangle tinted by category with plant icon, name and count ("Ui · 780"); with ≤ 50 plants the grid
  positions are drawn as small plant icons; carried areas dimmed with "uit <seizoen>". Edit mode: drag to move,
  corner handle to resize (snapped to plant spacing, kept inside the layer, not overlapping other areas), tap to
  select → lock/unlock and "verwijderen" (removes the area; the planting stays, unplaced). Relationship indicators
  between touching areas (green companion, red hostile edge marker). Overlap warnings between areas only.
- **Planning screen**: result line per planting becomes "≈ 780 planten · 31 % (doel 33 %)" or "zaaivlak · 12 m²".
- **Home** (`ComponentSlide`, list row count) and **Layer overview**: draw areas; plant count = Σ counts.
- **AI chat snapshot**: each area becomes one snapshot plant at the area centre with patch width/height = area size
  (snapshot schema unchanged).

## 7. Storage

Store version 6. Migration v5 → v6: plantings and ratios kept; `placements` dropped and `areas: []`; seasons that
were `planned` become `outdated` (re-optimize once). Per-entry salvage as before for areas.

## 8. Removed

Individual placements and their machinery: `PositionSearch`, `SeasonPlacement` (fillByRatio), `PlacementLayer`,
`SearchStarts`, `MinHeap` (if only used there), `PlantPlacementCanvas` (if unused elsewhere), `useSeasonCanvas`,
the O(n²) `conflictingPlantIds` / `calculatePlantRelationships` uses on placements. Patch resize on placements.

## 9. Testing

- Unit: free-space decomposition (no obstacle, corner obstacle → 2 rects, middle obstacle → 4, circle), ordering
  (companions adjacent, hostile apart, deterministic), strips vs treemap choice, ratio accuracy (≤ 10 % off unless
  impossible), 2-piece split, snapping, plant counts (rectangle, circle), min-size "past niet", towers, determinism,
  Planning entity on areas (apply/move/resize/lock/remove, carried areas fixed, outdated marking), migration v5→v6.
- Performance gate (automated): domain layout + counts for 1500 × 2000 with 10 catalog plants < 50 ms in Node,
  and a `--jitless` benchmark script (compiled JS) reporting < 1 s.
- Maestro flows updated to area test IDs.

## 10. Controller decisions (user delegated)

- Strips/blocks threshold: long side ≥ 2 × short side.
- Individual plant drawing threshold: ≤ 50 plants per area.
- Order: exhaustive ≤ 7 plantings, greedy above.
- Max 3 pieces per area.
- Existing placements dropped on migration (plantings and ratios kept, planned seasons → outdated).
- Branch `feature/area-planning` from `master`; the unmerged `fix/optimizer-scaling` branch is superseded and left
  unmerged.
