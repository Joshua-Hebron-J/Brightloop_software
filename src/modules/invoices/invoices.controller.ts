import { Request, Response, NextFunction } from 'express';
import { InvoicesService } from './invoices.service';
import { sendCreated, sendPaginated, sendSuccess } from '../../utils/response';
import { InvoiceStatus } from '../../../shared/types';

export class InvoicesController {
  static list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const customerId = req.query.customerId as string | undefined;
      const subscriptionId = req.query.subscriptionId as string | undefined;
      const status = req.query.status as InvoiceStatus | undefined;
      const search = req.query.search as string | undefined;

      const result = InvoicesService.listInvoices({ page, limit, customerId, subscriptionId, status, search });
      return sendPaginated(res, result.items, result.total, page, limit, 'Invoices retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static getById(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = InvoicesService.getInvoiceById(req.params.id as string);
      return sendSuccess(res, invoice, 'Invoice retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static renderHtml(req: Request, res: Response, next: NextFunction) {
    try {
      const html = InvoicesService.renderHtmlInvoice(req.params.id as string);
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (err) {
      next(err);
    }
  }

  static create(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = InvoicesService.createInvoice(req.body);
      return sendCreated(res, invoice, 'Invoice created successfully');
    } catch (err) {
      next(err);
    }
  }

  static updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, reason } = req.body;
      const invoice = InvoicesService.updateInvoiceStatus(req.params.id as string, status, reason);
      return sendSuccess(res, invoice, 'Invoice status updated successfully');
    } catch (err) {
      next(err);
    }
  }
}
