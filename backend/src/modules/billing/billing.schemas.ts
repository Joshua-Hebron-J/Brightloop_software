import { z } from 'zod';

export const runBillingCyclesSchema = z.object({
  targetDate: z.string().optional(), // ISO date string, defaults to current time
  subscriptionIds: z.array(z.string()).optional(), // optional subset
  dryRun: z.boolean().default(false), // preview what would be billed without committing
});

export const cycleQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  subscriptionId: z.string().optional(),
  status: z.enum(['PENDING', 'GENERATED', 'SKIPPED', 'FAILED']).optional(),
});
