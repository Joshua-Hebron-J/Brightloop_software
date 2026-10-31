import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import {
  recordPaymentSchema,
  applyCreditSchema,
  refundPaymentSchema,
  paymentQuerySchema,
} from './payments.schemas';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: paymentQuerySchema }), PaymentsController.list);
router.get('/:id', PaymentsController.getById);
router.post('/', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: recordPaymentSchema }), PaymentsController.record);
router.post('/apply-credit', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: applyCreditSchema }), PaymentsController.applyCredit);
router.post('/:id/refund', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: refundPaymentSchema }), PaymentsController.refund);

export default router;
