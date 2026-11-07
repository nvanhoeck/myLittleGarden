# Roads — design

Date: 2026-11-07
Status: model and rules agreed with the user in chat; screen details decided by the controller (listed in §9) after
the user asked to go straight to plan and implementation
Builds on: `2026-11-07-area-planning-design.md`

## 1. Why

A large garden box needs paths to reach the plants. The user wants to place **roads** between and around the areas of
a box — automatically with one button, or one by one on a border — and to see the areas shrink by the road width.
The area canvas also lost its zoom and scrolling when it replaced the plant canvas; it comes back as it was.

## 2. Ubiquitous language

| Term | Meaning |
|---|---|
| **Road** | A rectangle `{ id, xCm, yCm, widthCm, lengthCm, locked? }` in a garden box, cm from the top-left of the inner area (same space as area pieces). Part of the box itself: it holds in every season and every year. |
| **Road width** | The road's short side, in cm, as asked in the dialog. |
| **Border** | A segment where two areas of the shown season touch (shared edge, overlap length > 0), or where an area touches the box edge. |
| **Ring** | Four roads along the inside of the box edge (optional in the automatic dialog). |
| **Cut back** | Subtracting roads from an area's pieces. |

## 3. Decisions (from the user)

1. Roads belong to the **component** (fixed layout), not to a season.
2. **Garden boxes only.** Pots and towers get no road UI and no roads.
3. A road on a border covers **only the shared segment** (T-junctions and dead ends are fine).
4. The automatic dialog has a toggle **"ook rondom"** for the ring.
5. A new or widened road **cuts back areas in every season and year**, locked areas included.
6. Roads can be **locked** like areas. The automatic button removes all **unlocked** roads and places new ones;
   locked roads stay.
7. Pan and zoom **like before** (see §6.4).

## 4. Model

```
GardenBoxData
  ...
  roads?: RoadData[]          // optional; missing = no roads
RoadData
  id: string
  xCm, yCm, widthCm, lengthCm: number   // inside the inner area, widthCm/lengthCm > 0
  locked?: boolean
```

Store version 7. Migration v6 → v7: garden boxes get `roads: []`; nothing else changes. Invalid roads (outside the box,
non-positive size) are dropped by the per-entry salvage. Export to JSON carries the roads.

## 5. Domain rules (`src/domain/roads/`)

- **Road on a border** (`roadOnBorder(border, widthCm)`): between two areas the road is centred on the border line and
  spans the shared segment; each side loses `width / 2`. On the box edge the road lies inside the box against the edge
  (the area loses the full width). The road is clamped to the box.
- **Borders** (`bordersOf(areas, box)`): every shared edge segment between two pieces of different areas
  (vertical and horizontal), and every piece edge lying on the box edge. Segments of the same area are not borders.
  Segments already fully covered by a road are left out. Deterministic order (by position).
- **Automatic roads** (`automaticRoads(areas, box, widthCm, withRing, lockedRoads)`): a road on every border between
  two areas, plus the ring when `withRing`; borders already covered by a locked road get none. Only the border
  segments between areas are used — box-edge borders only via the ring.
- **Cut back** (`cutBack(pieces, roads, minSides)`): subtract the roads from each piece (rectangle difference);
  keep the at most 3 largest remaining rectangles whose sides are ≥ the plant's minimum side (as in area layout);
  no rectangle left → the area is removed (the planting stays, unplaced) and the season becomes `outdated`.
  Seasons whose areas only shrank keep their status.
- **Planning**: `Planning.cutBackByRoads(roads, minSideOf)` applies cut back to every area of every season.
  The component store applies it to every year's planning of the box whenever roads are added, widened or the
  automatic roads are placed. Removing or narrowing a road frees space but never grows areas back.
- **Optimizer**: roads are added to the fixed pieces of `layoutAreas` (layer 0), so new layouts keep clear of them.
- **Area edits**: moving or resizing an area onto a road is refused (same as overlapping another area).
- **Road edits**: a road's width can be changed (it stays centred on the same line; on the box edge it stays against
  the edge); a road can be locked/unlocked and removed. A road is never moved by hand.
- **Targets**: target percentages stay; plant counts and actual percentages follow the smaller areas.

## 6. Screens

### 6.1 Component Detail canvas (garden box)

- Roads are drawn under the areas as flat light-brown strips (`.season-road`), visible in view and edit mode.
  A locked road shows a small 🔒.
- **Edit mode**:
  - Every border without a road gets a round **+** button (28 px) at its middle (`.season-road-add`,
    testID `road-add-<index>`). Tap → width dialog.
  - Tapping a road opens the road dialog: width, lock/unlock, "Pad verwijderen" (with confirmation).
  - Toolbar button **"🛤 Paden"** opens the automatic dialog: width + toggle "ook rondom" → places the roads.
    Unlocked roads are replaced; a confirmation is asked when unlocked roads exist.
  - "Alles vergrendelen / ontgrendelen" also lock/unlock the roads.
- Width dialog: number in cm, default 30 (or the last used width), 10–200, integer; invalid input disables "OK".

### 6.2 Home and Layer overview

`ComponentSlide` draws the roads of a garden box under its areas (same colour).

### 6.3 Planning screen / AI snapshot

Unchanged (plant counts already follow the areas). The AI snapshot does not include roads.

### 6.4 Pan and zoom (as before the area canvas)

As in the old `PlantPlacementCanvas`: the canvas sits in a vertical `ScrollView` with a nested horizontal one,
scrolling only when the zoomed box is larger than the view, centred when zooming. Zoom buttons **+ / % / −**
bottom-left (0.5×–3×, step 0.25, testIDs `canvas-zoom-in`, `canvas-zoom-out`). Difference with before: zoom stays
available in edit mode (the + buttons need it on large boxes); dragging an area still moves the area, dragging the
background scrolls.

## 7. Errors

- A road that would cover nothing inside the box (zero length after clamping) is not added.
- Width outside 10–200 cm cannot be confirmed.
- An area removed by cut back is shown in the planning as unplaced ("past niet" is not used; the season is outdated).

## 8. Testing

- Unit: borders (adjacent, partial overlap, box edge, already covered), road on a border (centred, edge),
  automatic roads (between, ring, locked kept), cut back (edge strip, split in two, max 3 pieces, too small →
  removed, status outdated), Planning across seasons, store actions across years, migration v6→v7,
  optimizer keeps clear of roads, move/resize onto a road refused, view model (+ positions, road views).
- Maestro: add a road via +, automatic roads with ring, change width, zoom in/out.

## 9. Controller decisions

- Width default 30 cm, range 10–200 cm.
- Borders from the shown season's areas, carried areas included.
- Road colour light brown, drawn under areas.
- Zoom available in edit mode.
- The ring is four roads (top, bottom, left, right; the side roads between the top and bottom ones), each lockable.
