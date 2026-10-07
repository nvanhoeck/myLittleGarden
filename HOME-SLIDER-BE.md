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
