import { z } from 'zod';

const sunDirectionSchema = z.enum(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);

const componentTypeSchema = z.enum([
  'gardenBox',
  'pot',
  'rectangularTower',
  'circularTower',
]);

const placedPlantSnapshotSchema = z.object({
  id: z.string(),
  plantId: z.string(),
  positionXInCm: z.number(),
  positionYInCm: z.number(),
  layerIndex: z.number().nullable(),
  locked: z.boolean(),
  patchWidthInCm: z.number().nullable(),
  patchHeightInCm: z.number().nullable(),
  patchRotationDeg: z.number().nullable(),
});

const componentDimensionsSnapshotSchema = z.object({
  widthInCm: z.number().nullable(),
  lengthInCm: z.number().nullable(),
  diameterInCm: z.number().nullable(),
  numberOfLayers: z.number().nullable(),
  borderWidthInCm: z.number(),
});

const componentSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: componentTypeSchema,
  sunDirection: sunDirectionSchema.nullable(),
  positionXInMeters: z.number(),
  positionYInMeters: z.number(),
  rotation: z.number(),
  dimensions: componentDimensionsSnapshotSchema,
  plants: z.array(placedPlantSnapshotSchema),
  createdAt: z.string(),
});

const gardenMetadataSnapshotSchema = z.object({
  widthInMeters: z.number(),
  heightInMeters: z.number(),
  sunDirection: sunDirectionSchema.nullable(),
  springFrostDate: z.string().nullable(),
  fallFrostDate: z.string().nullable(),
});

const plantSpecSnapshotSchema = z.object({
  plantId: z.string(),
  name: z.string(),
  sunRequirement: z.enum(['fullSun', 'partialShade', 'fullShade']).nullable(),
  spacingInCm: z.number().nullable(),
  heightInCm: z.number().nullable(),
  waterNeeds: z.enum(['low', 'medium', 'high']).nullable(),
  frostTolerant: z.boolean().nullable(),
  plantingStyle: z.enum(['individual', 'patch', 'thinning']).nullable(),
  goodCompanions: z.array(z.string()),
  badCompanions: z.array(z.string()),
});

export const gardenSnapshotSchema = z.object({
  snapshotVersion: z.string(),
  garden: gardenMetadataSnapshotSchema,
  components: z.array(componentSnapshotSchema),
  plantCatalog: z.array(plantSpecSnapshotSchema).optional(),
});

const constraintsSchema = z.object({
  lockedComponentIds: z.array(z.string()),
  maxMoves: z.number().int().min(1).max(50).default(10),
});

const objectiveSchema = z
  .enum(['maximize-companions', 'minimize-harm', 'balanced'])
  .default('balanced');

export const optimizeRequestSchema = z.object({
  constraints: constraintsSchema,
  objective: objectiveSchema,
  snapshot: gardenSnapshotSchema,
});

export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;