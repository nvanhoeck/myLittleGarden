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

export const gardenSnapshotSchema = z.object({
  snapshotVersion: z.string(),
  garden: gardenMetadataSnapshotSchema,
  components: z.array(componentSnapshotSchema),
});

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const chatRequestSchema = z.object({
  snapshot: gardenSnapshotSchema,
  messages: z.array(chatMessageSchema),
  stream: z.boolean().default(false),
  locale: z.string().default('nl'),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
