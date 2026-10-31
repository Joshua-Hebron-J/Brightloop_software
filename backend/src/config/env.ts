import path from 'path';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw new Error('JWT_SECRET is required in production');

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  JWT_SECRET: process.env.JWT_SECRET || randomBytes(48).toString('hex'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  DATABASE_PATH: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'brightloop-demo.sqlite'),
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'INR',
  DEFAULT_TAX_RATE: parseFloat(process.env.DEFAULT_TAX_RATE || '10.0'),
};
