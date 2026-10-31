import { Request, Response, NextFunction } from 'express';
import { ProductsService } from './products.service';
import { sendCreated, sendPaginated, sendSuccess } from '../../utils/response';

export class ProductsController {
  static list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const category = req.query.category as string | undefined;

      const result = ProductsService.listProducts({ page, limit, search, status, category });
      return sendPaginated(res, result.items, result.total, page, limit, 'Products retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = ProductsService.getProductById(req.params.id as string);
      return sendSuccess(res, product, 'Product retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = ProductsService.createProduct(req.body);
      return sendCreated(res, product, 'Product created successfully');
    } catch (err) {
      next(err);
    }
  }

  static update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = ProductsService.updateProduct(req.params.id as string, req.body);
      return sendSuccess(res, product, 'Product updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static delete(req: Request, res: Response, next: NextFunction) {
    try {
      ProductsService.deleteProduct(req.params.id as string);
      return sendSuccess(res, null, 'Product deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  // Variant operations
  static createVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const variant = ProductsService.createVariant(req.params.id as string, req.body);
      return sendCreated(res, variant, 'Product variant created successfully');
    } catch (err) {
      next(err);
    }
  }

  static updateVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const variant = ProductsService.updateVariant(req.params.variantId as string, req.body);
      return sendSuccess(res, variant, 'Product variant updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static deleteVariant(req: Request, res: Response, next: NextFunction) {
    try {
      ProductsService.deleteVariant(req.params.variantId as string);
      return sendSuccess(res, null, 'Product variant deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
