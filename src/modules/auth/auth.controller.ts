import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendCreated, sendSuccess } from '../../utils/response';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      return sendCreated(res, result, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      return sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshAccessToken(refreshToken);
      return sendSuccess(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      return sendSuccess(res, { user: req.user }, 'Current user profile');
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
      return sendSuccess(res, result, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listUsers(_req: Request, res: Response, next: NextFunction) {
    try {
      const users = await AuthService.listUsers();
      return sendSuccess(res, users, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
