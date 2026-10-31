import { Router } from 'express';
import { InvoicesController } from './invoices.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import {
  createInvoiceSchema,
  updateInvoiceStatusSchema,
  invoiceQuerySchema,
} from './invoices.schemas';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: invoiceQuerySchema }), InvoicesController.list);
router.get('/:id', InvoicesController.getById);
router.get('/:id/html', InvoicesController.renderHtml);
router.post('/', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: createInvoiceSchema }), InvoicesController.create);
router.patch('/:id/status', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: updateInvoiceStatusSchema }), InvoicesController.updateStatus);

export default router;
