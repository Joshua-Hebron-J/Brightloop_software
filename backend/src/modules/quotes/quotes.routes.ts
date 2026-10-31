import {QuotesService} from './quotes.service';
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
router.patch('/:id/status', authorize('ADMIN', 'BILLING_MANAGER', 'SALES_REP', 'CUSTOMER'), validate({ body: updateQuoteStatusSchema }), QuotesController.updateStatus);
router.post('/:id/convert', authorize('ADMIN', 'BILLING_MANAGER', 'SALES_REP'), validate({ body: convertQuoteSchema }), QuotesController.convert);

router.put('/:id',authorize('ADMIN','BILLING_MANAGER','SALES_REP'),validate({body:createQuoteSchema}),(req,res,next)=>{try{res.json({success:true,data:QuotesService.updateQuote(String(req.params.id),req.user!.id,req.body)})}catch(e){next(e)}});
export default router;
