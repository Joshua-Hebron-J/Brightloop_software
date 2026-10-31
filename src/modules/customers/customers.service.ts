import { getDb } from '../../database/db';
import { HttpError } from '../../middlewares/errorHandler';
import { generateFormattedNumber, generateId } from '../../utils/dateUtils';
import { Customer, CustomerAddress, CustomerStatus, CustomerType } from '../../../shared/types';

export class CustomersService {
  static listCustomers(query: {
    page: number;
    limit: number;
    search?: string;
    status?: CustomerStatus;
    type?: CustomerType;
  }) {
    const db = getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.search) {
      conditions.push('(company_name LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR customer_number LIKE ?)');
      const term = `%${query.search}%`;
      params.push(term, term, term, term, term);
    }

    if (query.status) {
      conditions.push('status = ?');
      params.push(query.status);
    }

    if (query.type) {
      conditions.push('type = ?');
      params.push(query.type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db.prepare(`SELECT COUNT(*) as count FROM customers ${whereClause}`).get(...params) as any;
    const total = countRow ? countRow.count : 0;

    const offset = (query.page - 1) * query.limit;
    const rows = db
      .prepare(`SELECT * FROM customers ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, query.limit, offset) as any[];

    const mappedCustomers = rows.map((r) => {
      const outstanding = this.calculateOutstandingBalance(r.id, r.credit_balance);
      return this.mapCustomer(r, outstanding);
    });

    return { items: mappedCustomers, total };
  }

  static getCustomerById(id: string) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
    if (!row) {
      throw new HttpError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    const outstanding = this.calculateOutstandingBalance(id, row.credit_balance);
    const customer = this.mapCustomer(row, outstanding);

    // Also fetch associated subscriptions and recent invoices for rich context
    const subscriptions = db
      .prepare('SELECT id, subscription_number, plan_id, status, current_period_end, next_billing_date FROM subscriptions WHERE customer_id = ? ORDER BY created_at DESC')
      .all(id) as any[];

    const invoices = db
      .prepare('SELECT id, invoice_number, status, total_amount, balance_due, due_date, issue_date FROM invoices WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10')
      .all(id) as any[];

    return {
      ...customer,
      subscriptions,
      recentInvoices: invoices,
    };
  }

  static createCustomer(data: {
    type: CustomerType;
    companyName?: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    billingAddress: CustomerAddress;
    shippingAddress?: CustomerAddress | null;
    taxId?: string | null;
    currency?: string;
    paymentTermsDays?: number;
    status?: CustomerStatus;
  }): Customer {
    const db = getDb();
    const id = generateId('cust');
    const customerNumber = generateFormattedNumber('CUST');
    const now = new Date().toISOString();
    const status = data.status || 'ACTIVE';
    const currency = data.currency || 'USD';
    const terms = data.paymentTermsDays ?? 30;

    db.prepare(`
      INSERT INTO customers (
        id, customer_number, type, company_name, first_name, last_name,
        email, phone, billing_address, shipping_address, tax_id, currency,
        payment_terms_days, credit_balance, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, ?)
    `).run(
      id,
      customerNumber,
      data.type,
      data.companyName || null,
      data.firstName,
      data.lastName,
      data.email,
      data.phone || null,
      JSON.stringify(data.billingAddress),
      data.shippingAddress ? JSON.stringify(data.shippingAddress) : null,
      data.taxId || null,
      currency,
      terms,
      status,
      now,
      now
    );

    return {
      id,
      customerNumber,
      type: data.type,
      companyName: data.companyName || null,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || null,
      billingAddress: data.billingAddress,
      shippingAddress: data.shippingAddress || null,
      taxId: data.taxId || null,
      currency,
      paymentTermsDays: terms,
      creditBalance: 0.0,
      outstandingBalance: 0.0,
      status,
      createdAt: now,
      updatedAt: now,
    };
  }

  static updateCustomer(id: string, data: Partial<{
    type: CustomerType;
    companyName: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    billingAddress: CustomerAddress;
    shippingAddress: CustomerAddress | null;
    taxId: string | null;
    currency: string;
    paymentTermsDays: number;
    status: CustomerStatus;
  }>): Customer {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new HttpError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    const now = new Date().toISOString();
    const updated = {
      type: data.type ?? existing.type,
      companyName: data.companyName !== undefined ? data.companyName : existing.company_name,
      firstName: data.firstName ?? existing.first_name,
      lastName: data.lastName ?? existing.last_name,
      email: data.email ?? existing.email,
      phone: data.phone !== undefined ? data.phone : existing.phone,
      billingAddress: data.billingAddress ? JSON.stringify(data.billingAddress) : existing.billing_address,
      shippingAddress: data.shippingAddress !== undefined ? (data.shippingAddress ? JSON.stringify(data.shippingAddress) : null) : existing.shipping_address,
      taxId: data.taxId !== undefined ? data.taxId : existing.tax_id,
      currency: data.currency ?? existing.currency,
      paymentTermsDays: data.paymentTermsDays !== undefined ? data.paymentTermsDays : existing.payment_terms_days,
      status: data.status ?? existing.status,
    };

    db.prepare(`
      UPDATE customers
      SET type = ?, company_name = ?, first_name = ?, last_name = ?, email = ?,
          phone = ?, billing_address = ?, shipping_address = ?, tax_id = ?,
          currency = ?, payment_terms_days = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updated.type,
      updated.companyName,
      updated.firstName,
      updated.lastName,
      updated.email,
      updated.phone,
      updated.billingAddress,
      updated.shippingAddress,
      updated.taxId,
      updated.currency,
      updated.paymentTermsDays,
      updated.status,
      now,
      id
    );

    const fresh = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
    const outstanding = this.calculateOutstandingBalance(id, fresh.credit_balance);
    return this.mapCustomer(fresh, outstanding);
  }

  static adjustCreditBalance(id: string, amount: number, reason: string): Customer {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new HttpError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    const newCredit = Number((existing.credit_balance + amount).toFixed(2));
    if (newCredit < 0) {
      throw new HttpError(400, 'Cannot reduce credit balance below zero', 'INSUFFICIENT_CREDIT');
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE customers SET credit_balance = ?, updated_at = ? WHERE id = ?').run(newCredit, now, id);

    const fresh = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
    const outstanding = this.calculateOutstandingBalance(id, fresh.credit_balance);
    return this.mapCustomer(fresh, outstanding);
  }

  static deleteCustomer(id: string): void {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);
    if (!existing) {
      throw new HttpError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    const activeSub = db.prepare("SELECT id FROM subscriptions WHERE customer_id = ? AND status IN ('ACTIVE', 'TRIALING')").get(id);
    if (activeSub) {
      throw new HttpError(400, 'Cannot delete customer with active subscriptions. Cancel them or archive customer.', 'CUSTOMER_HAS_ACTIVE_SUBS');
    }

    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  }

  private static calculateOutstandingBalance(customerId: string, creditBalance: number): number {
    const db = getDb();
    const row = db
      .prepare("SELECT SUM(balance_due) as totalDue FROM invoices WHERE customer_id = ? AND status IN ('OPEN', 'PARTIALLY_PAID')")
      .get(customerId) as any;

    const totalDue = row && row.totalDue ? Number(row.totalDue) : 0.0;
    return Number(Math.max(0, totalDue - (creditBalance || 0)).toFixed(2));
  }

  private static mapCustomer(row: any, outstandingBalance = 0.0): Customer {
    let billingAddr: CustomerAddress = { line1: '', city: '', postalCode: '', country: '' };
    let shippingAddr: CustomerAddress | null = null;

    try {
      billingAddr = JSON.parse(row.billing_address);
    } catch {
      // fallback
    }

    if (row.shipping_address) {
      try {
        shippingAddr = JSON.parse(row.shipping_address);
      } catch {
        shippingAddr = null;
      }
    }

    return {
      id: row.id,
      customerNumber: row.customer_number,
      type: row.type,
      companyName: row.company_name,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      billingAddress: billingAddr,
      shippingAddress: shippingAddr,
      taxId: row.tax_id,
      currency: row.currency,
      paymentTermsDays: row.payment_terms_days,
      creditBalance: Number(row.credit_balance || 0),
      outstandingBalance,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
