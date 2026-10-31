import { CustomersService } from '../customers/customers.service';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env';
import { getDb } from '../../database/db';
import { HttpError } from '../../middlewares/errorHandler';
import { generateId } from '../../utils/dateUtils';
import { UserRole } from '../../../shared/types';

export class AuthService {
  static async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
  }) {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(data.email.toLowerCase());
    if (existing) {
      throw new HttpError(409, 'User with this email already exists', 'EMAIL_ALREADY_EXISTS');
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(data.password, salt);
    const id = generateId('usr');
    const now = new Date().toISOString();
    const role = data.role || 'CUSTOMER';

    db.exec('SAVEPOINT register_account');
    try {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, data.email, passwordHash, data.firstName, data.lastName, role, now, now);

    const user = {
      id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    if (role === 'CUSTOMER') {
      const customer=CustomersService.createCustomer({type:'INDIVIDUAL',firstName:data.firstName,lastName:data.lastName,email:data.email,billingAddress:{line1:'Not provided',city:'Not provided',postalCode:'600001',state:'33',country:'IN'}});
      db.prepare('UPDATE users SET customer_id=? WHERE id=?').run(customer.id,id);
    }
    const token = this.generateAccessToken(user);
    const refreshToken = this.createRefreshToken(user.id);

    db.exec('RELEASE register_account');
    return { user, token, refreshToken };
    } catch(error){db.exec('ROLLBACK TO register_account');db.exec('RELEASE register_account');throw error}
  }

  static async login(email: string, password: string) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email.toLowerCase()) as any;

    if (!row) {
      throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (!row.is_active) {
      throw new HttpError(403, 'Account is deactivated', 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = bcrypt.compareSync(password, row.password_hash);
    if (!isMatch) {
      throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const user = {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role as UserRole,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    const token = this.generateAccessToken(user);
    const refreshToken = this.createRefreshToken(user.id);

    return { user, token, refreshToken };
  }

  static async refreshAccessToken(refreshToken: string) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0').get(refreshToken) as any;

    if (!row) {
      throw new HttpError(401, 'Invalid or revoked refresh token', 'INVALID_REFRESH_TOKEN');
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new HttpError(401, 'Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
    }

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id) as any;
    if (!userRow || !userRow.is_active) {
      throw new HttpError(401, 'User account not active', 'ACCOUNT_INACTIVE');
    }

    const user = {
      id: userRow.id,
      email: userRow.email,
      firstName: userRow.first_name,
      lastName: userRow.last_name,
      role: userRow.role as UserRole,
      isActive: Boolean(userRow.is_active),
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
    };

    // Rotate refresh token
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').run(row.id);
    const newRefreshToken = this.createRefreshToken(user.id);
    const token = this.generateAccessToken(user);

    return { token, refreshToken: newRefreshToken, user };
  }

  static async changePassword(userId: string, currentPass: string, newPass: string) {
    const db = getDb();
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!userRow) {
      throw new HttpError(404, 'User not found', 'NOT_FOUND');
    }

    const match = bcrypt.compareSync(currentPass, userRow.password_hash);
    if (!match) {
      throw new HttpError(400, 'Current password incorrect', 'INVALID_PASSWORD');
    }

    const newHash = bcrypt.hashSync(newPass, 10);
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, userId);

    // Revoke all existing refresh tokens
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(userId);
    db.prepare('UPDATE users SET token_version=token_version+1 WHERE id=?').run(userId);

    return { success: true };
  }

  static async listUsers() {
    const db = getDb();
    const rows = db.prepare('SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      role: r.role,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  private static generateAccessToken(user: { id: string; email: string; role: string }): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        version:(getDb().prepare("SELECT token_version FROM users WHERE id=?").get(user.id) as any)?.token_version||0,
      },
      ENV.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  private static createRefreshToken(userId: string): string {
    const db = getDb();
    const id = generateId('rft');
    const token = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString(); // 30 days
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token, expires_at, revoked, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(id, userId, token, expiresAt, now);

    return token;
  }
}
