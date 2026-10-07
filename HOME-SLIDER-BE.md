# Backend impact: home screen rework (garden snapshot 2.0)

Frontend version: merged into master on 2026-10-07 (branch `feature/home-slider`).

## What changed in the app

The 2D garden canvas on the home screen was replaced by a slider plus list.
Components are no longer placed anywhere: they have no position on a canvas,
no rotation, and the garden itself has no width or height anymore. Everything
inside a component is unchanged: plants still have a position in centimeters
relative to their component, a layer index for towers, a lock flag and patch
dimensions.

Only the `snapshot` object shared by the AI endpoints is affected. No new
endpoints, no new fields, no changes to responses.

## Affected endpoints

| Endpoint | Request field | Change |
|----------|---------------|--------|
| `POST /v1/ai/chat` | `snapshot` | garden snapshot 2.0 (see below) |
| `POST /v1/ai/chat` (conversation compaction call) | `snapshot` | the stub snapshot the app sends for compaction also lost `garden.widthInMeters` and `garden.heightInMeters` |
| `POST /v1/ai/optimize-component` | `snapshot` | garden snapshot 2.0 (see below) |

Response schemas (`chat`, `optimize-component`) are untouched. The app still
expects the same `moves`, `removals`, `score`, `summary`, `diagnostics` shapes.

## Snapshot version

`snapshot.snapshotVersion` is now the string `"2.0"` (was `"1.0"`).

## Removed fields (exact paths)

| Path | Was | Now |
|------|-----|-----|
| `snapshot.garden.widthInMeters` | `number` | not sent |
| `snapshot.garden.heightInMeters` | `number` | not sent |
| `snapshot.components[].positionXInMeters` | `number` | not sent |
| `snapshot.components[].positionYInMeters` | `number` | not sent |
| `snapshot.components[].rotation` | `number` (degrees) | not sent |

Nothing else was added, renamed or removed.

## Full snapshot shape as sent by the app (2.0)

```json
{
  "snapshotVersion": "2.0",
  "garden": {
    "sunDirection": "S",
    "springFrostDate": "2026-04-15T00:00:00.000Z",
    "fallFrostDate": "2026-10-20T00:00:00.000Z"
  },
  "components": [
    {
      "id": "c-1",
      "name": "Moestuin achter",
      "type": "gardenBox",
      "sunDirection": "S",
      "dimensions": {
        "widthInCm": 120,
        "lengthInCm": 80,
        "diameterInCm": null,
        "numberOfLayers": null,
        "borderWidthInCm": 5
      },
      "plants": [
        {
          "id": "p-1",
          "plantId": "tomaat",
          "positionXInCm": 20,
          "positionYInCm": 30,
          "layerIndex": null,
          "locked": false,
          "patchWidthInCm": null,
          "patchHeightInCm": null,
          "patchRotationDeg": null
        }
      ],
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "plantCatalog": [
    {
      "plantId": "tomaat",
      "name": "Tomaat",
      "sunRequirement": "fullSun",
      "spacingInCm": 50,
      "heightInCm": null,
      "waterNeeds": "medium",
      "frostTolerant": false,
      "plantingStyle": "individual",
      "goodCompanions": ["basilicum"],
      "badCompanions": ["aardappel"]
    }
  ]
}
```

Notes on values that did not change:

- `garden.sunDirection`, `springFrostDate`, `fallFrostDate` may be `null`.
- `plantCatalog` is optional and only present when the app has plant specs
  to send (always on `optimize-component`, on `chat` when plants exist).
- `components[].type` is one of `gardenBox`, `pot`, `rectangularTower`,
  `circularTower`. `dimensions` keeps the flat nullable layout.
- Plant positions are still relative to the component's inner area, in cm.
  For towers, positions are relative to the layer given by `layerIndex`,
  where each layer is 0.85 times the size of the layer below it.

## What the backend needs to do

1. **Accept `snapshotVersion: "2.0"`.** If the version is checked, allow both
   `"1.0"` and `"2.0"` during the transition.
2. **Stop requiring the five removed fields** in the request validation for
   `/v1/ai/chat` and `/v1/ai/optimize-component`. Either make them optional
   or drop them from the schema. Until this is done, a strict validator will
   reject every request from app builds that include this change.
3. **Remove any use of component position, rotation or garden size** in
   prompts, scoring or placement logic. There is no garden-level layout
   anymore, so reasoning such as "component A is next to component B" or
   "this box is in the north corner of the garden" no longer has data behind
   it. Reasoning within a component (plant spacing, companions, layers) is
   unchanged.
4. **Do not return component positions.** Nothing in the current response
   schemas includes them, so no change is expected here, but any planned
   feature that would place or move components on a canvas should be dropped.

## Compatibility

- Old app builds (snapshot 1.0) keep sending the five fields. If the backend
  ignores unknown fields, old and new builds can coexist.
- Nothing in the app depends on the backend acknowledging the version, so the
  backend may deploy its change before or after the app release, as long as
  it does not reject the new shape.

## Where to look in the frontend

- `src/domain/ai/GardenSnapshot.ts` (types, version constant)
- `src/domain/ai/buildGardenSnapshot.ts` (chat snapshot builder)
- `src/domain/ai/buildComponentOptimizeRequest.ts` (optimize-component builder)
- `src/schemas/ai/chatRequestSchema.ts`, `src/schemas/ai/optimizeRequestSchema.ts`
- `src/services/ai/chatService.ts` (compaction stub snapshot)
