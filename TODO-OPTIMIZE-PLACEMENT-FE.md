# TODO — React Native App: Optimize Placement Feature

## Overview
Adds an icon-only "Optimaliseer Opstelling" button to the **ComponentDetailScreen** header, placed between the 🤖 AI chat button and the ➕ add plant button. When pressed, the current component's plant data is sent to the backend, which returns 3–5 scored alternative layouts. A modal opens showing a mini canvas for the selected alternative; page dots allow navigation between options. A secondary button opens the AI chat with context about the current (unmodified) placement. The user can cancel (no changes) or apply (atomically overwrites all plant positions in the component).

**Reference files:**
- Scoring model: `src/data/plant-placement-scoring.md`
- Architecture decision: `src/data/optimize-placement-architecture.md`
- Existing patterns: `src/components/organisms/PlantPlacementCanvas/PlantPlacementCanvas.tsx`, `src/screens/ComponentDetailScreen/ComponentDetailScreen.tsx`

---

## Phase P — Schemas & Domain Layer

- [ ] **P1** — `src/schemas/ai/optimizeComponentRequestSchema.ts`
  Zod schema for the component-scoped optimize request. Fields:
  - `componentSnapshot`: reuse `componentSnapshotSchema` from `optimizeRequestSchema.ts` (single component, not array)
  - `plantCatalog`: array of `PlantSpecSnapshot` entries for every distinct `plantId` in the component
  - `gardenSunDirection`: `SunDirection | null` (the garden-level sun direction for context)
  - `objective`: `'maximize-companions' | 'minimize-harm' | 'balanced'` (default `'balanced'`)
  - `numberOfAlternatives`: integer 3–5 (default 3)
  Export `OptimizeComponentRequest` type.

- [ ] **P2** — `src/schemas/ai/optimizeComponentResponseSchema.ts`
  Zod schema for the response. Fields:
  - `componentId`: string
  - `alternatives`: array of 1–5 items, each (`OptimizeComponentAlternative`) with:
    - `id`: string (e.g. `"optie-1"`)
    - `label`: string (Dutch label, e.g. `"Optie 1"`)
    - `summary`: string (Dutch, 1–2 sentences explaining what this layout prioritises)
    - `score`: `{ companion: number; spacing: number; sun: number; combative: number; total: number }` — all 0–100
    - `positions`: array of `{ plantInstanceId: string; positionXInCm: number; positionYInCm: number }` — same instance IDs as request, new positions only. `layerIndex` is NOT included (unchanged from input).
  - `diagnostics`: `{ warnings: string[] }`
  Validate: `alternatives` length 1–5; each `positions` array contains the same instance IDs as the request snapshot; all position values are finite non-negative numbers.
  Export `OptimizeComponentResponse` and `OptimizeComponentAlternative` types.

- [ ] **P3** — `src/domain/ai/buildComponentOptimizeRequest.ts`
  Mapper from `ComponentData` + `PlantData[]` (retrieved via `getPlantById`) + garden sun direction + objective + numberOfAlternatives → `OptimizeComponentRequest`.
  - Maps each `PlacedPlantData` to the snapshot format (positionX/Y in cm, layerIndex as nullable)
  - Maps each distinct plant species to a `PlantSpecSnapshot` (reuse existing shape from `GardenSnapshot.ts`)
  - Converts `sun: 'full' | 'partial' | 'shade'` to the snapshot's `sunRequirement` field
  - Tower plants include `layerIndex`; non-tower plants get `layerIndex: null`

---

## Phase Q — Service, Store & Hook

- [ ] **Q1** — `src/services/ai/optimizeComponentService.ts` — **mock first**
  Returns a hardcoded `OptimizeComponentResponse` with 3 mock alternatives after 800 ms.
  Mock positions must be within component bounds and not inner-colliding (all plant pairs >= 10 cm apart).
  Use a variety of scores to make UI navigation testable (e.g. totals 78, 62, 45).

- [ ] **Q2** — `src/stores/ai/aiOptimizeComponentStore.ts` — non-persisted Zustand slice:
  ```typescript
  {
    status: 'idle' | 'loading' | 'error' | 'success';
    alternatives: OptimizeComponentAlternative[] | null;
    selectedIndex: number;
    error: string | null;
  }
  ```
  Actions: `setLoading()`, `setSuccess(alternatives)`, `setError(message)`, `setSelectedIndex(n)`, `reset()`

- [ ] **Q3** — `src/hooks/ai/useOptimizeComponent.ts`
  Exposes:
  - `requestOptimization(component, getPlantById, gardenSunDirection, objective?)`: builds request via `buildComponentOptimizeRequest`, calls service, updates store
  - `applyAlternative(component, componentId, updateComponent)`: writes the selected alternative's positions back via `updateComponent`. Preserves `placedAt`, `plantId`, `layerIndex` on each plant — only `positionX` and `positionY` change.
  - `reset()`: calls store `reset()`
  Uses `aiRetry` for network errors (mirrors `useAiChat` pattern).

- [ ] **Q4** _(REAL LLM SWAP)_ — Replace mock in `optimizeComponentService` with real `POST /v1/ai/optimize-component`; Zod-parse response with `optimizeComponentResponseSchema`; on-device validate that all returned `plantInstanceId` values match the request snapshot.

---

## Phase R — UI Components

- [ ] **R1** — `src/components/ai/OptimizationMiniCanvas.tsx`
  Read-only, non-interactive canvas mirroring `PlantPlacementCanvas` visually, without drag support, zoom, or toggles. Props:
  - `component: ComponentData`
  - `positions: { plantInstanceId: string; positionXInCm: number; positionYInCm: number }[]`
  - `plantDataMap: Record<string, PlantData>` (keyed by placed plant **instance** ID)
  - `width: number`, `height: number` (pixel dimensions)
  Renders:
  - Component shape background (brown `#3d2914` rectangle or circle, with `#8B4513` border matching `componentShape` style)
  - Plant circles at scaled positions (green `#16a34a` for individual, amber `#92400e` square for patch)
  - Orange border on plants with spacing overlap (reuse `checkSpacingOverlap` logic from `PlantPlacementCanvas`)
  - Scale = `Math.min(width / innerWidth, height / innerHeight)` (fit to given pixel area)
  BEM styles in `src/styles/ai/optimizationMiniCanvas.css`

- [ ] **R2** — `src/components/ai/AlternativePageDots.tsx`
  Row of filled/empty circular dots for navigating between alternatives.
  - Filled dot = selected index (white or `#4ade80`)
  - Empty dot = other alternatives (`#4b5563` grey)
  - Each dot is `Pressable`, calls `onSelect(index)`
  - Dots are 10 px diameter, 8 px gap
  Props: `count: number`, `selectedIndex: number`, `onSelect: (index: number) => void`
  BEM styles in `src/styles/ai/optimizationModal.css`

- [ ] **R3** — `src/components/ai/ScoreChips.tsx`
  Horizontal row of labelled score chips. Each chip shows an icon + label + numeric value (0–100). Colour: green >= 70, amber 40–69, red < 40.
  Chips: `Companions`, `Afstand`, `Zon`, `Conflicten` (companion/spacing/sun/combative).
  Props: `score: OptimizeComponentAlternative['score']`
  BEM styles in `src/styles/ai/optimizationModal.css`

- [ ] **R4** — `src/components/ai/OptimizationAlternativesModal.tsx`
  Full-screen `Modal` (React Native `Modal`, `animationType="slide"`). Layout top-to-bottom:
  1. **Header bar**: title `t('optimize.placement.title')` + close (X) `Pressable` — calls `onCancel`
  2. **Mini canvas** (~50% screen height via flex): `OptimizationMiniCanvas` for `alternatives[selectedIndex]`
  3. **Score chips**: `ScoreChips` for the selected alternative
  4. **Summary text**: `alternatives[selectedIndex].summary` in a `Text` (max 3 lines, `numberOfLines={3}`)
  5. **Page dots**: `AlternativePageDots` — tapping a dot calls `onSelectIndex(i)` which updates store
  6. **AI feedback button**: outlined secondary `Pressable` with label `t('optimize.placement.aiFeedback')` — calls `onAiFeedback()`. Does NOT apply any alternative first.
  7. **Action row**: `t('optimize.placement.cancel')` (grey `#374151`) + `t('optimize.placement.apply')` (green `#16a34a`) buttons side by side.
  Props:
  ```typescript
  {
    visible: boolean;
    alternatives: OptimizeComponentAlternative[];
    selectedIndex: number;
    component: ComponentData;
    plantDataMap: Record<string, PlantData>;
    onSelectIndex: (i: number) => void;
    onApply: () => void;
    onCancel: () => void;
    onAiFeedback: () => void;
  }
  ```
  BEM styles in `src/styles/ai/optimizationModal.css`

- [ ] **R5** — `src/styles/ai/optimizationModal.css` BEM classes:
  `.optimization-modal__overlay`, `.optimization-modal__header`, `.optimization-modal__title`,
  `.optimization-modal__close-btn`, `.optimization-modal__canvas-area`, `.optimization-modal__score-row`,
  `.optimization-modal__summary`, `.optimization-modal__dots`, `.optimization-modal__dot`,
  `.optimization-modal__dot--active`, `.optimization-modal__ai-feedback-btn`,
  `.optimization-modal__action-row`, `.optimization-modal__cancel-btn`, `.optimization-modal__apply-btn`

- [ ] **R6** — Add Dutch i18n keys to `src/i18n/ai/nl.ts`:
  ```
  optimize.placement.button       // "Optimaliseer opstelling"
  optimize.placement.loading      // "Opstellingen berekenen..."
  optimize.placement.error        // "Optimalisatie mislukt. Probeer opnieuw."
  optimize.placement.noPlants     // "Voeg eerst planten toe om te optimaliseren."
  optimize.placement.title        // "Optimalisatie Suggesties"
  optimize.placement.apply        // "Toepassen"
  optimize.placement.cancel       // "Annuleer"
  optimize.placement.aiFeedback   // "AI feedback over huidige opstelling"
  optimize.placement.score.companion  // "Companions"
  optimize.placement.score.spacing    // "Afstand"
  optimize.placement.score.sun        // "Zon"
  optimize.placement.score.combative  // "Conflicten"
  optimize.placement.alternative  // "Optie {{n}} van {{total}}"
  ```

---

## Phase S — ComponentDetailScreen Integration

- [ ] **S1** — Add optimize button to header in `ComponentDetailScreen.tsx`.
  Insert **between** the robot AI chat button and the plus add plant button. Use icon "sparkle" on `bg-indigo-600` background. Disable (switch to `bg-gray-700`) when `plants.length === 0` or `optimizeStatus === 'loading'`.
  `testID="optimize-placement-button"`, `accessibilityLabel={t('optimize.placement.button')}`.
  Show `ActivityIndicator` inside button when `optimizeStatus === 'loading'`.

- [ ] **S2** — Add `handleOptimize` callback: calls `useOptimizeComponent.requestOptimization(component, getPlantById, gardenSunDirection)`.
  Get garden sun direction via a new `useGardenStore` selector: `(state) => state.garden?.sunDirection ?? null`.

- [ ] **S3** — Add `[showOptimizationModal, setShowOptimizationModal]` state (boolean).
  `useEffect` watching `optimizeStatus`: when it transitions to `'success'`, set `showOptimizationModal(true)`.

- [ ] **S4** — When `optimizeStatus === 'error'`, show `Alert.alert` with `t('optimize.placement.error')` + retry option.

- [ ] **S5** — Build `plantDataMap` via `useMemo`:
  Map from placed plant instance ID to `PlantData` (via `getPlantById(plant.plantId)`), for `visiblePlants`.

- [ ] **S6** — Mount `OptimizationAlternativesModal` inside `SafeAreaView` (below layer overview modal).
  Pass all store state and handlers as props.

- [ ] **S7** — `handleOptimizeApply`: calls `useOptimizeComponent.applyAlternative(...)`, closes modal, remounts canvas (`setCanvasKey(k => k + 1)`), resets store.

- [ ] **S8** — `handleOptimizeCancel`: closes modal + resets store. No plant changes needed (original never modified until apply).

- [ ] **S9** — `handleOptimizeAiFeedback`: closes modal, navigates to `AiChat`. Chat uses the component's current (unmodified) plant positions.

---

## Phase T — Testing

- [ ] **T1** — Maestro test: optimize happy path
  Open ComponentDetailScreen (component with >= 2 plants) — press optimize button — assert modal visible — assert page dots visible — tap second dot — assert canvas updates — press "Toepassen" — assert modal closed.

- [ ] **T2** — Maestro test: optimize cancel
  Open modal — press "Annuleer" — assert modal closed — assert plant positions unchanged.

- [ ] **T3** — Maestro test: optimize AI feedback
  Open modal — press AI feedback button — assert ChatScreen visible.

- [ ] **T4** — Maestro test: optimize disabled state
  Open ComponentDetailScreen with 0 plants — assert optimize button is disabled/greyed out.

- [ ] **T5** — Maestro test: optimize loading state
  (Slow mock >= 1000 ms) Press button — assert ActivityIndicator visible inside button — await response — assert modal appears.
