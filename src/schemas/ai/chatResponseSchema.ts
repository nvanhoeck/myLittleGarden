import { z } from 'zod';

export const chatResponseSchema = z.object({
  reply: z.string(),
  meta: z.object({
    model: z.string(),
    tokensUsed: z.number().nullable(),
  }),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const streamChunkSchema = z.object({
  delta: z.string(),
  done: z.boolean(),
});

export type StreamChunk = z.infer<typeof streamChunkSchema>;
