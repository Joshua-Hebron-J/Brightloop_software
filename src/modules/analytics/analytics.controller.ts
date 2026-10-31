import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { sendSuccess } from '../../utils/response';

export class AnalyticsController {
  static getMetrics(_req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = AnalyticsService.getDashboardMetrics();
      return sendSuccess(res, metrics, 'Dashboard analytics retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}
