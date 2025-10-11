import { z } from 'zod';

export const selectionItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  qty: z.number().int().nonnegative(),
  unitList: z.number().nonnegative(),
  programDisc: z.number().min(0).max(1).optional(),
  netUnit: z.number().nonnegative(),
  extendedNet: z.number().nonnegative(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const selectionSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  name: z.string(),
  status: z.union([z.literal('snapshot'), z.literal('working'), z.literal('archived')]),
  source: z.union([z.literal('manual'), z.literal('dallas')]),
  sourceEventId: z.string().optional(),
  sourceYear: z.number().optional(),
  isPublished: z.boolean(),
  version: z.number().int().positive(),
  items: z.array(selectionItemSchema),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SelectionInput = z.infer<typeof selectionSchema>;
