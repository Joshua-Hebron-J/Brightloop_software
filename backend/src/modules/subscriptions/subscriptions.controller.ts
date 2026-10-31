import { Request, Response, NextFunction } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { sendCreated, sendPaginated, sendSuccess } from '../../utils/response';
import { SubscriptionStatus } from '../../../shared/types';

export class SubscriptionsController {
  static list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const customerId = req.query.customerId as string | undefined;
      const planId = req.query.planId as string | undefined;
      const status = req.query.status as SubscriptionStatus | undefined;
      const search = req.query.search as string | undefined;

      const result = SubscriptionsService.listSubscriptions({ page, limit, customerId, planId, status, search });
      return sendPaginated(res, result.items, result.total, page, limit, 'Subscriptions retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static getById(req: Request, res: Response, next: NextFunction) {
    try {
      const sub = SubscriptionsService.getSubscriptionById(req.params.id as string);
      return sendSuccess(res, sub, 'Subscription retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static create(req: Request, res: Response, next: NextFunction) {
    try {
      const sub = SubscriptionsService.createSubscription(req.body);
      return sendCreated(res, sub, 'Subscription created successfully');
    } catch (err) {
      next(err);
    }
  }

  static pause(req: Request, res: Response, next: NextFunction) {
    try {
      const sub = SubscriptionsService.pauseSubscription(req.params.id as string, req.body.reason);
      return sendSuccess(res, sub, 'Subscription paused successfully');
    } catch (err) {
      next(err);
    }
  }

  static resume(req: Request, res: Response, next: NextFunction) {
    try {
      const sub = SubscriptionsService.resumeSubscription(req.params.id as string, req.body.resumeDate);
      return sendSuccess(res, sub, 'Subscription resumed successfully');
    } catch (err) {
      next(err);
    }
  }

  static cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { cancelReason, immediate } = req.body;
      const sub = SubscriptionsService.cancelSubscription(req.params.id as string, cancelReason, immediate);
      return sendSuccess(res, sub, immediate ? 'Subscription cancelled immediately' : 'Subscription marked for cancellation at period end');
    } catch (err) {
      next(err);
    }
  }

  static changePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const { newPlanId, applyProration, generateInvoice } = req.body;
      const result = SubscriptionsService.changePlan(req.params.id as string, newPlanId, applyProration, generateInvoice);
      return sendSuccess(res, result, 'Subscription plan changed successfully');
    } catch (err) {
      next(err);
    }
  }
}
