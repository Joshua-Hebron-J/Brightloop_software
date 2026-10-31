import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'brightloop-super-secure-jwt-secret-key-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  DATABASE_PATH: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'brightloop.sqlite'),
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'USD',
  DEFAULT_TAX_RATE: parseFloat(process.env.DEFAULT_TAX_RATE || '10.0'),
};
