import { z } from 'zod';

export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Item description is required'),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  taxRatePercent: z.number().min(0).max(100).default(0),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  subscriptionId: z.string().optional().nullable(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.enum(['INR','USD','EUR','GBP']).optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  discountValue: z.number().nonnegative().default(0),
  taxType: z.enum(['SALES_TAX', 'VAT', 'GST', 'ZERO_RATED']).default('SALES_TAX'),
  notes: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, 'At least one invoice item is required'),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['OPEN', 'VOID', 'UNCOLLECTIBLE']),
  reason: z.string().optional(),
});

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  customerId: z.string().optional(),
  subscriptionId: z.string().optional(),
  status: z.enum(['DRAFT', 'OPEN', 'PAID', 'PARTIALLY_PAID', 'VOID', 'UNCOLLECTIBLE']).optional(),
  search: z.string().optional(),
});
