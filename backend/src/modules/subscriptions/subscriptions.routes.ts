import {getDb} from '../../database/db';
import {generateId} from '../../utils/dateUtils';
import {z} from 'zod';
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
router.post('/:id/pause', authorize('ADMIN', 'BILLING_MANAGER', 'CUSTOMER'), validate({ body: pauseSubscriptionSchema }), SubscriptionsController.pause);
router.post('/:id/resume', authorize('ADMIN', 'BILLING_MANAGER', 'CUSTOMER'), validate({ body: resumeSubscriptionSchema }), SubscriptionsController.resume);
router.post('/:id/cancel', authorize('ADMIN', 'BILLING_MANAGER', 'CUSTOMER'), validate({ body: cancelSubscriptionSchema }), SubscriptionsController.cancel);
router.post('/:id/change-plan', authorize('ADMIN', 'BILLING_MANAGER'), validate({ body: changePlanSchema }), SubscriptionsController.changePlan);

router.post('/:id/addons',authorize('ADMIN','BILLING_MANAGER','CUSTOMER'),(req,res,next)=>{try{
 const d=z.object({variantId:z.string(),quantity:z.number().int().min(0)}).parse(req.body),db=getDb(),id=String(req.params.id);
 const sub:any=db.prepare('SELECT * FROM subscriptions WHERE id=?').get(id);if(!sub||!['ACTIVE','PAUSED','TRIALING'].includes(sub.status))return res.status(400).json({success:false,error:{message:'Add-ons require an active or paused subscription'}});
 const v:any=db.prepare("SELECT * FROM product_variants WHERE id=? AND status='ACTIVE'").get(d.variantId);if(!v)return res.status(404).json({success:false,error:{message:'Variant not found'}});
 const product:any=db.prepare('SELECT currency FROM products WHERE id=?').get(v.product_id);if(product.currency!==sub.currency)return res.status(400).json({success:false,error:{message:'Add-on currency must match subscription'}});
 db.exec('BEGIN');try{db.prepare('DELETE FROM subscription_items WHERE subscription_id=? AND variant_id=? AND is_base=0').run(id,v.id);
 if(d.quantity)db.prepare('INSERT INTO subscription_items(id,subscription_id,variant_id,product_id,description,quantity,unit_price) VALUES(?,?,?,?,?,?,?)').run(generateId('addon'),id,v.id,v.product_id,v.name,d.quantity,Number((v.unit_price+v.price_extra).toFixed(2)));db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
 res.json({success:true,data:{updated:true}});
 }catch(e){next(e)}});
export default router;
