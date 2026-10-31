import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { getDb } from '../../database/db';
import { AuthService } from './auth.service';
import { requestReset } from '../official/mail';
import { passwordSchema } from './auth.schemas';
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

router.post('/staff',authenticate,authorize('ADMIN'),async(req,res,next)=>{try {
 const data=registerSchema.omit({role:true}).extend({role:z.enum(['BILLING_MANAGER','SALES_REP','VIEWER'])}).parse(req.body);
 const result=await AuthService.register(data);res.status(201).json({success:true,data:result.user});
 }catch(e){next(e)}});
router.post('/logout',authenticate,(req,res)=>{getDb().prepare('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?').run(req.user!.id);getDb().prepare('UPDATE users SET token_version=token_version+1 WHERE id=?').run(req.user!.id);res.json({success:true,data:{loggedOut:true}})});
router.post('/forgot-password',async(req,res,next)=>{try{const email=z.string().email().parse(req.body.email);res.json({success:true,data:await requestReset(email)})}catch(e){next(e)}});
router.post('/reset-password',(req,res,next)=>{try{
 const {token,password}=z.object({token:z.string().min(32),password:passwordSchema}).parse(req.body);
 const db=getDb();const row:any=db.prepare('SELECT * FROM password_resets WHERE token_hash=? AND used=0 AND expires_at>?').get(createHash('sha256').update(token).digest('hex'),new Date().toISOString());
 if(!row) return res.status(400).json({success:false,error:{message:'Reset link is invalid or expired'}});
 db.exec('BEGIN');try{db.prepare('UPDATE users SET password_hash=?,updated_at=? WHERE id=?').run(bcrypt.hashSync(password,10),new Date().toISOString(),row.user_id);db.prepare('UPDATE users SET token_version=token_version+1 WHERE id=?').run(row.user_id);db.prepare('UPDATE password_resets SET used=1 WHERE user_id=?').run(row.user_id);db.prepare('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?').run(row.user_id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
 res.json({success:true,data:{changed:true}});
 }catch(e){next(e)}});
export default router;
