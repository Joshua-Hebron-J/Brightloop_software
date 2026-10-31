import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
  adjustCreditSchema,
} from './customers.schemas';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: customerQuerySchema }), CustomersController.list);
router.get('/:id', CustomersController.getById);
router.post('/', authorize('ADMIN', 'BILLING_MANAGER', 'SALES_REP'), validate({ body: createCustomerSchema }), CustomersController.create);
router.put('/:id', authorize('ADMIN', 'BILLING_MANAGER', 'SALES_REP'), validate({ body: updateCustomerSchema }), CustomersController.update);
router.post('/:id/adjust-credit', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: adjustCreditSchema }), CustomersController.adjustCredit);
router.delete('/:id', authorize('ADMIN'), CustomersController.delete);

export default router;
