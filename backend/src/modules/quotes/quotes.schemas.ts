import { z } from 'zod';

export const quoteItemSchema = z.object({
  productId: z.string().optional().nullable(),
  variantId: z.string().optional().nullable(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  discountPercent: z.number().min(0).max(100).default(0),
  taxRatePercent: z.number().min(0).max(100).default(0),
});

export const createQuoteSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  planId: z.string().optional().nullable(),
  issueDate: z.string().optional(),
  validUntil: z.string().min(1, 'Valid until date is required'),
  currency: z.string().default('USD'),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  discountValue: z.number().nonnegative().default(0),
  taxRatePercent: z.number().min(0).max(100).optional(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(quoteItemSchema).min(1, 'At least one quote item is required'),
});

export const updateQuoteSchema = createQuoteSchema.partial();

export const updateQuoteStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACCEPTED', 'REJECTED']),
  reason: z.string().optional(),
});

export const quoteQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  customerId: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED']).optional(),
  search: z.string().optional(),
});

export const convertQuoteSchema = z.object({
  planId: z.string().optional(), // if overriding or specifying plan for subscription
  startDate: z.string().optional(), // defaults to today
});
