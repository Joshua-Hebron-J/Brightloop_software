import {z} from 'zod';
import { Router } from 'express';
import { BillingController } from './billing.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import { runBillingCyclesSchema, cycleQuerySchema } from './billing.schemas';

const router = Router();

router.use(authenticate);

router.get('/cycles', validate({ query: cycleQuerySchema }), BillingController.list);
router.get('/cycles/:id', BillingController.getById);
router.post('/run-cycles', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: runBillingCyclesSchema }), BillingController.runCycles);
router.post('/subscriptions/:subscriptionId/generate-cycle', authorize('ADMIN', 'BILLING_MANAGER'), validate({body:z.object({targetDate:z.string().datetime().optional(),periodStart:z.string().datetime().optional(),force:z.boolean().optional()})}), BillingController.generateForSubscription);

export default router;
