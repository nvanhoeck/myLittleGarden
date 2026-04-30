# ADR: Optimize Placement (Component-Scoped)

**Status:** Proposed | **Date:** 2026-04-27

**Scope:** `ComponentDetailScreen` "Optimize Placement" feature — backend produces 3–5 alternative arrangements for a single component; user previews and applies one atomically.

## Context

The existing `POST /v1/ai/optimize-layout` endpoint operates **garden-wide** and returns **moves** (deltas). The new feature is **fundamentally different**: single component scope, complete absolute layouts (not deltas), multiple candidates (3–5), atomic overwrite on apply. Treating these two endpoints as variants of the same operation would distort both.

---

## 1. Algorithm Choice — Decision: Deterministic

**No LLM in the hot path. No LLM-authored summary in v1.**

LLMs cannot reliably produce valid cm coordinates within bounded geometry. Failure modes (out-of-bounds, collision violations, drifted plant counts, hallucinated IDs, layer-index leaks) are exactly the invariants this feature must guarantee. Validating and repairing every response means the LLM is doing nothing the deterministic scorer doesn't already do — except add latency and non-determinism.

The scoring function **is the product**. Companion bonuses, hostile penalties, spacing comfort, sun alignment — these are deterministic domain rules. A 50-line greedy + perturbation routine beats a prompt.

Hybrid (deterministic algorithm + LLM for summary text) is a v2 option. For v1 use templated Dutch summaries — they are just as informative, fully deterministic, and testable. The architecture leaves room for LLM summaries without changing the core contract.

---

## 2. Coordinate System

| Property | Value |
|---|---|
| Origin | Top-left of the component's **inner** area |
| X axis | Increases rightward |
| Y axis | Increases downward |
| Units | Centimetres |
| Inner bounds (rect) | `widthInCm - 2*borderWidthInCm` x `lengthInCm - 2*borderWidthInCm` |
| Inner bounds (circle) | `diameterInCm - 2*borderWidthInCm` square box; disc validity check applied separately |
| Hard collision radius | `PLANT_INNER_RADIUS_CM = 5` (mirrors `PlantPlacementCanvas` constant) |
| Soft spacing warning | `spacingRadiusCm` per plant (mirrors `checkSpacingOverlap`) |

**Edge cases:**

1. **Circular components** (`pot`, `circularTower`) — inner area is a disc. Valid position: `(x - r)^2 + (y - r)^2 <= (r - PLANT_INNER_RADIUS_CM)^2` where `r = innerDiameter / 2`.

2. **Tower layers** — `LAYER_REDUCTION_FACTOR = 0.85` per layer index. Effective inner bounds at layer L: `innerWidth * 0.85^L x innerHeight * 0.85^L`. Plants stay on their input `layerIndex`.

3. **Patch plants** (`plantingStyle === 'patch'`) — treated as rigid clusters. Never moved individually in v1. Positions pass through unchanged to all alternatives. App's `checkSpacingOverlap` and `checkInnerCollision` skip patch plants; the optimizer does the same.

4. **Body inset** — plant centers must be at least `PLANT_INNER_RADIUS_CM = 5 cm` from the inner edge, so the rendered plant body stays fully within bounds.

---

## 3. Response Shape — New Endpoint

**Decision: `POST /v1/ai/optimize-component` with its own schemas (Option B — Extend by addition).**

The existing `optimizeResponseSchema` is built around `moves[]` with from/to component IDs. Forcing it to represent "3–5 absolute layouts of one component" requires adding an `alternatives` field, making `moves` optional, and adding a `mode` discriminator. That is a textbook Open/Closed violation.

```typescript
// Request
{
  componentId: string,
  objective: 'maximize-companions' | 'minimize-harm' | 'balanced',
  numberOfAlternatives: number,          // 3..5, default 3
  snapshot: GardenSnapshot,              // reuse existing schema verbatim
}

// Response
{
  componentId: string,
  alternatives: Array<{
    id: string,                          // "optie-1", "optie-2", etc.
    label: string,                       // Dutch display label
    summary: string,                     // Dutch 1-2 sentence explanation
    score: {
      companion: number,                 // 0-100
      spacing:   number,                 // 0-100
      sun:       number,                 // 0-100
      combative: number,                 // 0-100 (higher = fewer conflicts)
      total:     number,                 // weighted sum per objective
    },
    positions: Array<{
      plantInstanceId: string,           // same IDs as input snapshot
      positionXInCm: number,
      positionYInCm: number,
      // layerIndex NOT included - it is invariant and comes from input
    }>,
  }>,
  diagnostics: { warnings: string[] },
}
```

`positions` is complete and absolute. The apply action on the client is a single Zustand operation: match each `plantInstanceId`, update `positionX` and `positionY`, preserve everything else.

---

## 4. Greedy Heuristic + Diversified Perturbation

```
1. Build working set: non-patch singletons, patch clusters (rigid), inner bounds.

2. SEED layout (greedy, companion-aware):
   Sort singletons by descending spacingRadiusCm.
   For each singleton in order:
     Evaluate 5 cm grid of candidate positions within inner bounds.
     Cell score = companion_bonus(placed neighbours within 2*maxSpacing)
               - hostile_penalty(placed neighbours within 2*maxSpacing)
               - spacing_comfort_penalty(nearest neighbour vs spacingRadiusCm)
               - boundary_penalty(distance to inner edge)
     Place at argmax cell. Reject cells with hard collision or out-of-bounds.
   Patch clusters keep input positions.

3. Generate ~30 candidates via perturbation (4 strategies, round-robin):
   a) Pair swap: swap (x,y) of 2 randomly selected non-patch singletons.
   b) Local jitter: nudge 1-3 plants by U(-15, +15) cm; clamp, push-off-wall.
   c) Companion pull: move one singleton halfway toward a companion in current layout.
   d) Hostile push: move one singleton 2*spacingRadius away from nearest hostile; clamp.
   Reject candidates failing validity checks. Resample <=3 times per strategy.

4. Score all candidates with PlantScoringEngine.scoreTotal(objective).

5. Diversity-aware top-N (return numberOfAlternatives):
   layoutDistance(A, B) = average per-plant Euclidean displacement.
   Greedy farthest-first:
     Alternative 1 = highest-scoring candidate.
     Alternative k+1 = highest scorer where layoutDistance > 15 cm from all selected.
       (Relax to 10 cm if not enough candidates survive at 15 cm.)

6. Determinism: seed PRNG from hash(componentId + sorted(plantInstanceIds) + objective).
```

**Constants:** Grid step 5 cm | Candidate target 30, cap 50 | Diversity threshold 15 cm (relax to 10) | Interaction radius: 2 * max(spacingRadius1, spacingRadius2)

---

## 5. Validation Rules (server-side, every alternative)

All rules enforced after optimizer output. Failing alternatives are discarded silently.

1. **Cardinality**: `positions.length === input component plants.length`; `plantInstanceId` set is identical to input.
2. **Rect bounds**: `5 <= positionX <= innerWidth - 5`, `5 <= positionY <= innerHeight - 5`.
3. **Circle bounds**: `(positionX - r)^2 + (positionY - r)^2 <= (r - 5)^2`.
4. **Tower layer bounds**: rules 2/3 applied with inner dims * 0.85^layerIndex.
5. **Hard collision**: for every non-patch pair, distance >= 10 cm.
6. **Patch positions**: unchanged from input.
7. **Numeric sanity**: all positions are finite, non-NaN, >= 0.

If zero valid alternatives remain after 50 attempts: return HTTP 400 with code `OPTIMIZE_NO_VALID_ALTERNATIVES`.

---

## 6. Frontend Modal — React Native Modal

**Decision: React Native `Modal` component (mirrors `LayerOverviewModal` pattern).**

No new dependencies needed. A bottom sheet would require gesture-handler provider integration at the app root for one feature. Navigation to a new screen would require a back-stack entry and lose visual anchor to the component.

The modal renders an `OptimizationMiniCanvas` (read-only PlantPlacementCanvas variant, `draggingEnabled=false`). Applying an alternative closes the modal; user sees the updated PlantPlacementCanvas immediately.

Apply is a hard cut — no per-plant animation in v1.

---

## Open Questions

1. **Patch cluster translation** — allow entire patch centroid to be repositioned, or pin entirely in v1? Current decision: pin (pass-through unchanged).
2. **Plant body inset** — confirm "center >= 5 cm from inner edge" vs allowing body to overlap the decorative border.
3. **Score weight calibration** — validate `balanced` weights (companion 30% / spacing 30% / sun 25% / combative 15%) against real garden snapshots before locking.
4. **Summary copy** — Dutch template strings need UX sign-off before shipping.
