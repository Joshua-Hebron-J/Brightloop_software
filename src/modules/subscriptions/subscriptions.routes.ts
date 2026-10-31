import { Router } from 'express';
import { SubscriptionsController } from './subscriptions.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import {
  createSubscriptionSchema,
  pauseSubscriptionSchema,
  resumeSubscriptionSchema,
  cancelSubscriptionSchema,
  changePlanSchema,
  subscriptionQuerySchema,
} from './subscriptions.schemas';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: subscriptionQuerySchema }), SubscriptionsController.list);
router.get('/:id', SubscriptionsController.getById);
router.post('/', authorize('ADMIN', 'BILLING_MANAGER', 'SALES_REP'), validate({ body: createSubscriptionSchema }), SubscriptionsController.create);
router.post('/:id/pause', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: pauseSubscriptionSchema }), SubscriptionsController.pause);
router.post('/:id/resume', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: resumeSubscriptionSchema }), SubscriptionsController.resume);
router.post('/:id/cancel', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: cancelSubscriptionSchema }), SubscriptionsController.cancel);
router.post('/:id/change-plan', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: changePlanSchema }), SubscriptionsController.changePlan);

export default router;
