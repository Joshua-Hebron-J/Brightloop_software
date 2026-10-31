import { Request, Response, NextFunction } from 'express';
import { PlansService } from './plans.service';
import { sendCreated, sendPaginated, sendSuccess } from '../../utils/response';
import { BillingFrequency } from '../../../shared/types';

export class PlansController {
  static list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const frequency = req.query.frequency as BillingFrequency | undefined;

      const result = PlansService.listPlans({ page, limit, search, status, frequency });
      return sendPaginated(res, result.items, result.total, page, limit, 'Plans retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static getById(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = PlansService.getPlanById(req.params.id as string);
      return sendSuccess(res, plan, 'Plan retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static create(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = PlansService.createPlan(req.body);
      return sendCreated(res, plan, 'Plan created successfully');
    } catch (err) {
      next(err);
    }
  }

  static update(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = PlansService.updatePlan(req.params.id as string, req.body);
      return sendSuccess(res, plan, 'Plan updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static delete(req: Request, res: Response, next: NextFunction) {
    try {
      PlansService.deletePlan(req.params.id as string);
      return sendSuccess(res, null, 'Plan deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  static getFrequencies(_req: Request, res: Response, next: NextFunction) {
    try {
      const frequencies = PlansService.getBillingFrequencies();
      return sendSuccess(res, frequencies, 'Billing frequencies metadata');
    } catch (err) {
      next(err);
    }
  }
}
