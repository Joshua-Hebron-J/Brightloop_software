import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service';
import { sendCreated, sendPaginated, sendSuccess } from '../../utils/response';
import { PaymentMethod, PaymentStatus } from '../../../shared/types';

export class PaymentsController {
  static list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const customerId = req.query.customerId as string | undefined;
      const invoiceId = req.query.invoiceId as string | undefined;
      const status = req.query.status as PaymentStatus | undefined;
      const paymentMethod = req.query.paymentMethod as PaymentMethod | undefined;

      const result = PaymentsService.listPayments({ page, limit, customerId, invoiceId, status, paymentMethod });
      return sendPaginated(res, result.items, result.total, page, limit, 'Payments retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static getById(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = PaymentsService.getPaymentById(req.params.id as string);
      return sendSuccess(res, payment, 'Payment retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static record(req: Request, res: Response, next: NextFunction) {
    try {
      const result = PaymentsService.recordPayment(req.user!.id, req.body);
      return sendCreated(res, result, 'Payment recorded successfully');
    } catch (err) {
      next(err);
    }
  }

  static applyCredit(req: Request, res: Response, next: NextFunction) {
    try {
      const { invoiceId, amount } = req.body;
      const result = PaymentsService.applyCustomerCreditToInvoice(req.user!.id, invoiceId, amount);
      return sendSuccess(res, result, 'Credit successfully applied to invoice');
    } catch (err) {
      next(err);
    }
  }

  static refund(req: Request, res: Response, next: NextFunction) {
    try {
      const result = PaymentsService.refundPayment(req.params.id as string, req.body.reason);
      return sendSuccess(res, result, 'Payment refunded successfully');
    } catch (err) {
      next(err);
    }
  }
}
