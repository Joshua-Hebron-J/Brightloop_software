import { z } from 'zod';

export const paymentMethodEnum = z.enum([
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'CASH',
  'UPI',
  'CHECK',
  'MOCK_GATEWAY',
]);

export const recordPaymentSchema = z.object({
  invoiceId: z.string().optional().nullable(),
  customerId: z.string().min(1, 'Customer ID is required'),
  amount: z.number().positive('Payment amount must be greater than 0'),
  currency: z.string().default('USD'),
  paymentDate: z.string().optional(),
  paymentMethod: paymentMethodEnum,
  transactionReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const applyCreditSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amount: z.number().positive('Amount must be greater than 0'),
});

export const refundPaymentSchema = z.object({
  reason: z.string().min(1, 'Refund reason is required'),
});

export const paymentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  customerId: z.string().optional(),
  invoiceId: z.string().optional(),
  status: z.enum(['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED']).optional(),
  paymentMethod: paymentMethodEnum.optional(),
});
