import { checkPlan } from '../official/policy';
import { getDb } from '../../database/db';
import { HttpError } from '../../middlewares/errorHandler';
import { addBillingPeriod, generateFormattedNumber, generateId } from '../../utils/dateUtils';
import { Quote, QuoteItem, QuoteStatus, DiscountType } from '../../../shared/types';

export class QuotesService {
  static listQuotes(query: {
    page: number;
    limit: number;
    customerId?: string;
    status?: QuoteStatus;
    search?: string;
  }) {
    const db = getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.customerId) {
      conditions.push('q.customer_id = ?');
      params.push(query.customerId);
    }

    if (query.status) {
      conditions.push('q.status = ?');
      params.push(query.status);
    }

    if (query.search) {
      conditions.push('(q.quote_number LIKE ? OR c.company_name LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?)');
      const term = `%${query.search}%`;
      params.push(term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      ${whereClause}
    `).get(...params) as any;
    const total = countRow ? countRow.count : 0;

    const offset = (query.page - 1) * query.limit;
    const rows = db.prepare(`
      SELECT q.*, c.company_name, c.first_name, c.last_name, c.email as customer_email,
             p.name as plan_name, p.billing_frequency, p.price as plan_price
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN subscription_plans p ON q.plan_id = p.id
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, query.limit, offset) as any[];

    const quoteIds = rows.map((r) => r.id);
    let itemsByQuote: Record<string, QuoteItem[]> = {};

    if (quoteIds.length > 0) {
      const placeholders = quoteIds.map(() => '?').join(',');
      const itemRows = db.prepare(`
        SELECT qi.*, pr.name as product_name
        FROM quote_items qi
        LEFT JOIN products pr ON qi.product_id = pr.id
        WHERE qi.quote_id IN (${placeholders})
      `).all(...quoteIds) as any[];

      for (const item of itemRows) {
        if (!itemsByQuote[item.quote_id]) {
          itemsByQuote[item.quote_id] = [];
        }
        itemsByQuote[item.quote_id].push(this.mapQuoteItem(item));
      }
    }

    const items: Quote[] = rows.map((r) => ({
      ...this.mapQuote(r),
      items: itemsByQuote[r.id] || [],
    }));

    return { items, total };
  }

  static getQuoteById(id: string): Quote {
    const db = getDb();
    const row = db.prepare(`
      SELECT q.*, c.company_name, c.first_name, c.last_name, c.email as customer_email,
             p.name as plan_name, p.billing_frequency, p.price as plan_price
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN subscription_plans p ON q.plan_id = p.id
      WHERE q.id = ?
    `).get(id) as any;

    if (!row) {
      throw new HttpError(404, 'Quote not found', 'QUOTE_NOT_FOUND');
    }

    const itemRows = db.prepare(`
      SELECT qi.*, pr.name as product_name
      FROM quote_items qi
      LEFT JOIN products pr ON qi.product_id = pr.id
      WHERE qi.quote_id = ?
    `).all(id) as any[];

    return {
      ...this.mapQuote(row),
      items: itemRows.map((item) => this.mapQuoteItem(item)),
    };
  }

  static createQuote(userId: string, data: {
    customerId: string;
    planId?: string | null;
    issueDate?: string;
    validUntil: string;
    currency?: string;
    discountType?: DiscountType;
    discountValue?: number;
    notes?: string | null;
    terms?: string | null;
    items: {
      productId?: string | null;
      variantId?: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      taxRatePercent?: number;
    }[];
  }): Quote {
    const db = getDb();
    const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(data.customerId);
    if (!customer) {
      throw new HttpError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    if (data.planId) {
      const plan = db.prepare('SELECT id FROM subscription_plans WHERE id = ?').get(data.planId);
      if (!plan) {
        throw new HttpError(404, 'Subscription plan not found', 'PLAN_NOT_FOUND');
      }
    }

    const quoteId = generateId('quote');
    const quoteNumber = generateFormattedNumber('QUO');
    const now = new Date().toISOString();
    const issueDate = data.issueDate || now;
    const currency = data.currency || 'USD';
    const discountType: DiscountType = data.discountType || 'PERCENTAGE';
    const discountValue = data.discountValue || 0;

    // Calculate line items totals
    let subtotal = 0;
    let totalTax = 0;
    const processedItems: {
      id: string;
      quoteId: string;
      productId: string | null;
      variantId: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      taxRatePercent: number;
      lineTotal: number;
    }[] = [];

    for (const item of data.items) {
      const itemId = generateId('qitem');
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = itemSubtotal * ((item.discountPercent || 0) / 100);
      const taxable = itemSubtotal - itemDiscount;
      const itemTax = taxable * ((item.taxRatePercent || 0) / 100);
      const lineTotal = Number((taxable + itemTax).toFixed(2));

      subtotal += taxable;
      totalTax += itemTax;

      processedItems.push({
        id: itemId,
        quoteId,
        productId: item.productId || null,
        variantId: item.variantId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0,
        taxRatePercent: item.taxRatePercent || 0,
        lineTotal,
      });
    }

    let overallDiscountAmount = 0;
    if (discountType === 'PERCENTAGE') {
      overallDiscountAmount = subtotal * (discountValue / 100);
    } else {
      overallDiscountAmount = Math.min(subtotal, discountValue);
    }
    overallDiscountAmount = Number(overallDiscountAmount.toFixed(2));

    const totalAmount = Number(Math.max(0, subtotal - overallDiscountAmount + totalTax).toFixed(2));

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO quotes (
          id, quote_number, customer_id, plan_id, status, issue_date, valid_until,
          currency, subtotal, discount_type, discount_value, discount_amount,
          tax_amount, total_amount, notes, terms, created_by_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        quoteId,
        quoteNumber,
        data.customerId,
        data.planId || null,
        issueDate,
        data.validUntil,
        currency,
        subtotal,
        discountType,
        discountValue,
        overallDiscountAmount,
        Number(totalTax.toFixed(2)),
        totalAmount,
        data.notes || null,
        data.terms || null,
        userId,
        now,
        now
      );

      const insertItemStmt = db.prepare(`
        INSERT INTO quote_items (
          id, quote_id, product_id, variant_id, description, quantity,
          unit_price, discount_percent, tax_rate_percent, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const pi of processedItems) {
        insertItemStmt.run(
          pi.id,
          pi.quoteId,
          pi.productId,
          pi.variantId,
          pi.description,
          pi.quantity,
          pi.unitPrice,
          pi.discountPercent,
          pi.taxRatePercent,
          pi.lineTotal
        );
      }

      db.exec('COMMIT;');
      return this.getQuoteById(quoteId);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  static updateQuoteStatus(id: string, newStatus: QuoteStatus, _reason?: string): Quote {
    const db = getDb();
    const existing = db.prepare('SELECT status FROM quotes WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new HttpError(404, 'Quote not found', 'QUOTE_NOT_FOUND');
    }

    if (existing.status === 'CONVERTED') {
      throw new HttpError(400, 'Cannot change status of an already converted quote', 'QUOTE_ALREADY_CONVERTED');
    }

    const transitions:Record<string,string[]>={DRAFT:['PENDING_APPROVAL','REJECTED'],PENDING_APPROVAL:['APPROVED','REJECTED'],APPROVED:['ACCEPTED','REJECTED'],ACCEPTED:['REJECTED']};
    if(!transitions[existing.status]?.includes(newStatus))throw new HttpError(400,'Invalid quotation transition','INVALID_TRANSITION');
    const now = new Date().toISOString();
    db.prepare('UPDATE quotes SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, now, id);
    return this.getQuoteById(id);
  }

  static convertToSubscription(quoteId: string, options?: { planId?: string; startDate?: string }) {
    const db = getDb();
    const quote = this.getQuoteById(quoteId);

    if (quote.status === 'CONVERTED') {
      throw new HttpError(400, 'Quote has already been converted', 'QUOTE_ALREADY_CONVERTED');
    }

    if (quote.status !== 'ACCEPTED') {
      throw new HttpError(400, `Cannot convert quote with status '${quote.status}'`, 'INVALID_QUOTE_STATUS');
    }

    if(new Date(quote.validUntil).getTime()<Date.now())throw new HttpError(400,'Quotation expired','QUOTE_EXPIRED');
    // Determine target plan
    const targetPlanId = options?.planId || quote.planId;
    if (!targetPlanId) {
      throw new HttpError(400, 'A subscription plan is required to convert quote into a subscription', 'PLAN_REQUIRED');
    }

    const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(targetPlanId) as any;
    if (!plan) {
      throw new HttpError(404, 'Selected plan not found', 'PLAN_NOT_FOUND');
    }

    const start = options?.startDate ? new Date(options.startDate) : new Date();
    const periodStart = start.toISOString();
    const periodEnd = addBillingPeriod(start, plan.billing_frequency).toISOString();
    checkPlan(plan,periodStart,quote.items);
    const nextBilling = periodStart;

    const subId = generateId('sub');
    const subNumber = generateFormattedNumber('SUB');
    const invId = generateId('inv');
    const invNumber = generateFormattedNumber('INV');
    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Create Subscription
      db.prepare(`
        INSERT INTO subscriptions (
          id, subscription_number, customer_id, plan_id, status,
          current_period_start, current_period_end, next_billing_date,
          trial_start, trial_end, paused_at, resume_at, cancelled_at,
          cancel_reason, cancel_at_period_end, renewal_count, currency,
          metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, ?, ?, ?, ?)
      `).run(
        subId,
        subNumber,
        quote.customerId,
        targetPlanId,
        periodStart,
        periodEnd,
        nextBilling,
        quote.currency,
        JSON.stringify({ convertedFromQuote: quote.quoteNumber, discountType:quote.discountType, discountValue:quote.discountValue }),
        now,
        now
      );

      // Copy quote items to subscription items
      const insertSubItem = db.prepare(`
        INSERT INTO subscription_items (id, subscription_id, variant_id, description, quantity, unit_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const item of quote.items) {
        insertSubItem.run(
          generateId('sitem'),
          subId,
          item.variantId || null,
          item.description,
          item.quantity,
          item.unitPrice
        );
      }

      db.prepare('UPDATE subscription_items SET is_base=1 WHERE id=(SELECT id FROM subscription_items WHERE subscription_id=? ORDER BY rowid LIMIT 1)').run(subId);
      db.prepare('UPDATE subscriptions SET expiry_date=? WHERE id=?').run(plan.available_until||null,subId);
      const rows:any[]=db.prepare('SELECT id FROM subscription_items WHERE subscription_id=? ORDER BY rowid').all(subId);
      rows.forEach((r,i)=>db.prepare('UPDATE subscription_items SET product_id=?,tax_rate_percent=?,unit_price=? WHERE id=?').run(quote.items[i].productId||plan.product_id||null,quote.items[i].taxRatePercent,Number((quote.items[i].unitPrice*(1-quote.items[i].discountPercent/100)).toFixed(2)),r.id));
      // 3. Mark Quote as CONVERTED
      db.prepare(`
        UPDATE quotes
        SET status = 'CONVERTED', converted_subscription_id = ?, converted_invoice_id = ?, updated_at = ?
        WHERE id = ?
      `).run(subId, null, now, quoteId);

      db.exec('COMMIT;');

      return {
        success: true,
        quoteId,
        subscriptionId: subId,
        subscriptionNumber: subNumber,

      };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  private static mapQuote(row: any): Omit<Quote, 'items'> {
    return {
      ...({customerName:row.company_name || [row.first_name,row.last_name].filter(Boolean).join(' '),customerEmail:row.customer_email,planName:row.plan_name,billingFrequency:row.billing_frequency,invoiceNumber:row.invoice_number} as any),
      id: row.id,
      quoteNumber: row.quote_number,
      customerId: row.customer_id,
      planId: row.plan_id,
      status: row.status,
      issueDate: row.issue_date,
      validUntil: row.valid_until,
      currency: row.currency,
      subtotal: row.subtotal,
      discountType: row.discount_type,
      discountValue: row.discount_value,
      discountAmount: row.discount_amount,
      taxAmount: row.tax_amount,
      totalAmount: row.total_amount,
      notes: row.notes,
      terms: row.terms,
      createdById: row.created_by_id,
      convertedSubscriptionId: row.converted_subscription_id,
      convertedInvoiceId: row.converted_invoice_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapQuoteItem(row: any): QuoteItem {
    return {
      id: row.id,
      quoteId: row.quote_id,
      productId: row.product_id,
      variantId: row.variant_id,
      productName: row.product_name,
      description: row.description,
      quantity: row.quantity,
      unitPrice: row.unit_price,
      discountPercent: row.discount_percent,
      taxRatePercent: row.tax_rate_percent,
      lineTotal: row.line_total,
    };
  }
}
