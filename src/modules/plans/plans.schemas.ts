import { z } from 'zod';

export const billingFrequencyEnum = z.enum([
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'SEMI_ANNUALLY',
  'ANNUALLY',
]);

export const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  code: z.string().min(1, 'Plan code is required'),
  description: z.string().optional(),
  billingFrequency: billingFrequencyEnum,
  price: z.number().nonnegative('Price must be greater than or equal to 0'),
  currency: z.string().default('USD'),
  trialPeriodDays: z.number().int().nonnegative().default(0),
  setupFee: z.number().nonnegative().default(0),
  features: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});

export const updatePlanSchema = createPlanSchema.partial();

export const planQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  frequency: billingFrequencyEnum.optional(),
});
