import { getDb } from '../../database/db';
import { HttpError } from '../../middlewares/errorHandler';
import { generateFormattedNumber, generateId } from '../../utils/dateUtils';
import { Payment, PaymentMethod, PaymentStatus } from '../../../shared/types';

export class PaymentsService {
  static listPayments(query: {
    page: number;
    limit: number;
    customerId?: string;
    invoiceId?: string;
    status?: PaymentStatus;
    paymentMethod?: PaymentMethod;
  }) {
    const db = getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.customerId) {
      conditions.push('p.customer_id = ?');
      params.push(query.customerId);
    }

    if (query.invoiceId) {
      conditions.push('p.invoice_id = ?');
      params.push(query.invoiceId);
    }

    if (query.status) {
      conditions.push('p.status = ?');
      params.push(query.status);
    }

    if (query.paymentMethod) {
      conditions.push('p.payment_method = ?');
      params.push(query.paymentMethod);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db.prepare(`SELECT COUNT(*) as count FROM payments p ${whereClause}`).get(...params) as any;
    const total = countRow ? countRow.count : 0;

    const offset = (query.page - 1) * query.limit;
    const rows = db.prepare(`
      SELECT p.*, c.company_name, c.first_name, c.last_name, i.invoice_number
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      ${whereClause}
      ORDER BY p.payment_date DESC
      LIMIT ? OFFSET ?
    `).all(...params, query.limit, offset) as any[];

    return {
      items: rows.map(this.mapPayment),
      total,
    };
  }

  static getPaymentById(id: string): Payment {
    const db = getDb();
    const row = db.prepare(`
      SELECT p.*, c.company_name, c.first_name, c.last_name, i.invoice_number
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.id = ?
    `).get(id) as any;

    if (!row) {
      throw new HttpError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
    }

    return this.mapPayment(row);
  }

  static recordPayment(recordedById: string, data: {
    customerId: string;
    invoiceId?: string | null;
    amount: number;
    currency?: string;
    paymentDate?: string;
    paymentMethod: PaymentMethod;
    transactionReference?: string | null;
    notes?: string | null;
  }) {
    const db = getDb();
    const customer = db.prepare('SELECT id, credit_balance FROM customers WHERE id = ?').get(data.customerId) as any;
    if (!customer) {
      throw new HttpError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    if(data.transactionReference){const prior:any=db.prepare('SELECT * FROM payments WHERE transaction_reference=?').get(data.transactionReference);if(prior){if(prior.customer_id!==data.customerId || prior.invoice_id!==(data.invoiceId||null) || prior.amount!==data.amount)throw new HttpError(409,'Payment reference already used with different details','DUPLICATE_PAYMENT');return {payment:this.getPaymentById(prior.id),appliedToInvoice:0,creditedToBalance:0}}}
    const paymentId = generateId('pay');
    const paymentNumber = generateFormattedNumber('PAY');
    const now = new Date().toISOString();
    const paymentDate = data.paymentDate || now;
    const currency = data.currency || 'USD';
    const amount = Number(data.amount.toFixed(2));

    let creditedToBalance = 0;
    let appliedToInvoice = 0;

    db.exec('BEGIN TRANSACTION;');
    try {
      if (data.invoiceId) {
        const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(data.invoiceId) as any;
        if (!invoice) {
          throw new HttpError(404, 'Invoice not found', 'INVOICE_NOT_FOUND');
        }

        if(invoice.customer_id!==data.customerId || invoice.currency!==currency)throw new HttpError(400,'Payment customer or currency does not match invoice','PAYMENT_MISMATCH');
        if(invoice.status==='DRAFT')throw new HttpError(400,'Confirm the invoice before payment','INVOICE_DRAFT');
        if (invoice.status === 'PAID') {
          throw new HttpError(400, 'Invoice is already fully paid', 'INVOICE_ALREADY_PAID');
        }

        if (invoice.status === 'VOID' || invoice.status === 'UNCOLLECTIBLE') {
          throw new HttpError(400, `Cannot apply payment to invoice in status '${invoice.status}'`, 'INVALID_INVOICE_STATUS');
        }

        if (amount <= invoice.balance_due) {
          appliedToInvoice = amount;
          const newBalanceDue = Number((invoice.balance_due - amount).toFixed(2));
          const newAmountPaid = Number((invoice.amount_paid + amount).toFixed(2));
          const newStatus = newBalanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
          const paidDate = newBalanceDue === 0 ? paymentDate : null;

          db.prepare(`
            UPDATE invoices
            SET status = ?, amount_paid = ?, balance_due = ?, paid_date = ?, updated_at = ?
            WHERE id = ?
          `).run(newStatus, newAmountPaid, newBalanceDue, paidDate, now, invoice.id);
        } else {
          // Overpayment!
          appliedToInvoice = invoice.balance_due;
          creditedToBalance = Number((amount - invoice.balance_due).toFixed(2));

          db.prepare(`
            UPDATE invoices
            SET status = 'PAID', amount_paid = total_amount, balance_due = 0, paid_date = ?, updated_at = ?
            WHERE id = ?
          `).run(paymentDate, now, invoice.id);

          // Add surplus to customer credit balance
          db.prepare(`
            UPDATE customers
            SET credit_balance = credit_balance + ?, updated_at = ?
            WHERE id = ?
          `).run(creditedToBalance, now, customer.id);
        }
      } else {
        // Payment without invoice -> add directly to customer credit balance
        creditedToBalance = amount;
        db.prepare(`
          UPDATE customers
          SET credit_balance = credit_balance + ?, updated_at = ?
          WHERE id = ?
        `).run(creditedToBalance, now, customer.id);
      }

      // Record payment
      db.prepare(`
        INSERT INTO payments (
          id, payment_number, invoice_id, customer_id, amount, currency,
          payment_date, payment_method, status, transaction_reference,
          notes, recorded_by_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?, ?, ?)
      `).run(
        paymentId,
        paymentNumber,
        data.invoiceId || null,
        data.customerId,
        amount,
        currency,
        paymentDate,
        data.paymentMethod,
        data.transactionReference || null,
        data.notes || null,
        recordedById,
        now,
        now
      );

      db.prepare('INSERT INTO payment_allocations VALUES(?,?,?)').run(paymentId,appliedToInvoice,creditedToBalance);
      db.exec('COMMIT;');

      return {
        payment: this.getPaymentById(paymentId),
        appliedToInvoice,
        creditedToBalance,
      };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  static applyCustomerCreditToInvoice(recordedById: string, invoiceId: string, creditAmountToApply: number) {
    const db = getDb();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any;
    if (!invoice) {
      throw new HttpError(404, 'Invoice not found', 'INVOICE_NOT_FOUND');
    }

    if (invoice.status === 'PAID') {
      throw new HttpError(400, 'Invoice is already fully paid', 'INVOICE_ALREADY_PAID');
    }

    const customer = db.prepare('SELECT id, credit_balance FROM customers WHERE id = ?').get(invoice.customer_id) as any;
    if (!customer || customer.credit_balance < creditAmountToApply) {
      throw new HttpError(
        400,
        `Insufficient customer credit. Requested: $${creditAmountToApply}, Available: $${customer?.credit_balance || 0}`,
        'INSUFFICIENT_CREDIT'
      );
    }

    if(!['OPEN','PARTIALLY_PAID'].includes(invoice.status))throw new HttpError(400,'Confirm invoice before applying credit','INVALID_INVOICE_STATUS');
    const toApply = Math.min(creditAmountToApply, invoice.balance_due);
    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Deduct credit from customer
      db.prepare('UPDATE customers SET credit_balance = credit_balance - ?, updated_at = ? WHERE id = ?').run(
        toApply,
        now,
        customer.id
      );

      // 2. Update invoice balance
      const newBalanceDue = Number((invoice.balance_due - toApply).toFixed(2));
      const newAmountPaid = Number((invoice.amount_paid + toApply).toFixed(2));
      const newStatus = newBalanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
      const paidDate = newBalanceDue === 0 ? now : null;

      db.prepare(`
        UPDATE invoices
        SET status = ?, amount_paid = ?, balance_due = ?, paid_date = ?, updated_at = ?
        WHERE id = ?
      `).run(newStatus, newAmountPaid, newBalanceDue, paidDate, now, invoice.id);

      // 3. Record internal credit application payment
      const paymentId = generateId('pay');
      const paymentNumber = generateFormattedNumber('PAY');

      db.prepare(`
        INSERT INTO payments (
          id, payment_number, invoice_id, customer_id, amount, currency,
          payment_date, payment_method, status, transaction_reference,
          notes, recorded_by_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'MOCK_GATEWAY', 'SUCCESS', ?, 'Applied store credit balance', ?, ?, ?)
      `).run(
        paymentId,
        paymentNumber,
        invoice.id,
        customer.id,
        toApply,
        invoice.currency,
        now,
        `credit_deduction_${customer.id}`,
        recordedById,
        now,
        now
      );

      db.prepare('INSERT INTO payment_allocations VALUES(?,?,0)').run(paymentId,toApply);
      db.exec('COMMIT;');

      return {
        success: true,
        invoiceId: invoice.id,
        appliedCredit: toApply,
        remainingBalanceDue: newBalanceDue,
        newInvoiceStatus: newStatus,
        payment: this.getPaymentById(paymentId),
      };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  static refundPayment(paymentId: string, reason: string) {
    const db = getDb();
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as any;
    if (!payment) {
      throw new HttpError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
    }

    if (payment.status === 'REFUNDED') {
      throw new HttpError(400, 'Payment is already refunded', 'ALREADY_REFUNDED');
    }

    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');
    try {
      const allocation:any=db.prepare('SELECT * FROM payment_allocations WHERE payment_id=?').get(paymentId);
      const credit=allocation?.credit_amount||0;const applied=allocation?.invoice_amount??Math.min(payment.amount,Number((db.prepare('SELECT amount_paid FROM invoices WHERE id=?').get(payment.invoice_id||'') as any)?.amount_paid||0));
      const customer:any=db.prepare('SELECT credit_balance FROM customers WHERE id=?').get(payment.customer_id);
      if(credit>customer.credit_balance)throw new HttpError(400,'Overpayment credit has been spent; reconcile credit before refund','CREDIT_ALREADY_SPENT');
      if(credit)db.prepare('UPDATE customers SET credit_balance=round(credit_balance-?,2) WHERE id=?').run(credit,payment.customer_id);
      if (payment.invoice_id) {
        const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(payment.invoice_id) as any;
        if (invoice) {
          const newAmountPaid = Number(Math.max(0, invoice.amount_paid - applied).toFixed(2));
          const newBalanceDue = Number((invoice.balance_due + applied).toFixed(2));
          const newStatus = newAmountPaid === 0 ? 'OPEN' : 'PARTIALLY_PAID';

          db.prepare(`
            UPDATE invoices
            SET status = ?, amount_paid = ?, balance_due = ?, paid_date = NULL, updated_at = ?
            WHERE id = ?
          `).run(newStatus, newAmountPaid, newBalanceDue, now, invoice.id);
        }
      }

      db.prepare(`
        UPDATE payments
        SET status = 'REFUNDED', notes = ?, updated_at = ?
        WHERE id = ?
      `).run(`${payment.notes || ''}\n[Refunded]: ${reason}`.trim(), now, paymentId);

      db.exec('COMMIT;');
      return this.getPaymentById(paymentId);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  private static mapPayment(row: any): Payment {
    return {
      ...({customerName:row.company_name || [row.first_name,row.last_name].filter(Boolean).join(' '),customerEmail:row.customer_email,planName:row.plan_name,billingFrequency:row.billing_frequency,invoiceNumber:row.invoice_number} as any),
      id: row.id,
      paymentNumber: row.payment_number,
      invoiceId: row.invoice_id,
      customerId: row.customer_id,
      amount: row.amount,
      currency: row.currency,
      paymentDate: row.payment_date,
      paymentMethod: row.payment_method,
      status: row.status,
      transactionReference: row.transaction_reference,
      notes: row.notes,
      recordedById: row.recorded_by_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
