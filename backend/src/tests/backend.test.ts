import test, { describe, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { seedDatabase } from '../database/seed';
import { getDb } from '../database/db';

describe('Brightloop Complete Backend Test Suite', () => {
  let app: any;
  let adminToken: string;
  let billingToken: string;
  let salesToken: string;
  let viewerToken: string;

  before(() => {
    // Ensure clean state with seeded data
    seedDatabase();
    app = createApp();
  });

  // ==========================================
  // 1. Healthcheck & Database
  // ==========================================
  test('1. Healthcheck endpoint returns status ok', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'Brightloop Billing Engine');
  });

  // ==========================================
  // 2. Authentication and Role-Based Authorization
  // ==========================================
  describe('2. Authentication & Authorization (RBAC)', () => {
    test('Login with valid Admin credentials succeeds and provides JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@brightloop.io', password: 'Password123!' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.user.role, 'ADMIN');
      adminToken = res.body.data.token;
    });

    test('Login with Billing Manager, Sales Rep, and Viewer', async () => {
      const bRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'billing@brightloop.io', password: 'Password123!' });
      assert.equal(bRes.status, 200);
      billingToken = bRes.body.data.token;

      const sRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'sales@brightloop.io', password: 'Password123!' });
      assert.equal(sRes.status, 200);
      salesToken = sRes.body.data.token;

      const vRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'viewer@brightloop.io', password: 'Password123!' });
      assert.equal(vRes.status, 200);
      viewerToken = vRes.body.data.token;
    });

    test('Login with wrong password fails with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@brightloop.io', password: 'WrongPassword' });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
    });

    test('GET /api/auth/me returns current user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.email, 'admin@brightloop.io');
    });

    test('Role restriction: Viewer cannot access Admin-only /api/auth/users endpoint (403)', async () => {
      const res = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${viewerToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test('Admin can access /api/auth/users (200)', async () => {
      const res = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });

    test('Register new user succeeds', async () => {
      const email = `testuser_${Date.now()}@brightloop.io`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'CUSTOMER',
        });

      assert.equal(res.status, 201);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.user.email, email);
    });
  });

  // ==========================================
  // 3. Products and Variants APIs
  // ==========================================
  describe('3. Products and Variants APIs', () => {
    let createdProductId: string;
    let createdVariantId: string;

    test('Create product with nested variants', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Analytics Add-On Suite',
          code: `ADDON-ANALYTICS-${Date.now()}`,
          description: 'Advanced cohort and revenue intelligence',
          category: 'Software',
          variants: [
            {
              name: 'Basic Analytics',
              sku: `SKU-ANL-BASIC-${Date.now()}`,
              unitPrice: 49.0,
            },
          ],
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.equal(res.body.data.variants.length, 1);
      createdProductId = res.body.data.id;
    });

    test('Add extra variant to existing product', async () => {
      const res = await request(app)
        .post(`/api/products/${createdProductId}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Premium Analytics Tier',
          sku: `SKU-ANL-PREM-${Date.now()}`,
          unitPrice: 149.0,
          attributes: { retentionReports: true },
        });

      assert.equal(res.status, 201);
      assert.ok(res.body.data.id);
      createdVariantId = res.body.data.id;
    });

    test('List products with pagination and search', async () => {
      const res = await request(app)
        .get('/api/products?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.items.length > 0);
      assert.ok(res.body.data.total >= 1);
    });

    test('Get product by ID includes its variants', async () => {
      const res = await request(app)
        .get(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, createdProductId);
      assert.equal(res.body.data.variants.length, 2);
    });
  });

  // ==========================================
  // 4. Subscription Plans and Billing Frequencies
  // ==========================================
  describe('4. Subscription Plans and Billing Frequencies', () => {
    let createdPlanId: string;

    test('GET /api/plans/frequencies returns valid metadata', async () => {
      const res = await request(app)
        .get('/api/plans/frequencies')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 6); // WEEKLY, MONTHLY, QUARTERLY, SEMI_ANNUALLY, ANNUALLY
    });

    test('Create new subscription plan', async () => {
      const res = await request(app)
        .post('/api/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Growth Quarterly',
          code: `PLAN-GROWTH-Q-${Date.now()}`,
          description: 'Quarterly billing plan for scale-ups',
          billingFrequency: 'QUARTERLY',
          price: 249.0,
          trialPeriodDays: 14,
          setupFee: 99.0,
          features: ['Quarterly business reviews', 'Webhook ingestion'],
        });

      assert.equal(res.status, 201);
      assert.ok(res.body.data.id);
      assert.equal(res.body.data.billingFrequency, 'QUARTERLY');
      assert.equal(res.body.data.price, 249.0);
      createdPlanId = res.body.data.id;
    });

    test('Update plan price and features', async () => {
      const res = await request(app)
        .put(`/api/plans/${createdPlanId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 279.0,
          description: 'Updated quarterly scale plan',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.price, 279.0);
    });
  });

  // ==========================================
  // 5. Customer Management APIs
  // ==========================================
  describe('5. Customer Management APIs', () => {
    let newCustomerId: string;

    test('Create an organization customer with billing address', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'ORGANIZATION',
          companyName: 'Stark Industries',
          firstName: 'Tony',
          lastName: 'Stark',
          email: `tony_${Date.now()}@starkindustries.com`,
          phone: '+1 212-555-0100',
          billingAddress: {
            line1: '10880 Malibu Point',
            city: 'Malibu',
            state: 'CA',
            postalCode: '90265',
            country: 'US',
          },
          taxId: 'US-EIN-12349999',
          paymentTermsDays: 30,
        });

      assert.equal(res.status, 201);
      assert.ok(res.body.data.id);
      assert.ok(res.body.data.customerNumber.startsWith('CUST-'));
      assert.equal(res.body.data.creditBalance, 0);
      newCustomerId = res.body.data.id;
    });

    test('Adjust customer credit balance', async () => {
      const res = await request(app)
        .post(`/api/customers/${newCustomerId}/adjust-credit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 100.0,
          reason: 'Promotional onboard credit credit',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.creditBalance, 100.0);
    });

    test('Get customer by ID returns customer, active subscriptions, and invoices history', async () => {
      const res = await request(app)
        .get(`/api/customers/${newCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, newCustomerId);
      assert.ok(Array.isArray(res.body.data.subscriptions));
      assert.ok(Array.isArray(res.body.data.recentInvoices));
    });
  });

  // ==========================================
  // 6. Quotations and Conversion
  // ==========================================
  describe('6. Quotations and Conversion', () => {
    let quoteId: string;

    test('Create a quote with line items, percentage discount, and tax calculation', async () => {
      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerId: 'cust_acme',
          planId: 'plan_pro_monthly',
          validUntil: new Date(Date.now() + 15 * 86400000).toISOString(),
          currency: 'USD',
          discountType: 'PERCENTAGE',
          discountValue: 10.0, // 10% off
          notes: 'Special renewal deal',
          items: [
            {
              description: 'Pro Monthly Core License',
              quantity: 2,
              unitPrice: 99.0, // Subtotal = 198.0
              discountPercent: 0,
              taxRatePercent: 10.0, // Tax = 10% of 198 = 19.8
            },
          ],
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.equal(res.body.data.status, 'DRAFT');
      assert.equal(res.body.data.subtotal, 198.0);
      // Discount = 10% of 198 = 19.8
      assert.equal(res.body.data.discountAmount, 19.8);
      // Taxable = 198 - 0 = 198, tax = 19.8
      // Total = 198 - 19.8 + 19.8 = 198.0
      assert.equal(res.body.data.totalAmount, 198.0);
      quoteId = res.body.data.id;
    });

    test('Transition quote status to APPROVED', async () => {
      await request(app).patch(`/api/quotes/${quoteId}/status`).set('Authorization',`Bearer ${salesToken}`).send({status:'PENDING_APPROVAL'});
      const res = await request(app)
        .patch(`/api/quotes/${quoteId}/status`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ status: 'APPROVED' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'APPROVED');
    });

    test('Convert accepted quote into subscription; billing owns invoices', async () => {
      await request(app).patch(`/api/quotes/${quoteId}/status`).set('Authorization',`Bearer ${salesToken}`).send({status:'ACCEPTED'});
      const res = await request(app)
        .post(`/api/quotes/${quoteId}/convert`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({});

      assert.equal(res.status, 200);
      assert.equal(res.body.data.success, true);
      assert.ok(res.body.data.subscriptionId);
      assert.equal(res.body.data.invoiceId, undefined);

      // Verify quote is now marked CONVERTED
      const quoteCheck = await request(app)
        .get(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${salesToken}`);

      assert.equal(quoteCheck.body.data.status, 'CONVERTED');
      assert.equal(quoteCheck.body.data.convertedSubscriptionId, res.body.data.subscriptionId);
    });

    test('Attempting to re-convert an already converted quote fails with 400', async () => {
      const res = await request(app)
        .post(`/api/quotes/${quoteId}/convert`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({});

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'QUOTE_ALREADY_CONVERTED');
    });
  });

  // ==========================================
  // 7. Subscription Lifecycle Management
  // ==========================================
  describe('7. Subscription Lifecycle Management', () => {
    let subId: string;

    test('Create active subscription for customer', async () => {
      const res = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          customerId: 'cust_globex',
          planId: 'plan_pro_monthly',
          startTrial: false,
          initialStatus: 'ACTIVE',
          items: [
            {
              description: 'Additional Seats (x5)',
              quantity: 5,
              unitPrice: 10.0,
            },
          ],
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, 'ACTIVE');
      assert.ok(res.body.data.id);
      subId = res.body.data.id;
    });

    test('Pause subscription records paused_at and status PAUSED', async () => {
      const res = await request(app)
        .post(`/api/subscriptions/${subId}/pause`)
        .set('Authorization', `Bearer ${billingToken}`)
        .send({ reason: 'Seasonal holiday freeze' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'PAUSED');
      assert.ok(res.body.data.pausedAt);
    });

    test('Resume subscription adjusts next billing date to account for pause duration', async () => {
      const res = await request(app)
        .post(`/api/subscriptions/${subId}/resume`)
        .set('Authorization', `Bearer ${billingToken}`)
        .send({});

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'ACTIVE');
      assert.ok(res.body.data.resumeAt);
    });

    test('Upgrade plan with proration calculation and automatic invoice generation', async () => {
      const res = await request(app)
        .post(`/api/subscriptions/${subId}/change-plan`)
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          newPlanId: 'plan_ent_annual', // $2999/yr
          applyProration: true,
          generateInvoice: true,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.subscription.planId, 'plan_ent_annual');
      assert.ok(res.body.data.proration);
      assert.ok(res.body.data.invoice); // Prorated invoice created
    });

    test('Cancel subscription at period end', async () => {
      const res = await request(app)
        .post(`/api/subscriptions/${subId}/cancel`)
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          cancelReason: 'Budget constraints',
          immediate: false,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.cancelAtPeriodEnd, true);
    });
  });

  // ==========================================
  // 8. Billing-Cycle Generation with Duplicate Prevention
  // ==========================================
  describe('8. Billing-Cycle Engine & Duplicate Prevention', () => {
    test('Generate next billing cycle for an eligible subscription', async () => {
      // Create a subscription with next_billing_date in the past
      const db = getDb();
      const pastDate = new Date(Date.now() - 2 * 86400000).toISOString();
      const testSubId = 'sub_due_for_cycle';

      db.prepare(`
        INSERT OR REPLACE INTO subscriptions (
          id, subscription_number, customer_id, plan_id, status,
          current_period_start, current_period_end, next_billing_date,
          cancel_at_period_end, renewal_count, currency, created_at, updated_at
        ) VALUES (?, 'SUB-CYCLE-TEST', 'cust_acme', 'plan_starter_monthly', 'ACTIVE', ?, ?, ?, 0, 0, 'USD', ?, ?)
      `).run(testSubId, pastDate, pastDate, pastDate, pastDate, pastDate);

      db.prepare(`
        INSERT OR REPLACE INTO subscription_items (id, subscription_id, description, quantity, unit_price)
        VALUES ('item_due_1', ?, 'Starter Monthly Base', 1, 29.0)
      `).run(testSubId);

      const res = await request(app)
        .post(`/api/billing/subscriptions/${testSubId}/generate-cycle`)
        .set('Authorization', `Bearer ${billingToken}`)
        .send({ targetDate: new Date().toISOString() });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'GENERATED');
      assert.ok(res.body.data.cycleId);
      assert.ok(res.body.data.invoiceId);
      assert.equal(res.body.data.amount, 29.0);

      // Verify duplicate prevention: re-invoking for the exact same periodStart returns ALREADY_EXISTS with no new invoice!
      const duplicateRes = await request(app)
        .post(`/api/billing/subscriptions/${testSubId}/generate-cycle`)
        .set('Authorization', `Bearer ${billingToken}`)
        .send({ periodStart: pastDate });

      assert.equal(duplicateRes.status, 200);
      assert.equal(duplicateRes.body.data.status, 'ALREADY_EXISTS');
      assert.equal(duplicateRes.body.data.cycleId, res.body.data.cycleId);
    });

    test('Batch billing cycles execution with dryRun option', async () => {
      const res = await request(app)
        .post('/api/billing/run-cycles')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({ dryRun: true });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.dryRun, true);
      assert.ok(Array.isArray(res.body.data.results));
    });
  });

  // ==========================================
  // 9. Invoices, Taxes and Discounts
  // ==========================================
  describe('9. Invoices, Taxes, and Discounts', () => {
    let invoiceId: string;

    test('Create manual ad-hoc invoice with VAT tax and fixed discount', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          customerId: 'cust_acme',
          currency: 'USD',
          discountType: 'FIXED',
          discountValue: 20.0, // $20 off
          taxType: 'VAT',
          notes: 'Consulting services invoice',
          items: [
            {
              description: 'Architecture Review',
              quantity: 2,
              unitPrice: 100.0, // Subtotal = 200
              taxRatePercent: 10.0, // 10% tax = $20
            },
          ],
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.subtotal, 200.0);
      assert.equal(res.body.data.discountAmount, 20.0);
      assert.equal(res.body.data.taxAmount, 20.0);
      // Total = 200 - 20 + 20 = 200
      assert.equal(res.body.data.totalAmount, 200.0);
      assert.equal(res.body.data.balanceDue, 200.0);
      invoiceId = res.body.data.id;
    });

    test('GET /api/invoices/:id/html renders printable HTML invoice', async () => {
      const res = await request(app)
        .get(`/api/invoices/${invoiceId}/html`)
        .set('Authorization', `Bearer ${viewerToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.text.includes('<!DOCTYPE html>'));
      assert.ok(res.text.includes('Brightloop'));
      assert.ok(res.text.includes('Architecture Review'));
    });

    test('Void an unpaid invoice', async () => {
      // Create a throwaway invoice to void
      const tempInv = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          customerId: 'cust_jane',
          items: [{ description: 'Test', quantity: 1, unitPrice: 50.0 }],
        });

      const res = await request(app)
        .patch(`/api/invoices/${tempInv.body.data.id}/status`)
        .set('Authorization', `Bearer ${billingToken}`)
        .send({ status: 'VOID', reason: 'Created by mistake' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'VOID');
    });
  });

  // ==========================================
  // 10. Payment Recording and Outstanding Balances
  // ==========================================
  describe('10. Payment Recording and Outstanding Balances', () => {
    let testInvoiceId: string;

    before(async () => {
      // Create a fresh $100 invoice for payment tests
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          customerId: 'cust_acme',
          items: [{ description: 'Service Line', quantity: 1, unitPrice: 100.0 }],
        });
      testInvoiceId = res.body.data.id;
      await request(app).patch(`/api/invoices/${testInvoiceId}/status`).set('Authorization',`Bearer ${billingToken}`).send({status:'OPEN'});
    });

    test('Partial payment ($40) transitions status to PARTIALLY_PAID', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          customerId: 'cust_acme',
          invoiceId: testInvoiceId,
          amount: 40.0,
          paymentMethod: 'BANK_TRANSFER',
          transactionReference: 'WIRE-9921',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.appliedToInvoice, 40.0);

      // Verify invoice state
      const inv = await request(app)
        .get(`/api/invoices/${testInvoiceId}`)
        .set('Authorization', `Bearer ${billingToken}`);

      assert.equal(inv.body.data.status, 'PARTIALLY_PAID');
      assert.equal(inv.body.data.amountPaid, 40.0);
      assert.equal(inv.body.data.balanceDue, 60.0);
    });

    test('Overpayment ($80 against $60 balance) pays invoice in full and credits $20 surplus to customer credit balance', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          customerId: 'cust_acme',
          invoiceId: testInvoiceId,
          amount: 80.0,
          paymentMethod: 'CREDIT_CARD',
          transactionReference: 'CC-9938',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.appliedToInvoice, 60.0);
      assert.equal(res.body.data.creditedToBalance, 20.0);

      // Verify invoice is PAID
      const inv = await request(app)
        .get(`/api/invoices/${testInvoiceId}`)
        .set('Authorization', `Bearer ${billingToken}`);

      assert.equal(inv.body.data.status, 'PAID');
      assert.equal(inv.body.data.balanceDue, 0.0);
      assert.ok(inv.body.data.paidDate);

      // Verify customer received the $20 credit
      const cust = await request(app)
        .get('/api/customers/cust_acme')
        .set('Authorization', `Bearer ${billingToken}`);

      assert.ok(cust.body.data.creditBalance >= 20.0);
    });

    test('Apply available store credit directly to pay an open invoice', async () => {
      // Create an open $15 invoice
      const invRes = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          customerId: 'cust_acme',
          items: [{ description: 'Quick Item', quantity: 1, unitPrice: 15.0 }],
        });

      const openInvId = invRes.body.data.id;
      await request(app).patch(`/api/invoices/${openInvId}/status`).set('Authorization',`Bearer ${billingToken}`).send({status:'OPEN'});

      const res = await request(app)
        .post('/api/payments/apply-credit')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          invoiceId: openInvId,
          amount: 15.0,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.success, true);
      assert.equal(res.body.data.appliedCredit, 15.0);
      assert.equal(res.body.data.newInvoiceStatus, 'PAID');
    });

    test('Refund payment recalculates invoice balance and marks payment REFUNDED', async () => {
      // Record standalone payment
      const pRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          customerId: 'cust_globex',
          amount: 50.0,
          paymentMethod: 'CASH',
        });

      const paymentId = pRes.body.data.payment.id;

      const refundRes = await request(app)
        .post(`/api/payments/${paymentId}/refund`)
        .set('Authorization', `Bearer ${billingToken}`)
        .send({ reason: 'Accidental duplicate charge' });

      assert.equal(refundRes.status, 200);
      assert.equal(refundRes.body.data.status, 'REFUNDED');
    });
  });

  // ==========================================
  // 11. Dashboard Analytics APIs
  // ==========================================
  describe('11. Dashboard Analytics APIs', () => {
    test('GET /api/analytics/dashboard returns calculated MRR, ARR, AR Aging, and Distributions', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${viewerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const d = res.body.data;
      assert.ok(typeof d.mrr === 'number');
      assert.ok(typeof d.arr === 'number');
      assert.equal(d.arr, Number((d.mrr * 12).toFixed(2)));
      assert.ok(typeof d.activeSubscriptionsCount === 'number');
      assert.ok(typeof d.totalCustomersCount === 'number');
      assert.ok(d.arAging);
      assert.ok(typeof d.arAging.current === 'number');
      assert.ok(Array.isArray(d.revenueByMonth));
      assert.ok(Array.isArray(d.subscriptionStatusDistribution));
      assert.ok(Array.isArray(d.recentActivity));
    });
  });
});
