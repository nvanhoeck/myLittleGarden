# Home Screen Slider Design

Date: 2026-10-07
Status: approved in conversation, pending written review

## Goal

Replace the 2D garden canvas on the home screen with a paged horizontal slider
that shows one component per slide in a simplified top view, plus a vertical
list of all components that jumps to the matching slide. All component CRUD
stays. Component dimensions stay editable. Canvas position, rotation and garden
size disappear from the product and the data model, with versioned migrations
for existing saved data.

## Non-goals

- No change to the ComponentDetail screen, PlantSelection, PlantDetails or the
  create/edit form (ComponentCreationModal, ComponentForm, ComponentTypeSelector).
- No change to plant positions inside a component. Plants keep positionX and
  positionY in centimeters relative to their component.
- No new npm dependencies. The slider uses React Native FlatList.
- No backend change in this repo. A backend instruction file is written instead.

## Home screen layout

Top to bottom:

1. Header: title and settings button (unchanged).
2. Slider: horizontal FlatList, `pagingEnabled`, one slide per component, each
   slide as wide as the screen. Takes the upper part of the screen.
3. Dot indicator: one dot per component, active dot highlighted. Hidden when
   there is one component or none.
4. List: vertical FlatList of ComponentListRow items, sorted by creation date
   ascending (same order as the slider). The row for the active slide is
   highlighted.
5. FAB "+" opens ComponentCreationModal in create mode (unchanged behavior).

Empty state: when there are no components the slider and list are replaced by
the existing `screens.home.emptyState` text centered on screen. FAB stays.

Sync rules:

- Swiping the slider updates the active index via `onViewableItemsChanged`
  with `itemVisiblePercentThreshold: 60`. The list highlight follows.
- Tapping a list row calls `scrollToIndex({ index, animated: true })` on the
  slider. The list does not scroll itself.
- After creating a component the slider scrolls to the new (last) slide.
- After deleting a component the active index clamps to the nearest valid
  index. If none remain, the empty state shows.
- The slider uses `getItemLayout` with the measured slide width so
  `scrollToIndex` never fails on unmeasured items.

## ComponentSlide (organism)

Pure presentational. Props: `component: ComponentData`, `getPlantById`
function, `slideWidth: number`, `onOpen`, `onEdit`, `onDelete`, `testID`.

Content:

- Drawing area: a square region (slideWidth minus horizontal padding, capped at
  280 px). The component is scaled uniformly to fit, using the same colors as
  the detail screen (`getComponentColor`). Boxes are rectangles with a 4 px
  radius; pots are circles. The border ring is drawn at the scaled border width.
- Plants: each placed plant is drawn as its icon (via `getPlantIcon`, falling
  back to the category emoji) centered at its scaled position inside the inner
  area. Icon size is 20 px, clamped so it stays inside the drawing. Patch plants
  are drawn the same way as point plants on the slide (icon only, no patch
  rectangle). Nothing is draggable or tappable in the drawing.
- Towers: layers are drawn nested from the outside in, bottom layer outermost,
  all centered. Layer dimensions reuse the 0.85 reduction factor unless the
  tower has `customLayers`. Each layer's plants are drawn inside that layer's
  outline. The existing green layer-count badge sits in the top-right corner.
- Caption under the drawing: name (one line), type label, outer dimensions
  (`W x L cm` or `Ø D cm`), sun direction, plant count.
- Actions row: three buttons, left to right: Open (primary, green), Edit
  (neutral), Delete (red text). Each has a testID:
  `component-slide-<id>-open`, `-edit`, `-delete`.

Layer geometry (`getTowerLayerDimensions`) is extracted into a pure function in
`src/domain/component/towerLayerGeometry.ts` and reused by
LayerOverviewModal so both views agree.

## ComponentListRow (molecule)

Pure presentational. Props: `component`, `isActive`, `onPress`, `testID`.
Shows type icon, name, dimensions, plant count and sun direction. Active row
gets a green left border and a slightly lighter background. Replaces the
InventoryItem from ComponentInventory. testID: `component-list-row-<id>`.

## Delete flow

Delete on a slide shows `Alert.alert` with the delete title and message strings
(moved from the old `contextMenu` block to a new `component` block in
`nl.json`). Confirm calls `removeComponent`. No "return to inventory" option
exists anymore.

## Data model changes

`BaseComponentData` loses `positionX`, `positionY` and `rotation`. The four
domain entities (GardenBox, Pot, RectangularTower, CircularTower) lose their
`position` field, `isPlaced`, `moveTo`, `rotate` and the meter-based width and
length getters that only served the canvas. `ComponentPosition.ts` is deleted.

Store changes in `componentStore.ts`:

- Remove `moveComponent`, `rotateComponent`, `getPlacedComponents`,
  `getUnplacedComponents`, `usePlacedComponents`, `useUnplacedComponents`.
- `STORE_VERSION` becomes 2. Add `migrate(persistedState, version)`: for
  version < 2, map every component to a copy without `positionX`, `positionY`
  and `rotation`. All other fields pass through untouched. The migration is a
  pure exported function `migrateComponentState` in
  `src/stores/migrations/componentStoreMigrations.ts` so it can be tested
  without Zustand.
- Unknown or malformed persisted state (no `components` array) migrates to
  `{ components: [] }` rather than crashing at startup.

Store changes in `gardenStore.ts`:

- Remove `gardenWidth`, `gardenHeight`, `setGardenSize`.
- Add `version: 1` and a `migrate` that deletes `gardenWidth` and
  `gardenHeight` from persisted state (version 0 has no version key; Zustand
  treats it as 0). Sun direction and frost dates pass through. Pure function
  `migrateGardenState` in `src/stores/migrations/gardenStoreMigrations.ts`.

## AI snapshot changes

- `ComponentSnapshot` loses `positionXInMeters`, `positionYInMeters`,
  `rotation`. `GardenMetadataSnapshot` loses `widthInMeters`, `heightInMeters`.
- `GARDEN_SNAPSHOT_VERSION` is bumped by one.
- `buildGardenSnapshot`, `buildComponentOptimizeRequest`, `useAiChat`,
  `chatRequestSchema` and `optimizeRequestSchema` follow.
- A new file `HOME-SLIDER-BE.md` in the repo root lists the removed fields and
  the new snapshot version for the backend team.

Sequencing constraint: if the backend validates these fields as required, chat
and optimize calls fail until the backend is updated. The user accepts this.

## Removals

- `src/components/organisms/GardenCanvas/` (whole folder)
- `src/components/organisms/ComponentInventory/`
- `src/components/organisms/ComponentContextMenu/`
- `src/components/molecules/GardenPreview/` (unused)
- `src/domain/component/ComponentPosition.ts`
- `nl.json` blocks: `componentInventory`, `gardenCanvas`, `canvas`,
  `contextMenu` (delete strings move to `component.delete*`), and the
  accessibility keys `gardenPreview`, `componentSelected`,
  `componentNotSelected`, `tapToSelect`, `longPressForOptions`.
- Barrel exports in `src/components/organisms/index.ts`,
  `src/components/molecules/index.ts`, `src/stores/index.ts`,
  `src/domain/component/index.ts` updated accordingly.

## New translation keys (`nl.json`)

```
"home": {
  "title": "Mijn Tuintje",
  "emptyState": "Je tuin is leeg. Voeg componenten toe om te beginnen.",
  "slideOf": "{{current}} van {{total}}"
},
"component": {
  "open": "Openen",
  "edit": "Bewerken",
  "delete": "Verwijderen",
  "deleteTitle": "Component verwijderen?",
  "deleteMessage": "Weet je zeker dat je '{{name}}' wilt verwijderen?",
  "plantCount": "{{count}} plant(en)",
  "layers": "{{count}} lagen"
}
```

## Error handling

- A plant whose `plantId` is missing from the plant store draws the generic
  seedling emoji; the slide never throws.
- `scrollToIndex` is wrapped so an out-of-range index is clamped.
- Migrations never throw: any field access is guarded and unexpected shapes
  fall back to empty state.

## Testing

The repo has no unit test runner. Migrations and layer geometry are written as
pure functions in dedicated files so a runner can be added later without
refactoring. Verification for this feature:

1. `npm run typecheck` passes.
2. Maestro flow `maestro/home_slider.yaml`: create two components, assert both
   slides exist, swipe left, assert second slide visible, tap the first list
   row, assert first slide visible, tap Open, assert ComponentDetail, go back,
   tap Delete, cancel, tap Delete, confirm, assert one component remains.
3. Manual migration check: install the new build over the previous version
   with saved components and confirm they appear in the slider with their
   plants intact.
