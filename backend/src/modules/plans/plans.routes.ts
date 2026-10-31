import { Router } from 'express';
import { PlansController } from './plans.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import { createPlanSchema, updatePlanSchema, planQuerySchema } from './plans.schemas';

const router = Router();

router.use(authenticate);

router.get('/frequencies', PlansController.getFrequencies);
router.get('/', validate({ query: planQuerySchema }), PlansController.list);
router.get('/:id', PlansController.getById);
router.post('/', authorize('ADMIN'), validate({ body: createPlanSchema }), PlansController.create);
router.put('/:id', authorize('ADMIN'), validate({ body: updatePlanSchema }), PlansController.update);
router.delete('/:id', authorize('ADMIN'), PlansController.delete);

export default router;
