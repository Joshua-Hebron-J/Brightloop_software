import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import { registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema } from './auth.schemas';

const router = Router();

router.post('/register', validate({ body: registerSchema }), AuthController.register);
router.post('/login', validate({ body: loginSchema }), AuthController.login);
router.post('/refresh', validate({ body: refreshTokenSchema }), AuthController.refreshToken);
router.get('/me', authenticate, AuthController.me);
router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), AuthController.changePassword);
router.get('/users', authenticate, authorize('ADMIN'), AuthController.listUsers);

export default router;
