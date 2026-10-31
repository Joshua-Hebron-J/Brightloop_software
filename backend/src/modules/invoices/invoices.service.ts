import {priceLines,formatMoney,formatDate} from '../../../shared/money';
import {saveInvoiceGst,configuredRate} from '../official/gst';
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function safeHtml<T>(v:T):T {if(typeof v==='string')return escapeHtml(v) as T;if(Array.isArray(v))return v.map(safeHtml) as T;if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,safeHtml(x)])) as T;return v}
import { getDb } from '../../database/db';
import { HttpError } from '../../middlewares/errorHandler';
import { generateFormattedNumber, generateId } from '../../utils/dateUtils';
import { Invoice, InvoiceItem, InvoiceStatus, DiscountType, TaxType } from '../../../shared/types';

export class InvoicesService {
  static listInvoices(query: {
    page: number;
    limit: number;
    customerId?: string;
    subscriptionId?: string;
    status?: InvoiceStatus;
    search?: string;
  }) {
    const db = getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.customerId) {
      conditions.push('i.customer_id = ?');
      params.push(query.customerId);
    }

    if (query.subscriptionId) {
      conditions.push('i.subscription_id = ?');
      params.push(query.subscriptionId);
    }

    if (query.status) {
      conditions.push('i.status = ?');
      params.push(query.status);
    }

    if (query.search) {
      conditions.push('(i.invoice_number LIKE ? OR c.company_name LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?)');
      const term = `%${query.search}%`;
      params.push(term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      ${whereClause}
    `).get(...params) as any;
    const total = countRow ? countRow.count : 0;

    const offset = (query.page - 1) * query.limit;
    const rows = db.prepare(`
      SELECT i.*, c.company_name, c.first_name, c.last_name, c.email as customer_email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, query.limit, offset) as any[];

    const invoiceIds = rows.map((r) => r.id);
    let itemsByInvoice: Record<string, InvoiceItem[]> = {};

    if (invoiceIds.length > 0) {
      const placeholders = invoiceIds.map(() => '?').join(',');
      const itemRows = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id IN (${placeholders})`).all(...invoiceIds) as any[];

      for (const item of itemRows) {
        if (!itemsByInvoice[item.invoice_id]) {
          itemsByInvoice[item.invoice_id] = [];
        }
        itemsByInvoice[item.invoice_id].push(this.mapInvoiceItem(item));
      }
    }

    const items: Invoice[] = rows.map((r) => ({
      ...this.mapInvoice(r),
      items: itemsByInvoice[r.id] || [],
    }));

    return { items, total };
  }

  static getInvoiceById(id: string): Invoice & { payments: any[] } {
    const db = getDb();
    const row = db.prepare(`
      SELECT i.*, c.company_name, c.first_name, c.last_name, c.email as customer_email, c.billing_address, c.tax_id as customer_tax_id
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `).get(id) as any;

    if (!row) {
      throw new HttpError(404, 'Invoice not found', 'INVOICE_NOT_FOUND');
    }

    const itemRows = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id) as any[];
    const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC').all(id) as any[];

    return {
      ...this.mapInvoice(row),
      items: itemRows.map(this.mapInvoiceItem),
      payments,
    };
  }

  static createInvoice(data: {
    customerId: string;
    subscriptionId?: string | null;
    issueDate?: string;
    dueDate?: string;
    currency?: string;
    discountType?: DiscountType;
    discountValue?: number;
    taxType?: TaxType;
    notes?: string | null;
    items: {
      description: string;
      variantId?: string | null;
      quantity: number;
      unitPrice: number;
      taxRatePercent?: number;
    }[];
  }): Invoice {
    const db = getDb();
    const customer = db.prepare('SELECT id, payment_terms_days, currency FROM customers WHERE id = ?').get(data.customerId) as any;
    if (!customer) {
      throw new HttpError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    const id = generateId('inv');
    const invoiceNumber = generateFormattedNumber('INV');
    const now = new Date();
    const issueDate = data.issueDate ? new Date(data.issueDate) : now;
    const paymentTerms = customer.payment_terms_days ?? 30;
    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date(issueDate.getTime() + paymentTerms * 86400000);

    const currency = data.currency || customer.currency || 'INR';
    if(currency!==customer.currency)throw new HttpError(400,'Invoice currency must match customer','CURRENCY_MISMATCH');
    const discountType: DiscountType = data.discountType || 'PERCENTAGE';
    const discountValue = data.discountValue || 0;
    const taxType: TaxType = data.taxType || 'SALES_TAX';

    let subtotal = 0;
    let totalTax = 0;

    const processedItems: {
      id: string;
      invoiceId: string;
      description: string;
      variantId: string | null;
      quantity: number;
      unitPrice: number;
      amount: number;
      taxRatePercent: number;
      taxAmount: number;
    }[] = [];

    for (const item of data.items) {
      const lineAmount = Number((item.quantity * item.unitPrice).toFixed(2));
      const rate = item.taxRatePercent || 0;
      const lineTax = Number((lineAmount * (rate / 100)).toFixed(2));

      subtotal += lineAmount;
      totalTax += lineTax;

      processedItems.push({
        id: generateId('invitem'),
        invoiceId: id,
        description: item.description,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: lineAmount,
        taxRatePercent: rate,
        taxAmount: lineTax,
      });
    }

    subtotal = Number(subtotal.toFixed(2));
    totalTax = Number(totalTax.toFixed(2));

    let discountAmount = 0;
    if (discountType === 'PERCENTAGE') {
      discountAmount = subtotal * (discountValue / 100);
    } else {
      discountAmount = Math.min(subtotal, discountValue);
    }
    discountAmount = Number(discountAmount.toFixed(2));

    let totalAmount = Number(Math.max(0, subtotal - discountAmount + totalTax).toFixed(2));
    if(currency==='INR'){
      const priced=priceLines(data.items.map(i=>({...i,taxRatePercent:configuredRate(undefined,currency,i.taxRatePercent||0)})),discountType,discountValue);
      subtotal=priced.subtotal;discountAmount=priced.discount;totalTax=priced.tax;totalAmount=priced.total;
      processedItems.forEach((i,index)=>{i.amount=priced.lines[index].amount;i.taxRatePercent=priced.lines[index].taxRatePercent||0;i.taxAmount=priced.lines[index].taxAmount});
    }
    const balanceDue = totalAmount;

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, customer_id, subscription_id, billing_cycle_id,
          status, issue_date, due_date, paid_date, currency, subtotal,
          discount_type, discount_value, discount_amount, tax_type,
          tax_rate_percent, tax_amount, total_amount, amount_paid,
          balance_due, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, 'DRAFT', ?, ?, NULL, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0.0, ?, ?, ?, ?)
      `).run(
        id,
        invoiceNumber,
        data.customerId,
        data.subscriptionId || null,
        issueDate.toISOString(),
        dueDate.toISOString(),
        currency,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        taxType,
        totalTax,
        totalAmount,
        balanceDue,
        data.notes || null,
        now.toISOString(),
        now.toISOString()
      );

      const insertItem = db.prepare(`
        INSERT INTO invoice_items (
          id, invoice_id, variant_id, description, quantity, unit_price,
          amount, tax_rate_percent, tax_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const pi of processedItems) {
        insertItem.run(
          pi.id,
          pi.invoiceId,
          pi.variantId,
          pi.description,
          pi.quantity,
          pi.unitPrice,
          pi.amount,
          pi.taxRatePercent,
          pi.taxAmount
        );
      }

      saveInvoiceGst(id);
      db.exec('COMMIT;');
      return this.getInvoiceById(id);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  static updateInvoiceStatus(id: string, status: 'OPEN' | 'VOID' | 'UNCOLLECTIBLE', reason?: string): Invoice {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new HttpError(404, 'Invoice not found', 'INVOICE_NOT_FOUND');
    }

    if (existing.status === 'VOID' || existing.status === 'UNCOLLECTIBLE' || existing.amount_paid>0) throw new HttpError(400,'Invoice cannot be altered in this state','INVALID_INVOICE_STATUS');
    if (existing.status === 'PAID') {
      throw new HttpError(400, 'Cannot void or alter status of an already paid invoice', 'INVOICE_ALREADY_PAID');
    }

    const now = new Date().toISOString();
    const notes = reason ? `${existing.notes || ''}\n[Status update to ${status}]: ${reason}`.trim() : existing.notes;

    db.prepare(`
      UPDATE invoices
      SET status = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(status, notes, now, id);

    return this.getInvoiceById(id);
  }

  static renderHtmlInvoice(id: string): string {
    const invoice = safeHtml(this.getInvoiceById(id));
    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(invoice.customerId) as any;
    let billingAddr: any = {};
    if (customer && customer.billing_address) {
      try {
        billingAddr = JSON.parse(customer.billing_address);
      } catch {
        // empty
      }
    }

    billingAddr=safeHtml(billingAddr);
    if(customer)for(const key of ['company_name','first_name','last_name','email'])if(customer[key])customer[key]=escapeHtml(customer[key]);
    const money=(value:number)=>formatMoney(value,invoice.currency);
    const gst=(invoice as any).gst;
    const rows=invoice.items.map(item=>`<tr><td>${item.description}</td><td>${item.quantity}</td><td>${money(item.unitPrice)}</td><td>${item.taxRatePercent}%</td><td>${money(item.amount)}</td></tr>`).join('');
    const totals=[['Subtotal',invoice.subtotal],['Discount',-invoice.discountAmount],['Taxable value',invoice.subtotal-invoice.discountAmount],...(gst?[['CGST',gst.cgst],['SGST',gst.sgst],['IGST',gst.igst]]:[['Tax',invoice.taxAmount]]),['Total',invoice.totalAmount],['Paid',invoice.amountPaid],['Balance due',invoice.balanceDue]];
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Invoice ${invoice.invoiceNumber} - BillSync</title><style>body{font:14px system-ui;color:#0f172a;max-width:850px;margin:40px auto;padding:24px}header{border-bottom:3px solid #7c3aed;display:flex;justify-content:space-between}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{text-align:right;padding:12px;border-bottom:1px solid #ddd}th:first-child,td:first-child{text-align:left}.totals{margin-left:auto;max-width:340px}.totals p{display:flex;justify-content:space-between}@media print{body{margin:0}}</style></head><body><header><div><h1>BillSync</h1><p>Every bill. Every cycle. In sync.</p>${gst?`<p>${gst.supplier.name}<br>${gst.supplier.address}<br>Supplier state: ${gst.supplier.stateCode}<br>GSTIN: ${gst.supplier.gstin}</p>`:''}</div><div><h2>${gst?'GST INVOICE':'INVOICE'}</h2><p>${invoice.invoiceNumber} / ${invoice.status}</p><p>Issued ${formatDate(invoice.issueDate)}<br>Due ${formatDate(invoice.dueDate)}<br>Currency ${invoice.currency}</p></div></header><h3>BILL TO</h3><p>${gst?.customer.name||customer?.company_name||customer?.first_name||''}<br>${billingAddr.line1||''}<br>${billingAddr.city||''} ${billingAddr.postalCode||''}<br>${gst?`Customer GSTIN: ${gst.customer.gstin}<br>Place of supply: ${gst.placeOfSupplyName} (${gst.placeOfSupply})`:''}</p><table><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Tax %</th><th>Taxable value</th></tr></thead><tbody>${rows}</tbody></table><div class="totals">${totals.map(([label,value])=>`<p><span>${label}</span><strong>${money(Number(value))}</strong></p>`).join('')}</div><p>${invoice.notes||''}</p><footer>Demo billing document. DEMO-prefixed GST identifiers are fictional. No statutory filing or e-invoice certification is claimed.</footer></body></html>`;
  }

  private static mapInvoice(row: any): Omit<Invoice, 'items'> {
    return {
      ...({customerName:row.company_name || [row.first_name,row.last_name].filter(Boolean).join(' '),customerEmail:row.customer_email,planName:row.plan_name,billingFrequency:row.billing_frequency,invoiceNumber:row.invoice_number} as any),
      id: row.id,
      ...({gst:row.gst_snapshot?JSON.parse(row.gst_snapshot):null} as any),
      invoiceNumber: row.invoice_number,
      customerId: row.customer_id,
      subscriptionId: row.subscription_id,
      billingCycleId: row.billing_cycle_id,
      status: row.status,
      issueDate: row.issue_date,
      dueDate: row.due_date,
      paidDate: row.paid_date,
      currency: row.currency,
      subtotal: row.subtotal,
      discountType: row.discount_type,
      discountValue: row.discount_value,
      discountAmount: row.discount_amount,
      taxType: row.tax_type,
      taxRatePercent: row.tax_rate_percent,
      taxAmount: row.tax_amount,
      totalAmount: row.total_amount,
      amountPaid: row.amount_paid,
      balanceDue: row.balance_due,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapInvoiceItem(row: any): InvoiceItem {
    return {
      id: row.id,
      invoiceId: row.invoice_id,
      description: row.description,
      variantId: row.variant_id,
      quantity: row.quantity,
      unitPrice: row.unit_price,
      amount: row.amount,
      taxRatePercent: row.tax_rate_percent,
      taxAmount: row.tax_amount,
    };
  }
}
