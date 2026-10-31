import { z } from 'zod';

export const addressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional().nullable(),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(2, 'Country code is required'),
});

export const createCustomerSchema = z.object({
  type: z.enum(['INDIVIDUAL', 'ORGANIZATION']),
  companyName: z.string().optional().nullable(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().nullable(),
  billingAddress: addressSchema,
  shippingAddress: addressSchema.optional().nullable(),
  taxId: z.string().optional().nullable(),
  currency: z.string().default('USD'),
  paymentTermsDays: z.number().int().nonnegative().default(30),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']).default('ACTIVE'),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']).optional(),
  type: z.enum(['INDIVIDUAL', 'ORGANIZATION']).optional(),
});

export const adjustCreditSchema = z.object({
  amount: z.number(), // positive to add credit, negative to deduct
  reason: z.string().min(1, 'Reason is required'),
});
