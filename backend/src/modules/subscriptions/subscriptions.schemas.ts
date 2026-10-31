import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  initialStatus:z.enum(['DRAFT','ACTIVE']).default('DRAFT'),
  expiryDate:z.string().datetime().optional(),
  customerId: z.string().min(1, 'Customer ID is required'),
  planId: z.string().min(1, 'Plan ID is required'),
  startDate: z.string().optional(),
  startTrial: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
  items: z.array(z.object({
    productId:z.string().nullable().optional(),
    taxRatePercent:z.number().min(0).max(100).default(0),
    variantId: z.string().optional().nullable(),
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().int().positive().default(1),
    unitPrice: z.number().nonnegative(),
  })).optional(),
});

export const pauseSubscriptionSchema = z.object({
  reason: z.string().optional(),
});

export const resumeSubscriptionSchema = z.object({
  resumeDate: z.string().optional(),
});

export const cancelSubscriptionSchema = z.object({
  cancelReason: z.string().min(1, 'Cancel reason is required'),
  immediate: z.boolean().default(false),
});

export const changePlanSchema = z.object({
  newPlanId: z.string().min(1, 'New plan ID is required'),
  applyProration: z.boolean().default(true),
  generateInvoice: z.boolean().default(true),
});

export const subscriptionQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  customerId: z.string().optional(),
  planId: z.string().optional(),
  status: z.enum(['DRAFT', 'TRIALING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED']).optional(),
  search: z.string().optional(),
});
