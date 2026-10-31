import { priceRecurring } from '../official/policy';
import { getDb } from '../../database/db';
import { HttpError } from '../../middlewares/errorHandler';
import { addBillingPeriod, generateBillingCycleKey, generateFormattedNumber, generateId } from '../../utils/dateUtils';
import { BillingCycle, BillingCycleStatus } from '../../../shared/types';

export interface CycleGenerationResult {
  subscriptionId: string;
  subscriptionNumber: string;
  cycleId?: string;
  cycleNumber?: number;
  invoiceId?: string;
  invoiceNumber?: string;
  amount?: number;
  status: 'GENERATED' | 'SKIPPED' | 'CANCELLED_AT_PERIOD_END' | 'ALREADY_EXISTS' | 'FAILED';
  reason?: string;
}

export class BillingService {
  static listCycles(query: {
    page: number;
    limit: number;
    subscriptionId?: string;
    status?: BillingCycleStatus;
  }) {
    const db = getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.subscriptionId) {
      conditions.push('bc.subscription_id = ?');
      params.push(query.subscriptionId);
    }

    if (query.status) {
      conditions.push('bc.status = ?');
      params.push(query.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db.prepare(`SELECT COUNT(*) as count FROM billing_cycles bc ${whereClause}`).get(...params) as any;
    const total = countRow ? countRow.count : 0;

    const offset = (query.page - 1) * query.limit;
    const rows = db.prepare(`
      SELECT bc.*, s.subscription_number, i.invoice_number, i.total_amount
      FROM billing_cycles bc
      LEFT JOIN subscriptions s ON bc.subscription_id = s.id
      LEFT JOIN invoices i ON bc.invoice_id = i.id
      ${whereClause}
      ORDER BY bc.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, query.limit, offset) as any[];

    return {
      items: rows.map(this.mapCycle),
      total,
    };
  }

  static getCycleById(id: string): BillingCycle {
    const db = getDb();
    const row = db.prepare('SELECT * FROM billing_cycles WHERE id = ?').get(id) as any;
    if (!row) {
      throw new HttpError(404, 'Billing cycle not found', 'CYCLE_NOT_FOUND');
    }
    return this.mapCycle(row);
  }

  static runBillingCycles(options: {
    targetDate?: string;
    subscriptionIds?: string[];
    dryRun?: boolean;
  }): {
    executedAt: string;
    targetDate: string;
    dryRun: boolean;
    totalProcessed: number;
    generatedCount: number;
    skippedCount: number;
    cancelledCount: number;
    results: CycleGenerationResult[];
  } {
    const db = getDb();
    const now = options.targetDate ? new Date(options.targetDate) : new Date();
    const nowIso = now.toISOString();

    let sql = `
      SELECT s.*, p.name as plan_name, p.billing_frequency, p.price as plan_price, p.currency as plan_currency, p.auto_close, p.allow_renew, p.setup_fee, p.product_id
      FROM subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.status IN ('ACTIVE', 'TRIALING')
        AND (s.next_billing_date <= ? OR (p.auto_close=1 AND s.expiry_date IS NOT NULL AND s.expiry_date <= ?))
    `;
    const params: any[] = [nowIso,nowIso];

    if (options.subscriptionIds && options.subscriptionIds.length > 0) {
      const placeholders = options.subscriptionIds.map(() => '?').join(',');
      sql += ` AND s.id IN (${placeholders})`;
      params.push(...options.subscriptionIds);
    }

    const eligibleSubscriptions = db.prepare(sql).all(...params) as any[];
    const results: CycleGenerationResult[] = [];
    let generatedCount = 0;
    let skippedCount = 0;
    let cancelledCount = 0;

    for (const sub of eligibleSubscriptions) {
      let current=sub;
      for(let catchup=0;catchup<1000 && (current.next_billing_date<=nowIso || (current.auto_close && current.expiry_date && current.expiry_date<=nowIso));catchup++) {
      const res = this.processSubscriptionCycle(current, now, options.dryRun || false);
      results.push(res);

      if (res.status === 'GENERATED') generatedCount++;
      else if (res.status === 'CANCELLED_AT_PERIOD_END') cancelledCount++;
      else skippedCount++;
      if(options.dryRun || res.status!=='GENERATED') break;
      current={...sub,...db.prepare('SELECT * FROM subscriptions WHERE id=?').get(sub.id)};
      if(!['ACTIVE','TRIALING'].includes(current.status))break;
      }
    }

    return {
      executedAt: new Date().toISOString(),
      targetDate: nowIso,
      dryRun: Boolean(options.dryRun),
      totalProcessed: eligibleSubscriptions.length,
      generatedCount,
      skippedCount,
      cancelledCount,
      results,
    };
  }

  static generateCycleForSingleSubscription(
    subscriptionId: string,
    options?: { targetDate?: string; periodStart?: string; force?: boolean }
  ): CycleGenerationResult {
    const db = getDb();
    const sub = db.prepare(`
      SELECT s.*, p.name as plan_name, p.billing_frequency, p.price as plan_price, p.currency as plan_currency, p.auto_close, p.allow_renew, p.setup_fee, p.product_id
      FROM subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.id = ?
    `).get(subscriptionId) as any;

    if (!sub) {
      throw new HttpError(404, 'Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
    }

    const now = options?.targetDate ? new Date(options.targetDate) : new Date();

    // If subscription is not due yet and not forced, return SKIPPED
    if (!options?.force && !options?.periodStart && new Date(sub.next_billing_date).getTime() > now.getTime()) {
      return {
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscription_number,
        status: 'SKIPPED',
        reason: `Subscription is not due for billing until ${sub.next_billing_date}.`,
      };
    }

    return this.processSubscriptionCycle(sub, now, false, options?.periodStart);
  }

  private static processSubscriptionCycle(
    sub: any,
    targetDate: Date,
    dryRun: boolean,
    customPeriodStart?: string
  ): CycleGenerationResult {
    const db = getDb();

    if(!['ACTIVE','TRIALING'].includes(sub.status)) return {subscriptionId:sub.id,subscriptionNumber:sub.subscription_number,status:'SKIPPED',reason:'Subscription is not active'};
    if((sub.renewal_count>0 && !sub.allow_renew) || (sub.auto_close && sub.expiry_date && targetDate.toISOString()>=sub.expiry_date)) {
      if(!dryRun)db.prepare("UPDATE subscriptions SET status='EXPIRED',updated_at=? WHERE id=?").run(targetDate.toISOString(),sub.id);
      return {subscriptionId:sub.id,subscriptionNumber:sub.subscription_number,status:'CANCELLED_AT_PERIOD_END',reason:'Plan reached its configured end'};
    }
    // 1. Check if scheduled for cancellation at period end
    if (sub.cancel_at_period_end && targetDate.toISOString()>=sub.current_period_end) {
      if (!dryRun) {
        db.prepare(`
          UPDATE subscriptions
          SET status = 'CANCELLED', cancelled_at = ?, updated_at = ?
          WHERE id = ?
        `).run(targetDate.toISOString(), targetDate.toISOString(), sub.id);
      }
      return {
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscription_number,
        status: 'CANCELLED_AT_PERIOD_END',
        reason: 'Subscription was marked to cancel at end of current billing period.',
      };
    }

    // 2. Determine cycle date boundaries
    const periodStart = customPeriodStart ? new Date(customPeriodStart) : new Date(sub.next_billing_date);
    const periodEnd = addBillingPeriod(periodStart, sub.billing_frequency);
    const cycleNumber = (sub.renewal_count || 0) + 1;
    const idempotencyKey = generateBillingCycleKey(sub.id, periodStart.toISOString(), periodEnd.toISOString());

    // 3. Duplicate Prevention Check (Guaranteed by idempotency key check + unique index in SQLite)
    const existingCycle = db.prepare('SELECT id, invoice_id FROM billing_cycles WHERE idempotency_key = ?').get(idempotencyKey) as any;
    if (existingCycle) {
      return {
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscription_number,
        cycleId: existingCycle.id,
        invoiceId: existingCycle.invoice_id,
        status: 'ALREADY_EXISTS',
        reason: `Billing cycle for period ${periodStart.toISOString().substring(0, 10)} to ${periodEnd.toISOString().substring(0, 10)} already exists.`,
      };
    }

    // Fetch subscription items
    const subItems = db.prepare('SELECT * FROM subscription_items WHERE subscription_id = ?').all(sub.id) as any[];

    if(sub.renewal_count===0 && sub.setup_fee>0)subItems.push({description:'One-time setup fee',quantity:1,unit_price:sub.setup_fee,product_id:sub.product_id});
    const priced=priceRecurring(sub,subItems,periodStart.toISOString());
    const totalAmount=priced.total;

    if (dryRun) {
      return {
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscription_number,
        cycleNumber,
        amount: totalAmount,
        status: 'GENERATED',
        reason: 'Dry run preview (no records created)',
      };
    }

    // 4. Generate records in atomic transaction
    const cycleId = generateId('bcycle');
    const invoiceId = generateId('inv');
    const invoiceNumber = generateFormattedNumber('INV');
    const nowIso = new Date().toISOString();
    const customer:any=db.prepare('SELECT payment_terms_days FROM customers WHERE id=?').get(sub.customer_id);
    const dueDate = new Date(periodStart.getTime() + (customer.payment_terms_days??30) * 86400000).toISOString();

    db.exec('BEGIN TRANSACTION;');
    try {
      // Create Billing Cycle row with status PENDING
      db.prepare(`
        INSERT INTO billing_cycles (
          id, subscription_id, cycle_number, period_start, period_end,
          billing_date, invoice_id, status, idempotency_key, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
      `).run(
        cycleId,
        sub.id,
        cycleNumber,
        periodStart.toISOString(),
        periodEnd.toISOString(),
        targetDate.toISOString(),
        invoiceId,
        idempotencyKey,
        nowIso,
        nowIso
      );

      // Create Recurring Invoice
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, customer_id, subscription_id, billing_cycle_id,
          status, issue_date, due_date, paid_date, currency, subtotal,
          discount_type, discount_value, discount_amount, tax_type,
          tax_rate_percent, tax_amount, total_amount, amount_paid,
          balance_due, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?, NULL, ?, ?, 'PERCENTAGE', 0, 0, 'ZERO_RATED', 0, 0, ?, 0, ?, ?, ?, ?)
      `).run(
        invoiceId,
        invoiceNumber,
        sub.customer_id,
        sub.id,
        cycleId,
        targetDate.toISOString(),
        dueDate,
        sub.plan_currency || 'USD',
        totalAmount,
        totalAmount,
        totalAmount,
        `Recurring cycle #${cycleNumber} for subscription ${sub.subscription_number}`,
        nowIso,
        nowIso
      );

      db.prepare("UPDATE invoices SET subtotal=?,discount_type='FIXED',discount_value=?,discount_amount=?,tax_amount=?,tax_type='SALES_TAX' WHERE id=?").run(priced.subtotal,priced.discount,priced.discount,priced.tax,invoiceId);
      for(const ruleId of priced.used){db.prepare('INSERT INTO discount_uses VALUES(?,?)').run(ruleId,invoiceId);db.prepare('UPDATE discount_rules SET used_count=used_count+1 WHERE id=?').run(ruleId)}
      // Insert invoice line items
      const insertItem = db.prepare(`
        INSERT INTO invoice_items (id, invoice_id, variant_id, description, quantity, unit_price, amount, tax_rate_percent, tax_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of priced.lines) {
        insertItem.run(
          generateId('invitem'),
          invoiceId,
          item.variant_id || null,
          item.description,
          item.quantity,
          item.unit_price,
          item.amount-item.discount, item.rate, item.tax
        );
      }

      // Mark cycle as GENERATED
      db.prepare("UPDATE billing_cycles SET status = 'GENERATED', updated_at = ? WHERE id = ?").run(nowIso, cycleId);

      // Advance subscription dates
      db.prepare(`
        UPDATE subscriptions
        SET status = 'ACTIVE',
            current_period_start = ?,
            current_period_end = ?,
            next_billing_date = ?,
            renewal_count = renewal_count + 1,
            updated_at = ?
        WHERE id = ?
      `).run(
        periodStart.toISOString(),
        periodEnd.toISOString(),
        periodEnd.toISOString(),
        nowIso,
        sub.id
      );

      db.exec('COMMIT;');

      return {
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscription_number,
        cycleId,
        cycleNumber,
        invoiceId,
        invoiceNumber,
        amount: totalAmount,
        status: 'GENERATED',
      };
    } catch (err: any) {
      db.exec('ROLLBACK;');
      return {
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscription_number,
        status: 'FAILED',
        reason: err.message,
      };
    }
  }

  private static mapCycle(row: any): BillingCycle {
    return {
      id: row.id,
      subscriptionId: row.subscription_id,
      cycleNumber: row.cycle_number,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      billingDate: row.billing_date,
      invoiceId: row.invoice_id,
      status: row.status,
      idempotencyKey: row.idempotency_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
