import bcrypt from 'bcryptjs';
import { getDb } from './db';
import { runMigrations } from './migrate';

export function seedDatabase(dbPath?: string): void {
  // Ensure schema exists first
  runMigrations(dbPath);
  const db = getDb(dbPath);

  console.log('Seeding database with test and demo data...');
  const now = new Date().toISOString();

  // 1. Users
  const passwordHash = bcrypt.hashSync('Password123!', 10);
  const users = [
    {
      id: 'usr_admin',
      email: 'admin@brightloop.io',
      firstName: 'Alex',
      lastName: 'Vance',
      role: 'ADMIN',
    },
    {
      id: 'usr_billing',
      email: 'billing@brightloop.io',
      firstName: 'Beth',
      lastName: 'Miller',
      role: 'BILLING_MANAGER',
    },
    {
      id: 'usr_sales',
      email: 'sales@brightloop.io',
      firstName: 'Sam',
      lastName: 'Ray',
      role: 'SALES_REP',
    },
    {
      id: 'usr_viewer',
      email: 'viewer@brightloop.io',
      firstName: 'Val',
      lastName: 'Stone',
      role: 'VIEWER',
    },
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  for (const u of users) {
    insertUser.run(u.id, u.email, passwordHash, u.firstName, u.lastName, u.role, now, now);
  }

  // 2. Products & Variants
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (id, name, code, description, category, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `);
  const insertVariant = db.prepare(`
    INSERT OR IGNORE INTO product_variants (id, product_id, name, sku, description, attributes, unit_price, cost_price, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `);

  insertProduct.run('prod_core', 'Brightloop Cloud Suite', 'BL-CLOUD', 'Next-gen SaaS billing and revenue orchestration platform', 'Software', now, now);
  insertVariant.run('var_starter', 'prod_core', 'Starter Tier', 'SKU-BL-START', 'Up to 500 active subscribers', JSON.stringify({ subscribers: 500 }), 29.0, 5.0, now, now);
  insertVariant.run('var_pro', 'prod_core', 'Pro Tier', 'SKU-BL-PRO', 'Up to 5,000 active subscribers & analytics', JSON.stringify({ subscribers: 5000 }), 99.0, 15.0, now, now);
  insertVariant.run('var_ent', 'prod_core', 'Enterprise Tier', 'SKU-BL-ENT', 'Unlimited subscribers with multi-entity support', JSON.stringify({ subscribers: -1 }), 299.0, 50.0, now, now);

  insertProduct.run('prod_addon_support', 'Dedicated SLA Support', 'BL-SUPP', '24/7 dedicated support manager with 1-hour SLA', 'Services', now, now);
  insertVariant.run('var_supp_gold', 'prod_addon_support', 'Gold SLA', 'SKU-SLA-GOLD', '24/7 Priority escalation channel', JSON.stringify({ slaHours: 1 }), 150.0, 40.0, now, now);

  // 3. Subscription Plans
  const insertPlan = db.prepare(`
    INSERT OR IGNORE INTO subscription_plans (id, name, code, description, billing_frequency, price, currency, trial_period_days, setup_fee, features, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `);

  insertPlan.run(
    'plan_starter_monthly',
    'Starter Monthly',
    'PLAN-START-M',
    'Essential billing tools for growing teams',
    'MONTHLY',
    29.0,
    'USD',
    14,
    0.0,
    JSON.stringify(['Up to 500 customers', 'Basic analytics', 'Email support']),
    now,
    now
  );

  insertPlan.run(
    'plan_pro_monthly',
    'Pro Monthly',
    'PLAN-PRO-M',
    'Advanced billing automation, webhooks, and prorated cycles',
    'MONTHLY',
    99.0,
    'USD',
    14,
    50.0,
    JSON.stringify(['Up to 5,000 customers', 'Dunning management', 'Full analytics', 'Priority support']),
    now,
    now
  );

  insertPlan.run(
    'plan_pro_annual',
    'Pro Annual',
    'PLAN-PRO-A',
    'Save 20% with annual commitment',
    'ANNUALLY',
    990.0,
    'USD',
    30,
    0.0,
    JSON.stringify(['All Pro features', '2 months free', 'Dedicated onboarding']),
    now,
    now
  );

  insertPlan.run(
    'plan_ent_annual',
    'Enterprise Annual',
    'PLAN-ENT-A',
    'Custom tailored enterprise subscription',
    'ANNUALLY',
    2999.0,
    'USD',
    0,
    500.0,
    JSON.stringify(['Unlimited customers', 'Custom integrations', 'Custom SLA', 'Account manager']),
    now,
    now
  );

  // 4. Customers
  const insertCustomer = db.prepare(`
    INSERT OR IGNORE INTO customers (id, customer_number, type, company_name, first_name, last_name, email, phone, billing_address, shipping_address, tax_id, currency, payment_terms_days, credit_balance, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `);

  insertCustomer.run(
    'cust_acme',
    'CUST-1001',
    'ORGANIZATION',
    'Acme Innovations Inc',
    'Wile',
    'Coyote',
    'billing@acme.com',
    '+1 555-0199',
    JSON.stringify({ line1: '123 Desert Road', city: 'Phoenix', state: 'AZ', postalCode: '85001', country: 'US' }),
    JSON.stringify({ line1: '123 Desert Road', city: 'Phoenix', state: 'AZ', postalCode: '85001', country: 'US' }),
    'US-EIN-99281726',
    'USD',
    30,
    0.0,
    now,
    now
  );

  insertCustomer.run(
    'cust_globex',
    'CUST-1002',
    'ORGANIZATION',
    'Globex International',
    'Hank',
    'Scorpio',
    'finance@globex.org',
    '+44 20 7946 0912',
    JSON.stringify({ line1: '45 Canary Wharf', city: 'London', postalCode: 'E14 5AB', country: 'GB' }),
    null,
    'GB-VAT-123456789',
    'USD',
    15,
    50.0,
    now,
    now
  );

  insertCustomer.run(
    'cust_jane',
    'CUST-1003',
    'INDIVIDUAL',
    null,
    'Jane',
    'Doe',
    'jane.doe@example.com',
    '+1 415-555-2671',
    JSON.stringify({ line1: '742 Evergreen Terrace', city: 'Springfield', state: 'OR', postalCode: '97477', country: 'US' }),
    null,
    null,
    'USD',
    0,
    0.0,
    now,
    now
  );

  // 5. Active Subscriptions
  const insertSub = db.prepare(`
    INSERT OR IGNORE INTO subscriptions (id, subscription_number, customer_id, plan_id, status, current_period_start, current_period_end, next_billing_date, trial_start, trial_end, paused_at, resume_at, cancelled_at, cancel_reason, cancel_at_period_end, renewal_count, currency, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const d = new Date();
  const periodStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  const periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const nextBilling = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();

  insertSub.run(
    'sub_acme_pro',
    'SUB-2026-001',
    'cust_acme',
    'plan_pro_monthly',
    'ACTIVE',
    periodStart,
    periodEnd,
    nextBilling,
    null,
    null,
    null,
    null,
    null,
    null,
    0,
    3,
    'USD',
    JSON.stringify({ salesChannel: 'Direct' }),
    now,
    now
  );

  insertSub.run(
    'sub_jane_trial',
    'SUB-2026-002',
    'cust_jane',
    'plan_starter_monthly',
    'TRIALING',
    now,
    new Date(Date.now() + 14 * 86400000).toISOString(),
    new Date(Date.now() + 14 * 86400000).toISOString(),
    now,
    new Date(Date.now() + 14 * 86400000).toISOString(),
    null,
    null,
    null,
    null,
    0,
    0,
    'USD',
    null,
    now,
    now
  );

  // 6. Invoices
  const insertInvoice = db.prepare(`
    INSERT OR IGNORE INTO invoices (id, invoice_number, customer_id, subscription_id, billing_cycle_id, status, issue_date, due_date, paid_date, currency, subtotal, discount_type, discount_value, discount_amount, tax_type, tax_rate_percent, tax_amount, total_amount, amount_paid, balance_due, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertInvoiceItem = db.prepare(`
    INSERT OR IGNORE INTO invoice_items (id, invoice_id, variant_id, description, quantity, unit_price, amount, tax_rate_percent, tax_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Invoice 1: Paid invoice
  insertInvoice.run(
    'inv_1001',
    'INV-2026-001',
    'cust_acme',
    'sub_acme_pro',
    null,
    'PAID',
    periodStart,
    new Date(Date.now() + 15 * 86400000).toISOString(),
    now,
    'USD',
    99.0,
    'PERCENTAGE',
    0,
    0.0,
    'SALES_TAX',
    10.0,
    9.9,
    108.9,
    108.9,
    0.0,
    'Regular monthly subscription charge',
    now,
    now
  );
  insertInvoiceItem.run('item_inv_1001_1', 'inv_1001', 'var_pro', 'Pro Monthly Subscription', 1, 99.0, 99.0, 10.0, 9.9);

  // Invoice 2: Open unpaid invoice
  insertInvoice.run(
    'inv_1002',
    'INV-2026-002',
    'cust_globex',
    null,
    null,
    'OPEN',
    now,
    new Date(Date.now() + 15 * 86400000).toISOString(),
    null,
    'USD',
    150.0,
    'PERCENTAGE',
    0,
    0.0,
    'VAT',
    20.0,
    30.0,
    180.0,
    0.0,
    180.0,
    'Ad-hoc setup and support fees',
    now,
    now
  );
  insertInvoiceItem.run('item_inv_1002_1', 'inv_1002', 'var_supp_gold', 'Dedicated SLA Support - 1 Month', 1, 150.0, 150.0, 20.0, 30.0);

  // 7. Payment for invoice 1
  const insertPayment = db.prepare(`
    INSERT OR IGNORE INTO payments (id, payment_number, invoice_id, customer_id, amount, currency, payment_date, payment_method, status, transaction_reference, notes, recorded_by_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUCCESS', ?, ?, 'usr_admin', ?, ?)
  `);

  insertPayment.run(
    'pay_1001',
    'PAY-2026-001',
    'inv_1001',
    'cust_acme',
    108.9,
    'USD',
    now,
    'CREDIT_CARD',
    'txn_mock_ch_99217834',
    'Auto-charged corporate card ending 4242',
    now,
    now
  );

  // 8. Sample Quote
  const insertQuote = db.prepare(`
    INSERT OR IGNORE INTO quotes (id, quote_number, customer_id, plan_id, status, issue_date, valid_until, currency, subtotal, discount_type, discount_value, discount_amount, tax_amount, total_amount, notes, terms, created_by_id, converted_subscription_id, converted_invoice_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertQuoteItem = db.prepare(`
    INSERT OR IGNORE INTO quote_items (id, quote_id, product_id, variant_id, description, quantity, unit_price, discount_percent, tax_rate_percent, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertQuote.run(
    'quote_1001',
    'QUO-2026-001',
    'cust_acme',
    'plan_ent_annual',
    'APPROVED',
    now,
    new Date(Date.now() + 30 * 86400000).toISOString(),
    'USD',
    2999.0,
    'PERCENTAGE',
    10.0,
    299.9,
    269.91,
    2969.01,
    'Special early-adopter enterprise discount',
    'Payment due Net 30 from activation',
    'usr_sales',
    null,
    null,
    now,
    now
  );
  insertQuoteItem.run(
    'qitem_1',
    'quote_1001',
    'prod_core',
    'var_ent',
    'Enterprise Tier (Annual Plan)',
    1,
    2999.0,
    0.0,
    10.0,
    3298.9
  );

  // Complete the original demo subscriptions with real billable lines.
  const baseLine=db.prepare('INSERT OR IGNORE INTO subscription_items(id,subscription_id,variant_id,product_id,description,quantity,unit_price,tax_rate_percent,is_base) VALUES(?,?,?,?,?,?,?,10,1)');
  baseLine.run('demo_acme_base','sub_acme_pro','var_pro','prod_core','Pro Monthly',1,99);
  baseLine.run('demo_jane_base','sub_jane_trial','var_starter','prod_core','Starter Monthly',1,29);
  db.prepare("UPDATE products SET sales_price=29,cost_price=5 WHERE id='prod_core' AND sales_price=0").run();
  db.prepare("UPDATE products SET sales_price=150,cost_price=40 WHERE id='prod_addon_support' AND sales_price=0").run();
  db.prepare("UPDATE subscription_plans SET product_id='prod_core' WHERE product_id IS NULL AND id IN ('plan_starter_monthly','plan_pro_monthly','plan_ent_annual')").run();
  const historicalInvoice=db.prepare("INSERT OR IGNORE INTO invoices(id,invoice_number,customer_id,status,issue_date,due_date,paid_date,currency,subtotal,tax_amount,total_amount,amount_paid,balance_due,created_at,updated_at) VALUES(?,?,'cust_acme','PAID',?,?,?,'USD',?,0,?,?,0,?,?)");
  const historicalPayment=db.prepare("INSERT OR IGNORE INTO payments(id,payment_number,invoice_id,customer_id,amount,currency,payment_date,payment_method,status,transaction_reference,notes,recorded_by_id,created_at,updated_at) VALUES(?,?,?,'cust_acme',?,'USD',?,'BANK_TRANSFER','SUCCESS',?,'Fictional historical demo receipt','usr_admin',?,?)");
  for(let m=1;m<=5;m++){
    const date=new Date();date.setUTCDate(10);date.setUTCMonth(date.getUTCMonth()-m);const stamp=date.toISOString(),key=stamp.slice(0,7),amount=99+m*25;
    historicalInvoice.run('demo_inv_'+key,'DEMO-INV-'+key,stamp,stamp,stamp,amount,amount,amount,stamp,stamp);
    historicalPayment.run('demo_pay_'+key,'DEMO-PAY-'+key,'demo_inv_'+key,amount,stamp,'demo-bank-'+key,stamp,stamp);
    db.prepare('INSERT OR IGNORE INTO invoice_items(id,invoice_id,description,quantity,unit_price,amount) VALUES(?,?,?,1,?,?)').run('demo_line_'+key,'demo_inv_'+key,'Historical demo services',amount,amount);
  }
  const demoCustomer:any=db.prepare('SELECT id FROM customers ORDER BY id LIMIT 1').get();
  if(demoCustomer)db.prepare("INSERT OR IGNORE INTO users(id,email,password_hash,first_name,last_name,role,is_active,created_at,updated_at,customer_id) VALUES('usr_customer','customer@brightloop.io',?,'Casey','Demo','CUSTOMER',1,?,?,?)").run(passwordHash,now,now,demoCustomer.id);
  console.log('Seed completed successfully!');
}

if (require.main === module) {
  try {
    seedDatabase();
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}
