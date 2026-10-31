import { Request, Response, NextFunction } from 'express';
import { BillingService } from './billing.service';
import { sendPaginated, sendSuccess } from '../../utils/response';
import { BillingCycleStatus } from '../../../shared/types';

export class BillingController {
  static list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const subscriptionId = req.query.subscriptionId as string | undefined;
      const status = req.query.status as BillingCycleStatus | undefined;

      const result = BillingService.listCycles({ page, limit, subscriptionId, status });
      return sendPaginated(res, result.items, result.total, page, limit, 'Billing cycles retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static getById(req: Request, res: Response, next: NextFunction) {
    try {
      const cycle = BillingService.getCycleById(req.params.id as string);
      return sendSuccess(res, cycle, 'Billing cycle retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static runCycles(req: Request, res: Response, next: NextFunction) {
    try {
      const result = BillingService.runBillingCycles(req.body);
      return sendSuccess(res, result, 'Billing cycle run completed');
    } catch (err) {
      next(err);
    }
  }

  static generateForSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetDate, periodStart, force } = req.body;
      const result = BillingService.generateCycleForSingleSubscription(
        req.params.subscriptionId as string,
        { targetDate, periodStart, force }
      );
      return sendSuccess(res, result, 'Cycle generated for subscription');
    } catch (err) {
      next(err);
    }
  }
}
