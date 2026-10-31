import { Router } from 'express';
import { ProductsController } from './products.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  createVariantSchema,
  updateVariantSchema,
} from './products.schemas';

const router = Router();

router.use(authenticate);

// Products
router.get('/', validate({ query: productQuerySchema }), ProductsController.list);
router.get('/:id', ProductsController.getById);
router.post('/', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: createProductSchema }), ProductsController.create);
router.put('/:id', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: updateProductSchema }), ProductsController.update);
router.delete('/:id', authorize('ADMIN'), ProductsController.delete);

// Variants
router.post('/:id/variants', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: createVariantSchema }), ProductsController.createVariant);
router.put('/variants/:variantId', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: updateVariantSchema }), ProductsController.updateVariant);
router.delete('/variants/:variantId', authorize('ADMIN'), ProductsController.deleteVariant);

export default router;
