import { getDb } from '../../database/db';
import { HttpError } from '../../middlewares/errorHandler';
import { addBillingPeriod, calculateProration, generateFormattedNumber, generateId } from '../../utils/dateUtils';
import { Subscription, SubscriptionItem, SubscriptionStatus } from '../../../shared/types';

export class SubscriptionsService {
  static listSubscriptions(query: {
    page: number;
    limit: number;
    customerId?: string;
    planId?: string;
    status?: SubscriptionStatus;
    search?: string;
  }) {
    const db = getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.customerId) {
      conditions.push('s.customer_id = ?');
      params.push(query.customerId);
    }

    if (query.planId) {
      conditions.push('s.plan_id = ?');
      params.push(query.planId);
    }

    if (query.status) {
      conditions.push('s.status = ?');
      params.push(query.status);
    }

    if (query.search) {
      conditions.push('(s.subscription_number LIKE ? OR c.company_name LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?)');
      const term = `%${query.search}%`;
      params.push(term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM subscriptions s
      LEFT JOIN customers c ON s.customer_id = c.id
      ${whereClause}
    `).get(...params) as any;
    const total = countRow ? countRow.count : 0;

    const offset = (query.page - 1) * query.limit;
    const rows = db.prepare(`
      SELECT s.*,
             c.company_name, c.first_name, c.last_name, c.email as customer_email,
             p.name as plan_name, p.code as plan_code, p.billing_frequency, p.price as plan_price
      FROM subscriptions s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, query.limit, offset) as any[];

    const subIds = rows.map((r) => r.id);
    let itemsBySub: Record<string, SubscriptionItem[]> = {};

    if (subIds.length > 0) {
      const placeholders = subIds.map(() => '?').join(',');
      const itemRows = db.prepare(`
        SELECT * FROM subscription_items WHERE subscription_id IN (${placeholders})
      `).all(...subIds) as any[];

      for (const item of itemRows) {
        if (!itemsBySub[item.subscription_id]) {
          itemsBySub[item.subscription_id] = [];
        }
        itemsBySub[item.subscription_id].push(this.mapSubscriptionItem(item));
      }
    }

    const items: Subscription[] = rows.map((r) => ({
      ...this.mapSubscription(r),
      items: itemsBySub[r.id] || [],
    }));

    return { items, total };
  }

  static getSubscriptionById(id: string): Subscription & { billingCycles: any[]; invoices: any[] } {
    const db = getDb();
    const row = db.prepare(`
      SELECT s.*,
             c.company_name, c.first_name, c.last_name, c.email as customer_email,
             p.name as plan_name, p.code as plan_code, p.billing_frequency, p.price as plan_price
      FROM subscriptions s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.id = ?
    `).get(id) as any;

    if (!row) {
      throw new HttpError(404, 'Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
    }

    const itemRows = db.prepare('SELECT * FROM subscription_items WHERE subscription_id = ?').all(id) as any[];
    const cycles = db.prepare('SELECT * FROM billing_cycles WHERE subscription_id = ? ORDER BY cycle_number DESC').all(id) as any[];
    const invoices = db.prepare('SELECT id, invoice_number, status, total_amount, balance_due, issue_date, due_date FROM invoices WHERE subscription_id = ? ORDER BY issue_date DESC').all(id) as any[];

    return {
      ...this.mapSubscription(row),
      items: itemRows.map(this.mapSubscriptionItem),
      billingCycles: cycles,
      invoices,
    };
  }

  static createSubscription(data: {
    customerId: string;
    planId: string;
    startDate?: string;
    startTrial?: boolean;
    metadata?: Record<string, any>;
    items?: {
      variantId?: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
    }[];
  }): Subscription {
    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(data.customerId) as any;
    if (!customer) {
      throw new HttpError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(data.planId) as any;
    if (!plan) {
      throw new HttpError(404, 'Subscription plan not found', 'PLAN_NOT_FOUND');
    }

    const subId = generateId('sub');
    const subNumber = generateFormattedNumber('SUB');
    const now = new Date();
    const start = data.startDate ? new Date(data.startDate) : now;
    const hasTrial = Boolean(data.startTrial && plan.trial_period_days > 0);

    let status: SubscriptionStatus = 'ACTIVE';
    let trialStart: string | null = null;
    let trialEnd: string | null = null;
    let periodStart: string;
    let periodEnd: string;
    let nextBillingDate: string;

    if (hasTrial) {
      status = 'TRIALING';
      trialStart = start.toISOString();
      const trialEndDate = new Date(start.getTime() + plan.trial_period_days * 86400000);
      trialEnd = trialEndDate.toISOString();
      periodStart = trialStart;
      periodEnd = trialEnd;
      nextBillingDate = trialEnd;
    } else {
      periodStart = start.toISOString();
      const nextDate = addBillingPeriod(start, plan.billing_frequency);
      periodEnd = nextDate.toISOString();
      nextBillingDate = periodEnd;
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO subscriptions (
          id, subscription_number, customer_id, plan_id, status,
          current_period_start, current_period_end, next_billing_date,
          trial_start, trial_end, paused_at, resume_at, cancelled_at,
          cancel_reason, cancel_at_period_end, renewal_count, currency,
          metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 0, 0, ?, ?, ?, ?)
      `).run(
        subId,
        subNumber,
        data.customerId,
        data.planId,
        status,
        periodStart,
        periodEnd,
        nextBillingDate,
        trialStart,
        trialEnd,
        plan.currency || 'USD',
        data.metadata ? JSON.stringify(data.metadata) : null,
        now.toISOString(),
        now.toISOString()
      );

      // Default base plan item
      db.prepare(`
        INSERT INTO subscription_items (id, subscription_id, variant_id, description, quantity, unit_price)
        VALUES (?, ?, NULL, ?, 1, ?)
      `).run(generateId('sitem'), subId, plan.name, plan.price);

      // Additional custom items
      if (data.items && data.items.length > 0) {
        const insertItem = db.prepare(`
          INSERT INTO subscription_items (id, subscription_id, variant_id, description, quantity, unit_price)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const item of data.items) {
          insertItem.run(
            generateId('sitem'),
            subId,
            item.variantId || null,
            item.description,
            item.quantity,
            item.unitPrice
          );
        }
      }

      // If setup fee applies and not on trial, or if starting active, we can generate initial invoice if needed
      db.exec('COMMIT;');
      return this.getSubscriptionById(subId);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  static pauseSubscription(id: string, reason?: string): Subscription {
    const db = getDb();
    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as any;
    if (!sub) {
      throw new HttpError(404, 'Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
    }

    if (sub.status !== 'ACTIVE' && sub.status !== 'TRIALING') {
      throw new HttpError(400, `Cannot pause subscription in status '${sub.status}'`, 'INVALID_ACTION');
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE subscriptions
      SET status = 'PAUSED', paused_at = ?, cancel_reason = ?, updated_at = ?
      WHERE id = ?
    `).run(now, reason || 'Customer requested pause', now, id);

    return this.getSubscriptionById(id);
  }

  static resumeSubscription(id: string, resumeDate?: string): Subscription {
    const db = getDb();
    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as any;
    if (!sub) {
      throw new HttpError(404, 'Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
    }

    if (sub.status !== 'PAUSED') {
      throw new HttpError(400, `Cannot resume subscription that is not paused (current status: ${sub.status})`, 'INVALID_ACTION');
    }

    const now = resumeDate ? new Date(resumeDate) : new Date();
    const pausedAt = sub.paused_at ? new Date(sub.paused_at) : now;
    const pauseDurationMs = Math.max(0, now.getTime() - pausedAt.getTime());

    // Extend period end and next billing date by the exact pause duration!
    const oldEnd = new Date(sub.current_period_end);
    const newEnd = new Date(oldEnd.getTime() + pauseDurationMs).toISOString();

    db.prepare(`
      UPDATE subscriptions
      SET status = 'ACTIVE', resume_at = ?, current_period_end = ?, next_billing_date = ?, updated_at = ?
      WHERE id = ?
    `).run(now.toISOString(), newEnd, newEnd, now.toISOString(), id);

    return this.getSubscriptionById(id);
  }

  static cancelSubscription(id: string, cancelReason: string, immediate = false): Subscription {
    const db = getDb();
    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as any;
    if (!sub) {
      throw new HttpError(404, 'Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
    }

    if (sub.status === 'CANCELLED') {
      throw new HttpError(400, 'Subscription is already cancelled', 'ALREADY_CANCELLED');
    }

    const now = new Date().toISOString();

    if (immediate) {
      db.prepare(`
        UPDATE subscriptions
        SET status = 'CANCELLED', cancelled_at = ?, cancel_reason = ?, cancel_at_period_end = 0, updated_at = ?
        WHERE id = ?
      `).run(now, cancelReason, now, id);
    } else {
      db.prepare(`
        UPDATE subscriptions
        SET cancel_at_period_end = 1, cancel_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(cancelReason, now, id);
    }

    return this.getSubscriptionById(id);
  }

  static changePlan(id: string, newPlanId: string, applyProration = true, generateInvoice = true) {
    const db = getDb();
    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as any;
    if (!sub) {
      throw new HttpError(404, 'Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
    }

    if (sub.status !== 'ACTIVE' && sub.status !== 'TRIALING') {
      throw new HttpError(400, `Cannot change plan for subscription in status '${sub.status}'`, 'INVALID_ACTION');
    }

    const oldPlan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(sub.plan_id) as any;
    const newPlan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(newPlanId) as any;
    if (!newPlan) {
      throw new HttpError(404, 'New subscription plan not found', 'PLAN_NOT_FOUND');
    }

    const now = new Date();
    const periodStart = new Date(sub.current_period_start);
    const periodEnd = new Date(sub.current_period_end);

    let prorationResult = null;
    let createdInvoice = null;

    db.exec('BEGIN TRANSACTION;');
    try {
      if (applyProration && sub.status === 'ACTIVE') {
        prorationResult = calculateProration(
          periodStart,
          periodEnd,
          now,
          oldPlan.price,
          newPlan.price
        );

        if (prorationResult.netProration > 0 && generateInvoice) {
          // Customer upgraded - generate prorated invoice
          const invId = generateId('inv');
          const invNumber = generateFormattedNumber('INV');
          const dueDate = new Date(now.getTime() + 15 * 86400000).toISOString();

          db.prepare(`
            INSERT INTO invoices (
              id, invoice_number, customer_id, subscription_id, billing_cycle_id,
              status, issue_date, due_date, currency, subtotal, discount_type,
              discount_value, discount_amount, tax_type, tax_rate_percent, tax_amount,
              total_amount, amount_paid, balance_due, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, NULL, 'OPEN', ?, ?, ?, ?, 'PERCENTAGE', 0, 0, 'ZERO_RATED', 0, 0, ?, 0, ?, ?, ?, ?)
          `).run(
            invId,
            invNumber,
            sub.customer_id,
            id,
            now.toISOString(),
            dueDate,
            newPlan.currency || 'USD',
            prorationResult.netProration,
            prorationResult.netProration,
            prorationResult.netProration,
            `Prorated upgrade from ${oldPlan.name} to ${newPlan.name} (${prorationResult.daysRemaining} days remaining)`,
            now.toISOString(),
            now.toISOString()
          );

          db.prepare(`
            INSERT INTO invoice_items (id, invoice_id, variant_id, description, quantity, unit_price, amount, tax_rate_percent, tax_amount)
            VALUES (?, ?, NULL, ?, 1, ?, ?, 0, 0)
          `).run(
            generateId('invitem'),
            invId,
            `Proration difference (${oldPlan.name} -> ${newPlan.name})`,
            prorationResult.netProration,
            prorationResult.netProration
          );

          createdInvoice = { id: invId, invoiceNumber: invNumber, amount: prorationResult.netProration };
        } else if (prorationResult.netProration < 0) {
          // Customer downgraded - credit customer balance with difference
          const creditAmount = Math.abs(prorationResult.netProration);
          db.prepare('UPDATE customers SET credit_balance = credit_balance + ? WHERE id = ?').run(
            creditAmount,
            sub.customer_id
          );
        }
      }

      // Update subscription plan
      db.prepare(`
        UPDATE subscriptions
        SET plan_id = ?, updated_at = ?
        WHERE id = ?
      `).run(newPlanId, now.toISOString(), id);

      // Update base item description and price
      db.prepare(`
        UPDATE subscription_items
        SET description = ?, unit_price = ?
        WHERE subscription_id = ? AND variant_id IS NULL
      `).run(newPlan.name, newPlan.price, id);

      db.exec('COMMIT;');

      return {
        subscription: this.getSubscriptionById(id),
        proration: prorationResult,
        invoice: createdInvoice,
      };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  private static mapSubscription(row: any): Omit<Subscription, 'items'> {
    let parsedMetadata = null;
    if (row.metadata) {
      try {
        parsedMetadata = JSON.parse(row.metadata);
      } catch {
        parsedMetadata = null;
      }
    }

    return {
      id: row.id,
      subscriptionNumber: row.subscription_number,
      customerId: row.customer_id,
      planId: row.plan_id,
      status: row.status,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      nextBillingDate: row.next_billing_date,
      trialStart: row.trial_start,
      trialEnd: row.trial_end,
      pausedAt: row.paused_at,
      resumeAt: row.resume_at,
      cancelledAt: row.cancelled_at,
      cancelReason: row.cancel_reason,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      renewalCount: row.renewal_count,
      currency: row.currency,
      metadata: parsedMetadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapSubscriptionItem(row: any): SubscriptionItem {
    return {
      id: row.id,
      subscriptionId: row.subscription_id,
      variantId: row.variant_id,
      description: row.description,
      quantity: row.quantity,
      unitPrice: row.unit_price,
    };
  }
}
