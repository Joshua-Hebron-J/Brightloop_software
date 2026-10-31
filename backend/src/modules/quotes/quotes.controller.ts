import { Request, Response, NextFunction } from 'express';
import { QuotesService } from './quotes.service';
import { sendCreated, sendPaginated, sendSuccess } from '../../utils/response';
import { QuoteStatus } from '../../../shared/types';

export class QuotesController {
  static list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const customerId = req.query.customerId as string | undefined;
      const status = req.query.status as QuoteStatus | undefined;
      const search = req.query.search as string | undefined;

      const result = QuotesService.listQuotes({ page, limit, customerId, status, search });
      return sendPaginated(res, result.items, result.total, page, limit, 'Quotes retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static getById(req: Request, res: Response, next: NextFunction) {
    try {
      const quote = QuotesService.getQuoteById(req.params.id as string);
      return sendSuccess(res, quote, 'Quote retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static create(req: Request, res: Response, next: NextFunction) {
    try {
      const quote = QuotesService.createQuote(req.user!.id, req.body);
      return sendCreated(res, quote, 'Quote created successfully');
    } catch (err) {
      next(err);
    }
  }

  static updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, reason } = req.body;
      const quote = QuotesService.updateQuoteStatus(req.params.id as string, status, reason);
      return sendSuccess(res, quote, 'Quote status updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static convert(req: Request, res: Response, next: NextFunction) {
    try {
      const result = QuotesService.convertToSubscription(req.params.id as string, req.body);
      return sendSuccess(res, result, 'Quote successfully converted to subscription and invoice');
    } catch (err) {
      next(err);
    }
  }
}
