# Plant Placement Scoring Model

**Version:** 1.0 | **Date:** 2026-04-27
**Used by:** `PlantScoringEngine.ts` in the backend optimizer

This document defines the exact numeric scoring formulas for evaluating how well plants are positioned relative to each other within a garden component. All formulas mirror the app existing placement logic in `PlantPlacementCanvas.tsx`.

---

## App Constants (mirrored exactly)

```typescript
PLANT_INNER_RADIUS_CM = 5          // hard collision radius - plant body half-size
INTERACTION_FACTOR = 2             // companion/combative effects active within 2 x max(spacingRadius)
```

Hard collision: two non-patch plants collide when center distance < `2 x PLANT_INNER_RADIUS_CM = 10 cm`.
Spacing warning: triggered when center distance < `max(plant1.spacingRadiusCm, plant2.spacingRadiusCm)`.

---

## Dimension 1 — Spacing Score (0–100)

Measures what fraction of non-patch plant pairs respect their required spacing distance. Directly mirrors `checkSpacingOverlap` in `PlantPlacementCanvas.tsx`.

### Formula

```
pairs       = all unique (plantA, plantB) pairs where neither is a patch plant
violations  = count of pairs where distance(A, B) < max(A.spacingRadiusCm, B.spacingRadiusCm)
spacingScore = 100 x (1 - violations / pairs.length)
```

- If `pairs.length === 0` (0 or 1 individual plant): return 100.
- Hard collision (distance < 10 cm) counts as a violation (included in violations).

### Spacing Reference (plants by spacingRadiusCm)

| Plant | spacingRadiusCm | Notes |
|---|---|---|
| Courgette | 60 cm | Largest footprint — dominates small boxes |
| Broccoli | 50 cm | Large; incompatible with most in small components |
| Paprika | 45 cm | Wide; pairs well only with radijs/bieslook |
| Tomaat | 40 cm | Standard large vegetable |
| Komkommer | 40 cm | Climbing; vertical space can compensate |
| Pronkboon | 35 cm | Climbing; needs trellis |
| Peterselie | 25 cm | Compact herb |
| Tuinboon | 25 cm | Nitrogen fixer; compact for a legume |
| Sla | 25 cm | Fast-cycle; fills gaps |
| Basilicum | 20 cm | Compact herb |
| Biet | 20 cm | Root crop |
| Snijboon | 20 cm | Climbing bean |
| Spinazie | 15 cm | Very compact; high density possible |
| Wortel | 15 cm | Root crop; compact above ground |
| Bieslook | 15 cm | Compact herb |
| Radijs | 10 cm | Smallest spacing; ideal gap filler |

---

## Dimension 2 — Companion Score (0–100)

Rewards companion pairs that are within each other's zone of influence. The **interaction radius** is `2 x max(plant1.spacingRadiusCm, plant2.spacingRadiusCm)`.

Why 2x: companion benefits (root exudates, volatile compounds, pollinator attraction) extend beyond the immediate spacing circle. Root exudates diffuse 1.5–2x the crown diameter. Requiring plants to be within 1x spacing would force physical overlap. 2x gives a natural "neighbourhood" zone.

### Benefit Point Values

| Benefit | Points | Rationale |
|---|---|---|
| `fixesNitrogen` | 20 | Soil-wide benefit; entire component gains |
| `detersPests` | 15 | High agronomic impact; protects neighbours |
| `attractsPollinators` | 15 | High yield impact for flowering crops |
| `growthBoost` | 10 | Moderate benefit; encourages proximity |
| `improvesFlavor` | 5 | Culinary benefit; less critical for placement |

### Formula

```
rawScore = 0
for each non-patch pair (A, B) within interaction radius:
    for each benefit in A.companions[B].benefits:
        rawScore += benefitPoints[benefit]
    for each benefit in B.companions[A].benefits:
        rawScore += benefitPoints[benefit]

maxPossibleScore = total benefit points if ALL companion pairs were within interaction radius
companionScore = min(100, round(rawScore / maxPossibleScore x 100))
```

- If no companion relationships exist: return 50 (neutral).
- If maxPossibleScore === 0: return 50.

### Top Companion Pairs in Dataset

| Pair | Benefits | Combined Points | Priority |
|---|---|---|---|
| Tomaat + Peterselie | detersPests + growthBoost (bilateral) | 15+10+15+10 = 50 | 5 stars |
| Sla + Radijs | detersPests + growthBoost (bilateral) | 15+10+15+10 = 50 | 5 stars |
| Tomaat + Basilicum | detersPests + improvesFlavor (bilateral) | 15+5+15+5 = 40 | 5 stars |
| Komkommer + Dille | attractsPollinators + detersPests | 15+15 = 30 | 4 stars |
| Courgette + Goudsbloemkruid | detersPests + attractsPollinators | 15+15 = 30 | 4 stars |
| Broccoli + Goudsbloemkruid | detersPests + attractsPollinators | 15+15 = 30 | 4 stars |
| Wortel + Bieslook | detersPests (bilateral) | 15+15 = 30 | 4 stars |
| Tuinboon + Wortel | fixesNitrogen | 20 | 5 stars |
| Snijboon + Wortel | fixesNitrogen | 20 | 5 stars |
| Wortel + Ui | detersPests (bilateral via wortel companions) | 15+15 = 30 | 4 stars |

**Priority pairings for the optimizer companion-pull perturbation:**
1. Tomaat + Basilicum (detersPests + improvesFlavor, bilateral)
2. Tomaat + Peterselie (detersPests + growthBoost, bilateral)
3. Sla + Radijs (detersPests + growthBoost, bilateral)
4. Tuinboon/Snijboon + Wortel (fixesNitrogen — highest single-benefit value)
5. Courgette/Komkommer + Goudsbloemkruid (attractsPollinators + detersPests)
6. Wortel + Bieslook (detersPests, bilateral)

---

## Dimension 3 — Combative Score (0–100)

Penalises hostile plant pairs within the interaction radius. Higher score = fewer active conflicts.

### Harm Penalty Values

| Harm | Penalty | Rationale |
|---|---|---|
| `diseaseRisk` | 30 | Potentially ruins the harvest entirely |
| `inhibitsGrowth` | 20 | Sustained yield reduction |
| `depletesNutrients` | 15 | Structural soil damage over season |
| `attractsPests` | 15 | Pest pressure on entire component |

### Formula

```
totalPenalty = 0
for each non-patch pair (A, B) within interaction radius:
    for each harm in A.combatives[B].harms:
        totalPenalty += harmPenalties[harm]
    for each harm in B.combatives[A].harms:
        totalPenalty += harmPenalties[harm]

combativeScore = max(0, 100 - totalPenalty)
```

### Worst Combative Pairs in Dataset

| Pair | Harms | Combined Penalty | Priority |
|---|---|---|---|
| Tomaat + Broccoli (bilateral) | inhibitsGrowth | 20+20 = 40 | 5 stars |
| Komkommer + Aardappel | diseaseRisk | 30 | 5 stars |
| Courgette + Aardappel | diseaseRisk | 30 | 5 stars |
| Fennel + Tomaat | inhibitsGrowth | 20 | 4 stars |
| Fennel + Paprika | inhibitsGrowth | 20 | 4 stars |
| Fennel + Komkommer | inhibitsGrowth | 20 | 4 stars |
| Fennel + Sla | inhibitsGrowth | 20 | 4 stars |
| Fennel + Spinazie | inhibitsGrowth | 20 | 4 stars |
| Fennel + Wortel | inhibitsGrowth | 20 | 4 stars |
| Fennel + Broccoli | inhibitsGrowth | 20 | 4 stars |
| Basilicum + Salie | inhibitsGrowth | 20 | 4 stars |
| Snijboon + Knoflook | inhibitsGrowth | 20 | 3 stars |
| Broccoli + Aardappel | depletesNutrients | 15 | 3 stars |

**Key insight**: Fennel (`venkel`) is universally hostile and should never be placed near any other plant in the dataset. When fennel is present, the optimizer should maximise its distance from all other plants regardless of objective. The hostile-push perturbation strategy is especially important when fennel is in the component.

---

## Dimension 4 — Sun Alignment Score (0–100)

Measures how well each plant sun requirement matches the component facing direction.

### Sun Direction to Light Level Mapping

| Component facing | Light level | Approx. daily sun hours |
|---|---|---|
| S, SE, SW | Full sun | 6–8 h |
| E, W | Partial shade | 3–6 h |
| N, NE, NW | Shade | < 3 h |

### Per-Plant Score Table

| Plant sun requirement | Full sun zone | Partial zone | Shade zone |
|---|---|---|---|
| `full` | 100 | 50 | 0 |
| `partial` | 80 | 100 | 100 |
| `shade` | 20 | 60 | 100 |

### Formula

```
individual scores = [perPlantScore(plant.sun, lightLevel) for each plant]
sunScore = round(mean(individual scores))
```

All plants including patch plants are included. Sun exposure applies equally regardless of planting style.

### Sun Requirement Distribution in Dataset

**full sun plants:** Tomaat, Paprika, Komkommer, Courgette, Wortel, Biet, Radijs, Broccoli, Tuinboon, Snijboon, Basilicum, Bieslook, Knoflook

**partial shade plants:** Sla, Spinazie, Peterselie

**shade plants:** (none in current dataset)

Most vegetables in the dataset prefer full sun. Partial plants (sla, spinazie, peterselie) will score best on E, W, N, NE, or NW-facing components.

---

## Weighted Total Score

### Weight Table

| Objective | companion | spacing | sun | combative |
|---|---|---|---|---|
| `balanced` | 30% | 30% | 25% | 15% |
| `maximize-companions` | 50% | 25% | 15% | 10% |
| `minimize-harm` | 15% | 25% | 10% | 50% |

### Formula

```
total = companion x w_companion + spacing x w_spacing + sun x w_sun + combative x w_combative
total = round(total)   // integer 0-100
```

### Score Interpretation (UI colour mapping)

| Range | Meaning | UI colour |
|---|---|---|
| 70–100 | Good arrangement | Green (`#16a34a`) |
| 40–69 | Acceptable, room for improvement | Amber (`#d97706`) |
| 0–39 | Poor arrangement — conflicts or violations | Red (`#dc2626`) |

---

## Special Rules for Tower Layers

Towers use `LAYER_REDUCTION_FACTOR = 0.85` size reduction per layer (layer 0 = bottom/largest).

**Layer assignment guidance:**
1. Large-footprint plants (spacingRadiusCm >= 40 cm) belong on layer 0. They cannot physically fit on upper layers without severe overlap.
2. Climbing plants (`growthHabit: 'climbing'`) can tolerate the same layer as upright plants because their canopy occupies vertical space.
3. Spreading plants (`growthHabit: 'spreading'`) shade lower layers — place on topmost layer or avoid in towers.
4. Patch plants work on any layer; the layer reduced area limits density.
5. **Tower layer scoring**: apply all scoring formulas per-layer independently. Do not mix plants from different layers when computing pairwise distances.
