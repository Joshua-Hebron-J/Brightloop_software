import { Router } from 'express';
import { QuotesController } from './quotes.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import {
  createQuoteSchema,
  updateQuoteStatusSchema,
  quoteQuerySchema,
  convertQuoteSchema,
} from './quotes.schemas';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: quoteQuerySchema }), QuotesController.list);
router.get('/:id', QuotesController.getById);
router.post('/', authorize('ADMIN', 'BILLING_MANAGER', 'SALES_REP'), validate({ body: createQuoteSchema }), QuotesController.create);
router.patch('/:id/status', authorize('ADMIN', 'BILLING_MANAGER', 'SALES_REP'), validate({ body: updateQuoteStatusSchema }), QuotesController.updateStatus);
router.post('/:id/convert', authorize('ADMIN', 'BILLING_MANAGER', 'SALES_REP'), validate({ body: convertQuoteSchema }), QuotesController.convert);

export default router;
