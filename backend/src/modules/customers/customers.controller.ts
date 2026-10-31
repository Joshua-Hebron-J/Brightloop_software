import { Request, Response, NextFunction } from 'express';
import { CustomersService } from './customers.service';
import { sendCreated, sendPaginated, sendSuccess } from '../../utils/response';
import { CustomerStatus, CustomerType } from '../../../shared/types';

export class CustomersController {
  static list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const search = req.query.search as string | undefined;
      const status = req.query.status as CustomerStatus | undefined;
      const type = req.query.type as CustomerType | undefined;

      const result = CustomersService.listCustomers({ page, limit, search, status, type });
      return sendPaginated(res, result.items, result.total, page, limit, 'Customers retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static getById(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = CustomersService.getCustomerById(req.params.id as string);
      return sendSuccess(res, customer, 'Customer retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static create(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = CustomersService.createCustomer(req.body);
      return sendCreated(res, customer, 'Customer created successfully');
    } catch (err) {
      next(err);
    }
  }

  static update(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = CustomersService.updateCustomer(req.params.id as string, req.body);
      return sendSuccess(res, customer, 'Customer updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static adjustCredit(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, reason } = req.body;
      const customer = CustomersService.adjustCreditBalance(req.params.id as string, amount, reason);
      return sendSuccess(res, customer, 'Customer credit adjusted successfully');
    } catch (err) {
      next(err);
    }
  }

  static delete(req: Request, res: Response, next: NextFunction) {
    try {
      CustomersService.deleteCustomer(req.params.id as string);
      return sendSuccess(res, null, 'Customer deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
