import { z } from 'zod';

export const createVariantSchema = z.object({
  name: z.string().min(1, 'Variant name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  attributes: z.record(z.any()).optional(),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  costPrice: z.number().nonnegative().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});

export const updateVariantSchema = createVariantSchema.partial();

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  code: z.string().min(1, 'Product code is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
  variants: z.array(createVariantSchema).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  category: z.string().optional(),
});
