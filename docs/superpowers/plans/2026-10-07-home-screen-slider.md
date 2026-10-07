# Home Screen Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2D garden canvas on the home screen with a paged component slider plus a synced list, and drop canvas position, rotation and garden size from the data model with versioned migrations.

**Architecture:** New presentational organism `ComponentSlide` and molecule `ComponentListRow` are composed by a rewritten `HomeScreen` that owns the active index. Pure functions (migrations, tower layer geometry, slide geometry) live in their own files with `node --test` unit tests. The data model change happens after the UI swap so every commit type-checks.

**Tech Stack:** React Native 0.81 (Expo 54), TypeScript 5.9, NativeWind 4, Zustand 5 persist, Zod 3, Maestro, Node 23 built-in test runner (`node --test`, type stripping is on by default in Node 23.6).

**Spec:** `docs/superpowers/specs/2026-10-07-home-screen-slider-design.md`

## Global Constraints

- No new npm dependencies.
- All file writes go through the Node.js `fs.writeFileSync` pattern from CLAUDE.md when the Edit/Write tools fail with EPERM; the Read tool is fine for reading.
- Language of all UI strings is Dutch, kept in `src/i18n/nl.json`.
- Pure modules under test (`src/stores/migrations/*.ts`, `src/domain/component/towerLayerGeometry.ts`, `src/components/organisms/ComponentSlide/slideGeometry.ts`) must only use `import type` for `@/` paths so Node can run them without the Babel alias.
- `npm run typecheck` must pass at the end of every task.
- Every destructive action in the UI keeps a confirmation dialog.
- Component dimensions remain editable through the untouched `ComponentCreationModal`.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. Persisted component state written by the old app (version 1, with `positionX/positionY/rotation`) must load into the slider with plants, locks and patch fields intact. Test in Task 1.
2. Persisted component state that is missing or malformed (no `components` array, `null`, a string) must load as an empty garden, never crash on launch. Test in Task 1.
3. A placed plant whose position lies outside the inner area (old data, or a patch resized past the edge) must still draw inside the slide drawing, never outside it. Test in Task 5.
4. Deleting the last component while it is the active slide must show the empty state and not call `scrollToIndex` on an empty list. Covered by the index clamp in Task 6 and the Maestro flow in Task 9.
5. A tower whose `numberOfLayers` is 1 must draw a single outline and no nested layers. Test in Task 3 (geometry returns base dims for index 0) and visually in Task 6.

---

### Task 1: Component store migration with unit test runner

**Files:**
- Create: `src/stores/migrations/componentStoreMigrations.ts`
- Create: `src/stores/migrations/componentStoreMigrations.test.ts`
- Modify: `package.json` (scripts)
- Modify: `tsconfig.json` (exclude test files, Node types are not installed)

**Interfaces:**
- Produces: `migrateComponentState(persistedState: unknown, version: number): PersistedComponentState` where `PersistedComponentState = { components: ComponentData[] }`. `COMPONENT_STORE_VERSION = 2`.

- [ ] **Step 1: Add the unit test script and exclude tests from typecheck**

In `package.json` scripts add:

```json
"test:unit": "node --test \"src/**/*.test.ts\""
```

In `tsconfig.json` add at the top level (sibling of `include`):

```json
"exclude": ["node_modules", "**/*.test.ts"]
```

- [ ] **Step 2: Write the failing test**

`src/stores/migrations/componentStoreMigrations.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateComponentState, COMPONENT_STORE_VERSION } from './componentStoreMigrations.ts';

const legacyBox = {
  id: 'box-1',
  name: 'Bak',
  type: 'gardenBox',
  sunDirection: 'S',
  createdAt: '2026-01-01T00:00:00.000Z',
  borderWidthInCm: 5,
  positionX: 1.5,
  positionY: 2,
  rotation: 45,
  widthInCm: 120,
  lengthInCm: 80,
  plants: [
    {
      id: 'p-1',
      plantId: 'tomaat',
      positionX: 20,
      positionY: 30,
      placedAt: '2026-01-02T00:00:00.000Z',
      locked: true,
      patchWidthInCm: 40,
      patchHeightInCm: 20,
      patchRotationDeg: 15,
    },
  ],
};

test('version is 2', () => {
  assert.equal(COMPONENT_STORE_VERSION, 2);
});

test('strips canvas position and rotation from version 1 components', () => {
  const result = migrateComponentState({ components: [legacyBox] }, 1);
  const migrated = result.components[0] as Record<string, unknown>;
  assert.equal('positionX' in migrated, false);
  assert.equal('positionY' in migrated, false);
  assert.equal('rotation' in migrated, false);
});

test('keeps every other component field and the plants untouched', () => {
  const result = migrateComponentState({ components: [legacyBox] }, 1);
  const migrated = result.components[0] as Record<string, unknown>;
  assert.equal(migrated.id, 'box-1');
  assert.equal(migrated.widthInCm, 120);
  assert.equal(migrated.lengthInCm, 80);
  assert.equal(migrated.borderWidthInCm, 5);
  assert.deepEqual(migrated.plants, legacyBox.plants);
});

test('returns an empty garden when persisted state is malformed', () => {
  assert.deepEqual(migrateComponentState(null, 1), { components: [] });
  assert.deepEqual(migrateComponentState('garbage', 1), { components: [] });
  assert.deepEqual(migrateComponentState({ components: 'nope' }, 1), { components: [] });
});

test('passes current-version state through unchanged', () => {
  const current = { components: [{ ...legacyBox }] };
  delete (current.components[0] as Record<string, unknown>).positionX;
  const result = migrateComponentState(current, 2);
  assert.deepEqual(result, current);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL, "Cannot find module" for `componentStoreMigrations.ts`.

- [ ] **Step 4: Write the migration**

`src/stores/migrations/componentStoreMigrations.ts`:

```ts
/**
 * Persisted-state migrations for the component store.
 * Pure: no Zustand, no AsyncStorage, no `@/` runtime imports.
 */
import type { ComponentData } from '../../types/component.types';

/** Version 2: canvas position and rotation removed from components. */
export const COMPONENT_STORE_VERSION = 2;

export interface PersistedComponentState {
  components: ComponentData[];
}

const EMPTY_STATE: PersistedComponentState = { components: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stripCanvasFields(component: unknown): unknown {
  if (!isRecord(component)) return component;
  const { positionX: _x, positionY: _y, rotation: _r, ...rest } = component;
  return rest;
}

export function migrateComponentState(
  persistedState: unknown,
  version: number,
): PersistedComponentState {
  if (!isRecord(persistedState) || !Array.isArray(persistedState.components)) {
    return EMPTY_STATE;
  }

  if (version < 2) {
    return {
      components: persistedState.components.map(stripCanvasFields) as ComponentData[],
    };
  }

  return { components: persistedState.components as ComponentData[] };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:unit`
Expected: 5 passing.

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add package.json tsconfig.json src/stores/migrations/componentStoreMigrations.ts src/stores/migrations/componentStoreMigrations.test.ts
git commit -m "feat(store): component store migration to v2 with node test runner"
```

---

### Task 2: Garden store migration

**Files:**
- Create: `src/stores/migrations/gardenStoreMigrations.ts`
- Create: `src/stores/migrations/gardenStoreMigrations.test.ts`

**Interfaces:**
- Produces: `migrateGardenState(persistedState: unknown, version: number): PersistedGardenState` where `PersistedGardenState = { sunDirection: SunDirection | null; springFrostDate: string | null; fallFrostDate: string | null }` (dates are strings after JSON persistence). `GARDEN_STORE_VERSION = 1`.

- [ ] **Step 1: Write the failing test**

`src/stores/migrations/gardenStoreMigrations.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateGardenState, GARDEN_STORE_VERSION } from './gardenStoreMigrations.ts';

test('version is 1', () => {
  assert.equal(GARDEN_STORE_VERSION, 1);
});

test('drops garden width and height from version 0 state', () => {
  const result = migrateGardenState(
    {
      gardenWidth: 5,
      gardenHeight: 3,
      sunDirection: 'S',
      springFrostDate: '2026-04-15T00:00:00.000Z',
      fallFrostDate: '2026-10-20T00:00:00.000Z',
    },
    0,
  );
  assert.deepEqual(result, {
    sunDirection: 'S',
    springFrostDate: '2026-04-15T00:00:00.000Z',
    fallFrostDate: '2026-10-20T00:00:00.000Z',
  });
});

test('returns nulls when persisted state is malformed', () => {
  assert.deepEqual(migrateGardenState(undefined, 0), {
    sunDirection: null,
    springFrostDate: null,
    fallFrostDate: null,
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL, "Cannot find module" for `gardenStoreMigrations.ts`.

- [ ] **Step 3: Write the migration**

`src/stores/migrations/gardenStoreMigrations.ts`:

```ts
/**
 * Persisted-state migrations for the garden store.
 * Pure: no Zustand, no AsyncStorage, no `@/` runtime imports.
 */
import type { SunDirection } from '../../types/environment.types';

/** Version 1: garden width and height removed (no more 2D canvas). */
export const GARDEN_STORE_VERSION = 1;

export interface PersistedGardenState {
  sunDirection: SunDirection | null;
  springFrostDate: string | null;
  fallFrostDate: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function migrateGardenState(
  persistedState: unknown,
  _version: number,
): PersistedGardenState {
  if (!isRecord(persistedState)) {
    return { sunDirection: null, springFrostDate: null, fallFrostDate: null };
  }
  return {
    sunDirection: stringOrNull(persistedState.sunDirection) as SunDirection | null,
    springFrostDate: stringOrNull(persistedState.springFrostDate),
    fallFrostDate: stringOrNull(persistedState.fallFrostDate),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit`
Expected: 8 passing.

- [ ] **Step 5: Commit**

```bash
git add src/stores/migrations/gardenStoreMigrations.ts src/stores/migrations/gardenStoreMigrations.test.ts
git commit -m "feat(store): garden store migration dropping canvas size"
```

---

### Task 3: Shared tower layer geometry

**Files:**
- Create: `src/domain/component/towerLayerGeometry.ts`
- Create: `src/domain/component/towerLayerGeometry.test.ts`
- Modify: `src/domain/component/index.ts` (export)
- Modify: `src/components/organisms/LayerOverviewModal/LayerOverviewModal.tsx:42-96` (replace local `LAYER_REDUCTION_FACTOR` and `getLayerDimensions`)
- Modify: `src/screens/ComponentDetailScreen/ComponentDetailScreen.tsx:505-514` (replace local 0.85 math)

**Interfaces:**
- Produces: `getTowerLayerDimensions(baseInnerWidthCm: number, baseInnerHeightCm: number, layerIndex: number): LayerDimensionsCm` and `TOWER_LAYER_REDUCTION_FACTOR = 0.85`. `LayerDimensionsCm = { width: number; height: number }`.

Note: custom layer dimensions are intentionally not used for drawing. The detail screen stores plant positions against 0.85-reduced inner dimensions, so every view that draws plants must use the same math.

- [ ] **Step 1: Write the failing test**

`src/domain/component/towerLayerGeometry.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTowerLayerDimensions, TOWER_LAYER_REDUCTION_FACTOR } from './towerLayerGeometry.ts';

test('reduction factor is 0.85', () => {
  assert.equal(TOWER_LAYER_REDUCTION_FACTOR, 0.85);
});

test('bottom layer keeps base dimensions', () => {
  assert.deepEqual(getTowerLayerDimensions(100, 60, 0), { width: 100, height: 60 });
});

test('each layer shrinks by the reduction factor', () => {
  const second = getTowerLayerDimensions(100, 60, 1);
  assert.ok(Math.abs(second.width - 85) < 1e-9);
  assert.ok(Math.abs(second.height - 51) < 1e-9);
  const third = getTowerLayerDimensions(100, 60, 2);
  assert.ok(Math.abs(third.width - 72.25) < 1e-9);
});

test('never returns negative dimensions', () => {
  assert.deepEqual(getTowerLayerDimensions(-10, 0, 3), { width: 0, height: 0 });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL, "Cannot find module" for `towerLayerGeometry.ts`.

- [ ] **Step 3: Write the geometry function**

`src/domain/component/towerLayerGeometry.ts`:

```ts
/**
 * Tower layer geometry shared by every view that draws tower layers.
 * Plant positions are stored relative to these dimensions, so the
 * detail screen, layer overview and home slide must all agree.
 */

export const TOWER_LAYER_REDUCTION_FACTOR = 0.85;

export interface LayerDimensionsCm {
  width: number;
  height: number;
}

export function getTowerLayerDimensions(
  baseInnerWidthCm: number,
  baseInnerHeightCm: number,
  layerIndex: number,
): LayerDimensionsCm {
  const factor = Math.pow(TOWER_LAYER_REDUCTION_FACTOR, Math.max(0, layerIndex));
  return {
    width: Math.max(0, baseInnerWidthCm) * factor,
    height: Math.max(0, baseInnerHeightCm) * factor,
  };
}
```

Add to `src/domain/component/index.ts`:

```ts
export { getTowerLayerDimensions, TOWER_LAYER_REDUCTION_FACTOR } from './towerLayerGeometry';
export type { LayerDimensionsCm } from './towerLayerGeometry';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit`
Expected: 12 passing.

- [ ] **Step 5: Use it in LayerOverviewModal**

In `LayerOverviewModal.tsx` delete the local `LAYER_REDUCTION_FACTOR` constant and the local `getLayerDimensions` function. Add the import:

```ts
import { getTowerLayerDimensions } from '@/domain/component/towerLayerGeometry';
```

Replace the call inside `LayerView`:

```ts
const layerDimensions = getTowerLayerDimensions(widthCm, heightCm, layerIndex);
```

- [ ] **Step 6: Use it in ComponentDetailScreen**

Replace lines 505 to 514 with:

```ts
  const layerDimensions = useMemo(() => {
    if (!isTower) return innerDimensions;
    return getTowerLayerDimensions(innerDimensions.width, innerDimensions.height, selectedLayer);
  }, [isTower, innerDimensions, selectedLayer]);
```

Add the import next to the other `@/domain` or `@/stores` imports:

```ts
import { getTowerLayerDimensions } from '@/domain/component/towerLayerGeometry';
```

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add src/domain/component/towerLayerGeometry.ts src/domain/component/towerLayerGeometry.test.ts src/domain/component/index.ts src/components/organisms/LayerOverviewModal/LayerOverviewModal.tsx src/screens/ComponentDetailScreen/ComponentDetailScreen.tsx
git commit -m "refactor(domain): share tower layer geometry across views"
```

---

### Task 4: ComponentListRow molecule

**Files:**
- Create: `src/components/molecules/ComponentListRow/ComponentListRow.tsx`
- Create: `src/components/molecules/ComponentListRow/index.ts`
- Create: `src/utils/componentSummary.ts`
- Modify: `src/components/molecules/index.ts`
- Modify: `src/i18n/nl.json` (add `component` block)

**Interfaces:**
- Produces: `ComponentListRow({ component, isActive, onPress, testID })`.
- Produces: `src/utils/componentSummary.ts` with `getComponentTypeIcon(component): string`, `getComponentDimensionsLabel(component): string`, `getComponentColor(component): string`. These are the same helpers currently duplicated in ComponentInventory, ComponentRenderer and ComponentDetailScreen; Task 5 reuses them.

- [ ] **Step 1: Add translations**

In `src/i18n/nl.json`, add after the `"components"` block:

```json
  "component": {
    "open": "Openen",
    "edit": "Bewerken",
    "delete": "Verwijderen",
    "deleteTitle": "Component verwijderen?",
    "deleteMessage": "Weet je zeker dat je '{{name}}' wilt verwijderen?",
    "plantCount": "{{count}} plant(en)",
    "layers": "{{count}} lagen"
  },
```

And inside `"screens" > "home"` add `"slideOf": "{{current}} van {{total}}"`.

- [ ] **Step 2: Write the summary helpers**

`src/utils/componentSummary.ts`:

```ts
/**
 * Small presentational helpers shared by the home slider and list.
 */
import type { ComponentData } from '@/types';

export function getComponentTypeIcon(component: ComponentData): string {
  switch (component.type) {
    case 'gardenBox':
      return '□';
    case 'pot':
      return '○';
    case 'rectangularTower':
      return '▲';
    case 'circularTower':
      return '△';
  }
}

export function getComponentDimensionsLabel(component: ComponentData): string {
  switch (component.type) {
    case 'gardenBox':
    case 'rectangularTower':
      return `${component.widthInCm} x ${component.lengthInCm} cm`;
    case 'pot':
    case 'circularTower':
      return `Ø ${component.diameterInCm} cm`;
  }
}

export function getComponentColor(component: ComponentData): string {
  switch (component.type) {
    case 'gardenBox':
      return '#8B4513';
    case 'pot':
      return '#CD853F';
    case 'rectangularTower':
      return '#A0522D';
    case 'circularTower':
      return '#D2691E';
  }
}

export function isTowerComponent(component: ComponentData): boolean {
  return component.type === 'rectangularTower' || component.type === 'circularTower';
}
```

- [ ] **Step 3: Write the row**

`src/components/molecules/ComponentListRow/ComponentListRow.tsx`:

```tsx
/**
 * ComponentListRow
 * One row in the home screen component list. Tapping it jumps the slider.
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ComponentData } from '@/types';
import { getComponentTypeIcon, getComponentDimensionsLabel } from '@/utils/componentSummary';

interface ComponentListRowProps {
  component: ComponentData;
  isActive: boolean;
  onPress: (component: ComponentData) => void;
  testID?: string;
}

export function ComponentListRow({
  component,
  isActive,
  onPress,
  testID,
}: ComponentListRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const rowTestID = testID ?? `component-list-row-${component.id}`;

  return (
    <Pressable
      onPress={() => onPress(component)}
      className={
        isActive
          ? 'flex-row items-center rounded-lg px-3 py-3 mb-2 bg-green-900/60 border-l-4 border-green-400'
          : 'flex-row items-center rounded-lg px-3 py-3 mb-2 bg-surface-variant/30 border-l-4 border-transparent'
      }
      android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
      testID={rowTestID}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${component.name}, ${t(`components.${component.type}`)}`}
    >
      <View className="w-10 h-10 rounded-full bg-green-800/50 items-center justify-center mr-3">
        <Text className="text-xl text-green-300">{getComponentTypeIcon(component)}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-white font-medium" numberOfLines={1}>
          {component.name}
        </Text>
        <Text className="text-green-400 text-xs">
          {getComponentDimensionsLabel(component)} • {t('component.plantCount', { count: component.plants.length })}
        </Text>
      </View>
      <View className="items-center ml-2">
        <Text className="text-yellow-400 text-xs">☀</Text>
        <Text className="text-green-500 text-xs">{component.sunDirection}</Text>
      </View>
    </Pressable>
  );
}
```

`src/components/molecules/ComponentListRow/index.ts`:

```ts
export { ComponentListRow } from './ComponentListRow';
```

Add to `src/components/molecules/index.ts`:

```ts
export { ComponentListRow } from './ComponentListRow';
```

- [ ] **Step 4: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add src/components/molecules/ComponentListRow src/components/molecules/index.ts src/utils/componentSummary.ts src/i18n/nl.json
git commit -m "feat(ui): component list row molecule"
```

---

### Task 5: ComponentSlide organism with slide geometry

**Files:**
- Create: `src/components/organisms/ComponentSlide/slideGeometry.ts`
- Create: `src/components/organisms/ComponentSlide/slideGeometry.test.ts`
- Create: `src/components/organisms/ComponentSlide/ComponentSlide.tsx`
- Create: `src/components/organisms/ComponentSlide/index.ts`
- Modify: `src/components/organisms/index.ts`

**Interfaces:**
- Consumes: `getTowerLayerDimensions` (Task 3), helpers from `@/utils/componentSummary` (Task 4), `getPlantIcon`/`hasPlantIcon` from `@/assets`, `PLANT_CATEGORIES` from `@/types/plant.types`.
- Produces: `ComponentSlide({ component, getPlantById, slideWidth, onOpen, onEdit, onDelete, testID })`.
- Produces: `slideGeometry.ts` with `fitScale(widthCm, heightCm, maxPx): number` and `clampIconPosition(xCm, yCm, areaWidthCm, areaHeightCm, scale, iconPx): { left: number; top: number }`.

- [ ] **Step 1: Write the failing geometry test**

`src/components/organisms/ComponentSlide/slideGeometry.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitScale, clampIconPosition } from './slideGeometry.ts';

test('fitScale scales the longest side to maxPx', () => {
  assert.equal(fitScale(200, 100, 280), 1.4);
  assert.equal(fitScale(100, 200, 280), 1.4);
});

test('fitScale returns 0 for non-positive dimensions', () => {
  assert.equal(fitScale(0, 100, 280), 0);
  assert.equal(fitScale(100, -5, 280), 0);
});

test('clampIconPosition centers the icon on the scaled position', () => {
  const pos = clampIconPosition(50, 25, 100, 100, 2, 20);
  assert.deepEqual(pos, { left: 90, top: 40 });
});

test('clampIconPosition keeps the icon inside the area', () => {
  const low = clampIconPosition(-30, -30, 100, 100, 2, 20);
  assert.deepEqual(low, { left: 0, top: 0 });
  const high = clampIconPosition(500, 500, 100, 100, 2, 20);
  assert.deepEqual(high, { left: 180, top: 180 });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL, "Cannot find module" for `slideGeometry.ts`.

- [ ] **Step 3: Write the geometry**

`src/components/organisms/ComponentSlide/slideGeometry.ts`:

```ts
/**
 * Pure layout math for the read-only component drawing on a home slide.
 */

/** Uniform scale (px per cm) so the longest side fits in maxPx. */
export function fitScale(widthCm: number, heightCm: number, maxPx: number): number {
  if (widthCm <= 0 || heightCm <= 0 || maxPx <= 0) return 0;
  return maxPx / Math.max(widthCm, heightCm);
}

/**
 * Top-left pixel position of an icon centered on (xCm, yCm), clamped so
 * the whole icon stays inside the area.
 */
export function clampIconPosition(
  xCm: number,
  yCm: number,
  areaWidthCm: number,
  areaHeightCm: number,
  scale: number,
  iconPx: number,
): { left: number; top: number } {
  const areaWidthPx = areaWidthCm * scale;
  const areaHeightPx = areaHeightCm * scale;
  const maxLeft = Math.max(0, areaWidthPx - iconPx);
  const maxTop = Math.max(0, areaHeightPx - iconPx);
  const left = Math.min(maxLeft, Math.max(0, xCm * scale - iconPx / 2));
  const top = Math.min(maxTop, Math.max(0, yCm * scale - iconPx / 2));
  return { left, top };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit`
Expected: 16 passing.

- [ ] **Step 5: Write the slide**

`src/components/organisms/ComponentSlide/ComponentSlide.tsx`:

```tsx
/**
 * ComponentSlide
 * Read-only top view of one garden component for the home slider.
 * Purely presentational: all actions are callbacks.
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ComponentData, PlacedPlantData, PlantData } from '@/types';
import { PLANT_CATEGORIES } from '@/types/plant.types';
import { getPlantIcon, hasPlantIcon } from '@/assets';
import { getTowerLayerDimensions } from '@/domain/component/towerLayerGeometry';
import {
  getComponentColor,
  getComponentDimensionsLabel,
  isTowerComponent,
} from '@/utils/componentSummary';
import { fitScale, clampIconPosition } from './slideGeometry';

const DRAWING_MAX_PX = 280;
const SLIDE_HORIZONTAL_PADDING = 32;
const ICON_PX = 20;

interface ComponentSlideProps {
  component: ComponentData;
  getPlantById: (plantId: string) => PlantData | undefined;
  slideWidth: number;
  onOpen: (component: ComponentData) => void;
  onEdit: (component: ComponentData) => void;
  onDelete: (component: ComponentData) => void;
  testID?: string;
}

function getOuterDimensionsCm(component: ComponentData): { width: number; height: number } {
  switch (component.type) {
    case 'gardenBox':
    case 'rectangularTower':
      return { width: component.widthInCm, height: component.lengthInCm };
    case 'pot':
    case 'circularTower':
      return { width: component.diameterInCm, height: component.diameterInCm };
  }
}

function getNumberOfLayers(component: ComponentData): number {
  return isTowerComponent(component) && 'numberOfLayers' in component
    ? Math.max(1, component.numberOfLayers)
    : 1;
}

function PlantIcon({ plantData }: { plantData: PlantData | undefined }): React.JSX.Element {
  if (plantData && hasPlantIcon(plantData.id)) {
    const source = getPlantIcon(plantData.id);
    if (source) {
      return <Image source={source} style={{ width: ICON_PX, height: ICON_PX }} resizeMode="contain" />;
    }
  }
  const category = plantData ? PLANT_CATEGORIES.find((c) => c.key === plantData.category) : undefined;
  return <Text style={{ fontSize: 14 }}>{category?.icon ?? '🌱'}</Text>;
}

interface LayerDrawingProps {
  layerIndex: number;
  baseInnerWidthCm: number;
  baseInnerHeightCm: number;
  scale: number;
  isCircular: boolean;
  plants: readonly PlacedPlantData[];
  getPlantById: (plantId: string) => PlantData | undefined;
}

function LayerDrawing({
  layerIndex,
  baseInnerWidthCm,
  baseInnerHeightCm,
  scale,
  isCircular,
  plants,
  getPlantById,
}: LayerDrawingProps): React.JSX.Element {
  const dims = getTowerLayerDimensions(baseInnerWidthCm, baseInnerHeightCm, layerIndex);
  const widthPx = dims.width * scale;
  const heightPx = dims.height * scale;

  return (
    <View
      style={{
        position: 'absolute',
        width: widthPx,
        height: heightPx,
        borderRadius: isCircular ? widthPx / 2 : 4,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.6)',
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
      }}
    >
      {plants.map((plant) => {
        const pos = clampIconPosition(plant.positionX, plant.positionY, dims.width, dims.height, scale, ICON_PX);
        return (
          <View key={plant.id} style={{ position: 'absolute', left: pos.left, top: pos.top, width: ICON_PX, height: ICON_PX, alignItems: 'center', justifyContent: 'center' }}>
            <PlantIcon plantData={getPlantById(plant.plantId)} />
          </View>
        );
      })}
    </View>
  );
}

export function ComponentSlide({
  component,
  getPlantById,
  slideWidth,
  onOpen,
  onEdit,
  onDelete,
  testID,
}: ComponentSlideProps): React.JSX.Element {
  const { t } = useTranslation();
  const slideTestID = testID ?? `component-slide-${component.id}`;

  const outer = getOuterDimensionsCm(component);
  const borderCm = component.borderWidthInCm;
  const inner = {
    width: Math.max(0, outer.width - borderCm * 2),
    height: Math.max(0, outer.height - borderCm * 2),
  };
  const isCircular = component.type === 'pot' || component.type === 'circularTower';
  const isTower = isTowerComponent(component);
  const numberOfLayers = getNumberOfLayers(component);

  const drawingMaxPx = Math.min(DRAWING_MAX_PX, slideWidth - SLIDE_HORIZONTAL_PADDING);
  const scale = fitScale(outer.width, outer.height, drawingMaxPx);
  const outerPx = { width: outer.width * scale, height: outer.height * scale };
  const borderPx = borderCm * scale;

  const layerIndexes = useMemo(
    () => Array.from({ length: numberOfLayers }, (_, i) => i),
    [numberOfLayers],
  );

  const plantsByLayer = useMemo(() => {
    const map = new Map<number, PlacedPlantData[]>();
    for (const plant of component.plants) {
      const index = isTower ? plant.layerIndex ?? 0 : 0;
      const list = map.get(index) ?? [];
      list.push(plant);
      map.set(index, list);
    }
    return map;
  }, [component.plants, isTower]);

  return (
    <View style={{ width: slideWidth }} className="items-center px-4" testID={slideTestID}>
      {/* Drawing */}
      <View
        style={{ width: drawingMaxPx, height: drawingMaxPx }}
        className="items-center justify-center"
      >
        <View
          style={{
            width: outerPx.width,
            height: outerPx.height,
            backgroundColor: getComponentColor(component),
            borderRadius: isCircular ? outerPx.width / 2 : 6,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Inner area (border ring is the gap between outer and inner) */}
          <View
            style={{
              width: inner.width * scale,
              height: inner.height * scale,
              borderRadius: isCircular ? (inner.width * scale) / 2 : 4,
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {layerIndexes.map((layerIndex) => (
              <LayerDrawing
                key={layerIndex}
                layerIndex={layerIndex}
                baseInnerWidthCm={inner.width}
                baseInnerHeightCm={inner.height}
                scale={scale}
                isCircular={isCircular}
                plants={plantsByLayer.get(layerIndex) ?? []}
                getPlantById={getPlantById}
              />
            ))}
          </View>
          {isTower && (
            <View
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                backgroundColor: '#16a34a',
                borderRadius: 10,
                width: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              testID={`${slideTestID}-layers`}
            >
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{numberOfLayers}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Caption */}
      <Text className="text-white text-title-large mt-3" numberOfLines={1} testID={`${slideTestID}-name`}>
        {component.name}
      </Text>
      <Text className="text-green-400 text-body-medium mt-1">
        {t(`components.${component.type}`)} • {getComponentDimensionsLabel(component)}
      </Text>
      <Text className="text-green-500 text-body-small mt-1">
        ☀ {component.sunDirection} • {t('component.plantCount', { count: component.plants.length })}
        {isTower ? ` • ${t('component.layers', { count: numberOfLayers })}` : ''}
      </Text>

      {/* Actions */}
      <View className="flex-row gap-2 mt-4">
        <Pressable
          onPress={() => onOpen(component)}
          className="px-4 py-2 rounded-lg bg-green-600"
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          testID={`${slideTestID}-open`}
          accessibilityRole="button"
        >
          <Text className="text-white font-medium">{t('component.open')}</Text>
        </Pressable>
        <Pressable
          onPress={() => onEdit(component)}
          className="px-4 py-2 rounded-lg bg-gray-700"
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
          testID={`${slideTestID}-edit`}
          accessibilityRole="button"
        >
          <Text className="text-white font-medium">{t('component.edit')}</Text>
        </Pressable>
        <Pressable
          onPress={() => onDelete(component)}
          className="px-4 py-2 rounded-lg bg-gray-800"
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
          testID={`${slideTestID}-delete`}
          accessibilityRole="button"
        >
          <Text className="text-red-400 font-medium">{t('component.delete')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
```

Note: `borderPx` is computed for the ring but the ring is drawn as the gap between the outer colored shape and the darker inner area, so no separate border element is needed. Remove the `borderPx` constant if the typecheck flags it as unused (it will not, but keep the code lint-clean by deleting it).

`src/components/organisms/ComponentSlide/index.ts`:

```ts
export { ComponentSlide } from './ComponentSlide';
```

Add to `src/components/organisms/index.ts`:

```ts
export { ComponentSlide } from './ComponentSlide';
```

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add src/components/organisms/ComponentSlide src/components/organisms/index.ts
git commit -m "feat(ui): component slide organism with read-only drawing"
```

---

### Task 6: HomeScreen rewrite and old canvas removal

**Files:**
- Rewrite: `src/screens/HomeScreen/HomeScreen.tsx`
- Delete: `src/components/organisms/GardenCanvas/` (all files)
- Delete: `src/components/organisms/ComponentInventory/`
- Delete: `src/components/organisms/ComponentContextMenu/`
- Delete: `src/components/molecules/GardenPreview/`
- Modify: `src/components/organisms/index.ts`, `src/components/molecules/index.ts`
- Modify: `src/components/organisms/LayerOverviewModal/LayerOverviewModal.tsx` (uses `componentInventory.layers` key)
- Modify: `src/i18n/nl.json` (remove `componentInventory`, `gardenCanvas`, `canvas`, `contextMenu`, and accessibility keys `gardenPreview`, `componentSelected`, `componentNotSelected`, `tapToSelect`, `longPressForOptions`)

**Interfaces:**
- Consumes: `ComponentSlide` (Task 5), `ComponentListRow` (Task 4), `ComponentCreationModal` (unchanged), `useAllComponents`, `useComponentStore`, `usePlantStore`.

- [ ] **Step 1: Rewrite HomeScreen**

`src/screens/HomeScreen/HomeScreen.tsx`:

```tsx
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Text, Pressable, FlatList, Alert, useWindowDimensions } from 'react-native';
import type { ViewToken } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeScreenProps } from '@/navigation/navigationTypes';
import { useAllComponents, useComponentStore } from '@/stores';
import { usePlantStore } from '@/stores/plantStore';
import { ComponentCreationModal, ComponentSlide } from '@/components/organisms';
import { ComponentListRow } from '@/components/molecules';
import type { ComponentData } from '@/types';

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

/**
 * HomeScreen - paged slider of components with a synced list below.
 */
export function HomeScreen({ navigation }: HomeScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const allComponents = useAllComponents();
  const removeComponent = useComponentStore((state) => state.removeComponent);
  const getPlantById = usePlantStore((state) => state.getPlantById);

  const components = useMemo(
    () => [...allComponents].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [allComponents],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isCreationModalVisible, setIsCreationModalVisible] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ComponentData | null>(null);
  const sliderRef = useRef<FlatList<ComponentData>>(null);
  const pendingScrollToId = useRef<string | null>(null);

  const clampedIndex = Math.min(activeIndex, Math.max(0, components.length - 1));

  const scrollToIndex = useCallback(
    (index: number) => {
      if (components.length === 0) return;
      const safe = Math.min(Math.max(0, index), components.length - 1);
      sliderRef.current?.scrollToIndex({ index: safe, animated: true });
      setActiveIndex(safe);
    },
    [components.length],
  );

  // Keep the active index valid after deletions.
  useEffect(() => {
    if (activeIndex !== clampedIndex) setActiveIndex(clampedIndex);
  }, [activeIndex, clampedIndex]);

  // After creating a component, jump to its slide once it is in the list.
  useEffect(() => {
    const id = pendingScrollToId.current;
    if (!id) return;
    const index = components.findIndex((c) => c.id === id);
    if (index >= 0) {
      pendingScrollToId.current = null;
      scrollToIndex(index);
    }
  }, [components, scrollToIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable && v.index !== null);
    if (first && first.index !== null) setActiveIndex(first.index);
  }).current;

  const getItemLayout = useCallback(
    (_: ArrayLike<ComponentData> | null | undefined, index: number) => ({
      length: windowWidth,
      offset: windowWidth * index,
      index,
    }),
    [windowWidth],
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSettingsPress = useCallback(() => navigation.navigate('Settings'), [navigation]);
  const handleFabPress = useCallback(() => setIsCreationModalVisible(true), []);

  const handleCloseCreationModal = useCallback(() => {
    setIsCreationModalVisible(false);
    setEditingComponent(null);
  }, []);

  const handleComponentCreated = useCallback((componentId: string) => {
    pendingScrollToId.current = componentId;
  }, []);

  const handleOpen = useCallback(
    (component: ComponentData) => navigation.navigate('ComponentDetail', { componentId: component.id }),
    [navigation],
  );

  const handleEdit = useCallback((component: ComponentData) => {
    setEditingComponent(component);
    setIsCreationModalVisible(true);
  }, []);

  const handleDelete = useCallback(
    (component: ComponentData) => {
      Alert.alert(
        t('component.deleteTitle'),
        t('component.deleteMessage', { name: component.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.delete'), style: 'destructive', onPress: () => removeComponent(component.id) },
        ],
      );
    },
    [t, removeComponent],
  );

  const handleRowPress = useCallback(
    (component: ComponentData) => {
      const index = components.findIndex((c) => c.id === component.id);
      if (index >= 0) scrollToIndex(index);
    },
    [components, scrollToIndex],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const renderSlide = useCallback(
    ({ item }: { item: ComponentData }) => (
      <ComponentSlide
        component={item}
        getPlantById={getPlantById}
        slideWidth={windowWidth}
        onOpen={handleOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    ),
    [getPlantById, windowWidth, handleOpen, handleEdit, handleDelete],
  );

  const renderRow = useCallback(
    ({ item, index }: { item: ComponentData; index: number }) => (
      <ComponentListRow component={item} isActive={index === clampedIndex} onPress={handleRowPress} />
    ),
    [clampedIndex, handleRowPress],
  );

  const keyExtractor = useCallback((item: ComponentData) => item.id, []);
  const activeComponent = components[clampedIndex];

  return (
    <SafeAreaView className="flex-1 bg-background" testID="home-screen">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 h-14">
        <Text className="text-headline-small text-on-background font-medium">
          {t('screens.home.title')}
        </Text>
        <Pressable
          onPress={handleSettingsPress}
          className="w-touch-target h-touch-target items-center justify-center rounded-full"
          testID="settings-button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true }}
        >
          <Text className="text-2xl text-on-surface">⚙️</Text>
        </Pressable>
      </View>

      {components.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8" testID="home-empty-state">
          <Text className="text-on-surface-variant text-body-large text-center">
            {t('screens.home.emptyState')}
          </Text>
        </View>
      ) : (
        <>
          {/* Slider */}
          <FlatList
            ref={sliderRef}
            data={components}
            renderItem={renderSlide}
            keyExtractor={keyExtractor}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            getItemLayout={getItemLayout}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={VIEWABILITY_CONFIG}
            onScrollToIndexFailed={() => undefined}
            style={{ flexGrow: 0 }}
            testID="home-component-slider"
          />

          {/* Dot indicator */}
          {components.length > 1 && (
            <View className="flex-row items-center justify-center gap-1 py-2" testID="home-slider-dots">
              {components.map((c, index) => (
                <View
                  key={c.id}
                  className={index === clampedIndex ? 'w-2 h-2 rounded-full bg-green-400' : 'w-2 h-2 rounded-full bg-gray-600'}
                />
              ))}
              <Text className="text-gray-400 text-xs ml-2" testID="home-slider-counter">
                {t('screens.home.slideOf', { current: clampedIndex + 1, total: components.length })}
              </Text>
            </View>
          )}

          {/* List */}
          <FlatList
            data={components}
            renderItem={renderRow}
            keyExtractor={keyExtractor}
            extraData={activeComponent?.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 96 }}
            className="flex-1"
            testID="home-component-list"
          />
        </>
      )}

      <Pressable
        onPress={handleFabPress}
        className="absolute bottom-6 right-4 w-14 h-14 bg-green-600 rounded-full items-center justify-center shadow-lg"
        testID="add-component-fab"
        accessibilityLabel={t('componentCreation.addComponent')}
        accessibilityRole="button"
        android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </Pressable>

      <ComponentCreationModal
        visible={isCreationModalVisible}
        onClose={handleCloseCreationModal}
        onCreated={handleComponentCreated}
        editingComponent={editingComponent}
        testID="home-creation-modal"
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Delete the old UI**

```bash
git rm -r -q src/components/organisms/GardenCanvas src/components/organisms/ComponentInventory src/components/organisms/ComponentContextMenu src/components/molecules/GardenPreview
```

Update `src/components/organisms/index.ts` to:

```ts
// Organisms - Complex UI components (headers, forms, lists, etc.)
export { ComponentCreationModal, ComponentTypeSelector, ComponentForm } from './ComponentCreationModal';
export { ComponentSlide } from './ComponentSlide';
export { PlantPlacementCanvas } from './PlantPlacementCanvas';
export { QuickInfoGrid } from './QuickInfoGrid';
export { GrowingCalendar } from './GrowingCalendar';
export { CompanionList } from './CompanionList';
export { LayerOverviewModal } from './LayerOverviewModal';
```

Update `src/components/molecules/index.ts` to:

```ts
// Molecules - Combinations of atoms (form fields, cards, etc.)
export { ComponentListRow } from './ComponentListRow';
export { RelationshipIndicator } from './RelationshipIndicator';
export { RelationshipTooltip } from './RelationshipTooltip';
export { TowerLayerTabs } from './TowerLayerTabs';
```

- [ ] **Step 3: Clean translations**

In `LayerOverviewModal.tsx` replace `{t('componentInventory.layers')}` with `{t('component.layers', { count: numberOfLayers })}` and drop the `{numberOfLayers} ` prefix in front of it (the key now includes the count).

In `nl.json` delete the `componentInventory`, `gardenCanvas`, `canvas` and `contextMenu` blocks and the five accessibility keys listed above. Run `node -e "JSON.parse(require('fs').readFileSync('src/i18n/nl.json','utf8')); console.log('ok')"` to confirm the file is still valid JSON.

- [ ] **Step 4: Typecheck and grep for leftovers**

Run: `npm run typecheck`
Expected: no errors.

Run: `grep -rn "componentInventory\|contextMenu\.\|gardenCanvas\|canvas\.mode\|GardenPreview\|ComponentContextMenu\|ComponentInventory\|GardenCanvas" src`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add -A src/screens/HomeScreen src/components src/i18n/nl.json
git commit -m "feat(home): replace 2D canvas with component slider and list"
```

---

### Task 7: Remove canvas position and rotation from the data model

**Files:**
- Modify: `src/types/component.types.ts:17-29`
- Delete: `src/domain/component/ComponentPosition.ts`
- Modify: `src/domain/component/GardenBox.ts`, `Pot.ts`, `RectangularTower.ts`, `CircularTower.ts`
- Modify: `src/domain/component/index.ts`
- Modify: `src/stores/componentStore.ts`
- Modify: `src/stores/gardenStore.ts`
- Modify: `src/stores/index.ts`

**Interfaces:**
- Consumes: `migrateComponentState`, `COMPONENT_STORE_VERSION` (Task 1); `migrateGardenState`, `GARDEN_STORE_VERSION` (Task 2).
- Produces: `BaseComponentData` without `positionX`, `positionY`, `rotation`. `useComponentStore` without `moveComponent`, `rotateComponent`, `getPlacedComponents`, `getUnplacedComponents`. `useGardenStore` without `gardenWidth`, `gardenHeight`, `setGardenSize`.

- [ ] **Step 1: Types**

In `src/types/component.types.ts` remove these three lines from `BaseComponentData`:

```ts
  readonly positionX: number; // Position on canvas in meters
  readonly positionY: number; // Position on canvas in meters
  readonly rotation: number; // Rotation angle in degrees (0-360)
```

- [ ] **Step 2: Domain entities**

For each of `GardenBox.ts`, `Pot.ts`, `RectangularTower.ts`, `CircularTower.ts`:

1. Remove `import { ComponentPosition } from './ComponentPosition';`.
2. Remove the `_position: ComponentPosition` constructor parameter and every argument passed for it (`ComponentPosition.atOrigin()`, `ComponentPosition.fromData({...})`, `this._position`, `this._position.moveTo(x, y)`, `this._position.rotateTo(degrees)`).
3. Remove the `position` getter, the `isPlaced` getter, the `moveTo` method, the `rotateTo` method, and the `*InMeters` getters (`widthInMeters`, `lengthInMeters`, `diameterInMeters`).
4. In `toData()` remove `const positionData = this._position.toData();` and the three `positionX/positionY/rotation` properties.

Example result for `GardenBox.toData()`:

```ts
  toData(): GardenBoxData {
    return {
      id: this._id,
      type: 'gardenBox',
      name: this._name,
      sunDirection: this._sunDirection,
      createdAt: this._createdAt.toISOString(),
      widthInCm: this._widthInCm,
      lengthInCm: this._lengthInCm,
      borderWidthInCm: this._borderWidthInCm,
      plants: [],
    };
  }
```

Delete the file:

```bash
git rm -q src/domain/component/ComponentPosition.ts
```

In `src/domain/component/index.ts` remove the two `ComponentPosition` export lines.

- [ ] **Step 3: Component store**

In `src/stores/componentStore.ts`:

1. Replace `const STORE_VERSION = 1;` and its comment with:

```ts
import { migrateComponentState, COMPONENT_STORE_VERSION } from './migrations/componentStoreMigrations';
```

(put the import with the other imports and delete the constant).

2. Remove from the `ComponentState` interface: `moveComponent`, `rotateComponent`, `getPlacedComponents`, `getUnplacedComponents`.
3. Remove the implementations of `moveComponent`, `rotateComponent`, `getPlacedComponents`, `getUnplacedComponents`.
4. In the persist options replace `version: STORE_VERSION,` with:

```ts
      version: COMPONENT_STORE_VERSION,
      migrate: (persistedState, version) =>
        migrateComponentState(persistedState, version) as unknown as ComponentState,
```

5. Delete the `usePlacedComponents` and `useUnplacedComponents` hooks.
6. In `useComponentActions` remove the `moveComponent` and `rotateComponent` lines.

In `src/stores/index.ts` remove `usePlacedComponents,` and `useUnplacedComponents,`.

- [ ] **Step 4: Garden store**

Rewrite `src/stores/gardenStore.ts`:

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SunDirection } from '@/types/environment.types';
import { migrateGardenState, GARDEN_STORE_VERSION } from './migrations/gardenStoreMigrations';

interface GardenState {
  sunDirection: SunDirection | null;
  springFrostDate: Date | null;
  fallFrostDate: Date | null;
  setSunDirection: (direction: SunDirection) => void;
  setFrostDates: (spring: Date, fall: Date) => void;
}

export const useGardenStore = create<GardenState>()(
  persist(
    (set) => ({
      sunDirection: null,
      springFrostDate: null,
      fallFrostDate: null,
      setSunDirection: (direction) => set({ sunDirection: direction }),
      setFrostDates: (spring, fall) =>
        set({ springFrostDate: spring, fallFrostDate: fall }),
    }),
    {
      name: 'garden-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: GARDEN_STORE_VERSION,
      migrate: (persistedState, version) =>
        migrateGardenState(persistedState, version) as unknown as GardenState,
    }
  )
);
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: errors only in `src/domain/ai/buildGardenSnapshot.ts`, `src/domain/ai/buildComponentOptimizeRequest.ts` and `src/hooks/ai/useAiChat.ts` (they still read the removed fields; Task 8 fixes them). If any other file errors, fix it in this task.

- [ ] **Step 6: Run unit tests and commit**

Run: `npm run test:unit`
Expected: 16 passing.

```bash
git add -A src/types src/domain/component src/stores
git commit -m "refactor(domain): drop canvas position, rotation and garden size with migrations"
```

---

### Task 8: AI snapshot and schemas follow the data model

**Files:**
- Modify: `src/domain/ai/GardenSnapshot.ts`
- Modify: `src/domain/ai/buildGardenSnapshot.ts`
- Modify: `src/domain/ai/buildComponentOptimizeRequest.ts`
- Modify: `src/hooks/ai/useAiChat.ts:86-96`
- Modify: `src/schemas/ai/chatRequestSchema.ts`
- Modify: `src/schemas/ai/optimizeRequestSchema.ts`
- Create: `HOME-SLIDER-BE.md`

**Interfaces:**
- Produces: `GARDEN_SNAPSHOT_VERSION = '2.0'`. `ComponentSnapshot` without `positionXInMeters`, `positionYInMeters`, `rotation`. `GardenMetadataSnapshot` without `widthInMeters`, `heightInMeters`. `GardenStoreState` (in buildGardenSnapshot) without `gardenWidth`, `gardenHeight`.

- [ ] **Step 1: Snapshot types**

In `src/domain/ai/GardenSnapshot.ts`:

- Change `export const GARDEN_SNAPSHOT_VERSION = '1.0' as const;` to `'2.0'`.
- Remove from `ComponentSnapshot`: the `positionXInMeters`, `positionYInMeters`, `rotation` lines and their doc comments.
- Remove from `GardenMetadataSnapshot`: `widthInMeters` and `heightInMeters`.

- [ ] **Step 2: Builders**

In `buildGardenSnapshot.ts`:

- Remove `gardenWidth` and `gardenHeight` from `GardenStoreState`.
- In `buildGardenSnapshot` remove the `widthInMeters` and `heightInMeters` lines.
- In `mapComponent` remove the `positionXInMeters`, `positionYInMeters`, `rotation` lines.

In `buildComponentOptimizeRequest.ts`:

- In the local `mapComponent` remove the same three lines.
- In the `snapshot.garden` literal remove `widthInMeters: 0,` and `heightInMeters: 0,`.

In `useAiChat.ts` remove the two lines `gardenWidth: gardenState.gardenWidth,` and `gardenHeight: gardenState.gardenHeight,`.

- [ ] **Step 3: Zod schemas**

In both `chatRequestSchema.ts` and `optimizeRequestSchema.ts`:

- Remove `positionXInMeters: z.number(),`, `positionYInMeters: z.number(),`, `rotation: z.number(),` from `componentSnapshotSchema`.
- Remove `widthInMeters: z.number(),` and `heightInMeters: z.number(),` from `gardenMetadataSnapshotSchema`.

- [ ] **Step 4: Backend instruction file**

`HOME-SLIDER-BE.md`:

```markdown
# Backend change: garden snapshot 2.0

The app no longer has a 2D garden canvas. Components have no position or
rotation and the garden has no width or height.

## Snapshot changes

- `snapshotVersion` is now `"2.0"`.
- `components[].positionXInMeters`, `components[].positionYInMeters` and
  `components[].rotation` are no longer sent.
- `garden.widthInMeters` and `garden.heightInMeters` are no longer sent.

Everything else (plants with positions in cm inside their component, layers,
locks, patch dimensions, plant catalog) is unchanged.

## Required backend work

1. Accept snapshot version `"2.0"`.
2. Make the five fields above optional (or remove them) in the request
   validation for `/chat` and `/optimize-component`.
3. Remove any prompt text or scoring that used component position, rotation
   or garden size.

Until this is deployed, strict validation on the backend will reject
requests from app versions that ship the home slider.
```

- [ ] **Step 5: Typecheck, test, commit**

Run: `npm run typecheck`
Expected: no errors.

Run: `grep -rn "positionXInMeters\|widthInMeters\|gardenWidth\|\.rotation\b" src`
Expected: no output (plant `patchRotationDeg` does not match this pattern).

Run: `npm run test:unit`
Expected: 16 passing.

```bash
git add src/domain/ai src/hooks/ai/useAiChat.ts src/schemas/ai HOME-SLIDER-BE.md
git commit -m "feat(ai): garden snapshot 2.0 without canvas position and size"
```

---

### Task 9: Maestro flow for the home slider

**Files:**
- Create: `maestro/home_slider.yaml`
- Modify: `maestro/README.md`

**Interfaces:**
- Consumes testIDs: `home-screen`, `add-component-fab`, `home-creation-modal-type-selector-gardenBox`, `home-creation-modal-type-selector-pot`, `home-creation-modal-next-button`, `home-creation-modal-form-name-input`, `home-creation-modal-form-compass-direction-S`, `home-creation-modal-form-submit-button`, `home-component-slider`, `home-component-list`, `component-slide-*-open`, `component-slide-*-delete`, `component-detail-screen`.

Note: the modal passes `${testID}-type-selector` and `${testID}-form` as prefixes, and the form passes `${testID}-compass` to the compass, whose segments are `${testID}-direction-S`. Verify these prefixes by reading `ComponentCreationModal.tsx:290-299` and `ComponentForm.tsx:404` before running the flow; adjust the ids in the flow if they differ.

- [ ] **Step 1: Write the flow**

`maestro/home_slider.yaml`:

```yaml
appId: com.mylittlegarden.app
name: Home - Component slider and list
---
# Creates two components, swipes between slides, jumps via the list,
# opens the detail screen and deletes a component with confirmation.
# Assumes the environment setup was completed earlier (clearState: false),
# or run environment_setup_happy_path.yaml first.

- launchApp:
    clearState: false

- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 8000

# ── Create first component (garden box) ───────────────────────────────
- tapOn:
    id: "add-component-fab"
- tapOn:
    id: "home-creation-modal-type-selector-gardenBox"
- tapOn:
    id: "home-creation-modal-next-button"
- tapOn:
    id: "home-creation-modal-form-name-input"
- inputText: "Bak Een"
- hideKeyboard
- tapOn:
    id: "home-creation-modal-form-compass-direction-S"
- tapOn:
    id: "home-creation-modal-form-submit-button"
- waitForAnimationToEnd

- assertVisible:
    id: "home-component-slider"
- assertVisible:
    text: "Bak Een"

# ── Create second component (pot) ─────────────────────────────────────
- tapOn:
    id: "add-component-fab"
- tapOn:
    id: "home-creation-modal-type-selector-pot"
- tapOn:
    id: "home-creation-modal-next-button"
- tapOn:
    id: "home-creation-modal-form-name-input"
- inputText: "Pot Twee"
- hideKeyboard
- tapOn:
    id: "home-creation-modal-form-compass-direction-S"
- tapOn:
    id: "home-creation-modal-form-submit-button"
- waitForAnimationToEnd

# New component becomes the active slide
- assertVisible:
    id: "home-slider-counter"
    text: "2 van 2"

# ── Swipe back to the first slide ─────────────────────────────────────
- swipe:
    direction: RIGHT
    duration: 400
- waitForAnimationToEnd
- assertVisible:
    text: "1 van 2"

# ── Jump via the list ─────────────────────────────────────────────────
- tapOn:
    text: "Pot Twee"
- waitForAnimationToEnd
- assertVisible:
    text: "2 van 2"

# ── Open detail screen from the active slide ─────────────────────────
- tapOn:
    text: "Openen"
- extendedWaitUntil:
    visible:
      id: "component-detail-screen"
    timeout: 5000
- back
- extendedWaitUntil:
    visible:
      id: "home-screen"
    timeout: 5000

# ── Delete with confirmation: cancel first, then confirm ─────────────
- tapOn:
    text: "Verwijderen"
- assertVisible:
    text: "Component verwijderen?"
- tapOn:
    text: "Annuleren"
- assertVisible:
    text: "2 van 2"

- tapOn:
    text: "Verwijderen"
- tapOn:
    text: "Verwijderen"
    index: 1
- waitForAnimationToEnd

# One component left: no counter, first component still listed
- assertNotVisible:
    id: "home-slider-counter"
- assertVisible:
    text: "Bak Een"
```

- [ ] **Step 2: Document it**

Add to `maestro/README.md` under "Test Files":

```markdown
### Home Screen Tests

5. **home_slider.yaml**
   - Creates two components and verifies they appear as slides
   - Swipes between slides and checks the "x van y" counter
   - Taps a list row to jump to its slide
   - Opens the detail screen from a slide and returns
   - Deletes a component with cancel-then-confirm
   - Uses `clearState: false`; run `environment_setup_happy_path.yaml` first on a fresh install
```

Also update the README's description of `environment_setup_happy_path.yaml` so it no longer claims a "Garden Dimensions" step (the wizard has only the frost dates step).

- [ ] **Step 3: Run the flow if a device is attached**

Run: `maestro test maestro/home_slider.yaml`
Expected: all steps pass. If no emulator or device is available, record that in the final report; do not mark the flow as verified.

- [ ] **Step 4: Commit**

```bash
git add maestro/home_slider.yaml maestro/README.md
git commit -m "test(maestro): home slider flow"
```

---

### Task 10: Final verification

**Files:** none new.

- [ ] **Step 1: Full checks**

Run: `npm run typecheck`
Expected: no errors.

Run: `npm run test:unit`
Expected: 16 passing, 0 failing.

Run: `git status --short`
Expected: only the pre-existing untracked files from before this work (analysis markdown files, `.idea`, scripts). Nothing from `src/` or `maestro/` unstaged.

- [ ] **Step 2: Leftover scan**

Run: `grep -rn "positionX\b\|positionY\b" src/types/component.types.ts src/domain/component src/stores`
Expected: no output.

Run: `grep -rn "ComponentPosition\|usePlacedComponents\|useUnplacedComponents\|moveComponent\|rotateComponent" src`
Expected: no output.

- [ ] **Step 3: Report**

Report to the user: what changed, the backend sequencing constraint from `HOME-SLIDER-BE.md`, whether the Maestro flow ran, and that the manual upgrade check (install over a build with saved components) is still to be done on a device.
