import path from 'node:path';
import fs from 'node:fs';
import { authenticate } from './middlewares/auth';
import officialRoutes, { customerScope } from './modules/official/official.routes';
import express, { Express } from 'express';
import cors from 'cors';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import productsRoutes from './modules/products/products.routes';
import plansRoutes from './modules/plans/plans.routes';
import customersRoutes from './modules/customers/customers.routes';
import quotesRoutes from './modules/quotes/quotes.routes';
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes';
import billingRoutes from './modules/billing/billing.routes';
import invoicesRoutes from './modules/invoices/invoices.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';

export function createApp(): Express {
  const app = express();

  // Global Middlewares
  app.use(cors({origin:process.env.CORS_ORIGIN || 'http://localhost:5173'}));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Healthcheck endpoint
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'BillSync Billing Engine',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Feature Module Routes
  app.use('/api/auth', authRoutes);
  app.use('/api', authenticate, customerScope);
  app.use('/api/official', officialRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/plans', plansRoutes);
  app.use('/api/customers', customersRoutes);
  app.use('/api/quotes', quotesRoutes);
  app.use('/api/subscriptions', subscriptionsRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/invoices', invoicesRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/analytics', analyticsRoutes);

  const frontendDir=path.resolve(process.cwd(),'../frontend/dist');
  if(fs.existsSync(frontendDir)){app.use(express.static(frontendDir));app.get(/^(?!\/api(?:\/|$)).*/,(_req,res)=>res.sendFile(path.join(frontendDir,'index.html')))}

  // Catch-all 404 for unmatched routes
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.baseUrl || req.originalUrl} not found`,
      },
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
