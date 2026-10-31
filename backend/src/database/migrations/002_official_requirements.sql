CREATE TABLE IF NOT EXISTS users_new (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN', 'BILLING_MANAGER', 'SALES_REP', 'VIEWER', 'CUSTOMER')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO users_new (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at) SELECT id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
CREATE TABLE IF NOT EXISTS subscription_plans_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  billing_frequency TEXT NOT NULL CHECK(billing_frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY')),
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  trial_period_days INTEGER NOT NULL DEFAULT 0,
  setup_fee REAL NOT NULL DEFAULT 0.0,
  features TEXT, -- JSON array
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'ARCHIVED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO subscription_plans_new (id, name, code, description, billing_frequency, price, currency, trial_period_days, setup_fee, features, status, created_at, updated_at) SELECT id, name, code, description, billing_frequency, price, currency, trial_period_days, setup_fee, features, status, created_at, updated_at FROM subscription_plans;
DROP TABLE subscription_plans;
ALTER TABLE subscription_plans_new RENAME TO subscription_plans;
CREATE TABLE IF NOT EXISTS subscriptions_new (
  id TEXT PRIMARY KEY,
  subscription_number TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'QUOTATION', 'CONFIRMED', 'TRIALING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED')),
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  next_billing_date TEXT NOT NULL,
  trial_start TEXT,
  trial_end TEXT,
  paused_at TEXT,
  resume_at TEXT,
  cancelled_at TEXT,
  cancel_reason TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  renewal_count INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  metadata TEXT, -- JSON
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO subscriptions_new (id, subscription_number, customer_id, plan_id, status, current_period_start, current_period_end, next_billing_date, trial_start, trial_end, paused_at, resume_at, cancelled_at, cancel_reason, cancel_at_period_end, renewal_count, currency, metadata, created_at, updated_at) SELECT id, subscription_number, customer_id, plan_id, status, current_period_start, current_period_end, next_billing_date, trial_start, trial_end, paused_at, resume_at, cancelled_at, cancel_reason, cancel_at_period_end, renewal_count, currency, metadata, created_at, updated_at FROM subscriptions;
DROP TABLE subscriptions;
ALTER TABLE subscriptions_new RENAME TO subscriptions;

ALTER TABLE users ADD COLUMN customer_id TEXT REFERENCES customers(id);
CREATE UNIQUE INDEX idx_users_email_normalized ON users(lower(email));
ALTER TABLE products ADD COLUMN product_type TEXT NOT NULL DEFAULT 'Software';
ALTER TABLE products ADD COLUMN sales_price REAL NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0;
ALTER TABLE product_variants ADD COLUMN price_extra REAL NOT NULL DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN product_id TEXT REFERENCES products(id);
ALTER TABLE subscription_plans ADD COLUMN minimum_quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE subscription_plans ADD COLUMN available_from TEXT;
ALTER TABLE subscription_plans ADD COLUMN available_until TEXT;
ALTER TABLE subscription_plans ADD COLUMN allow_pause INTEGER NOT NULL DEFAULT 1;
ALTER TABLE subscription_plans ADD COLUMN allow_close INTEGER NOT NULL DEFAULT 1;
ALTER TABLE subscription_plans ADD COLUMN allow_renew INTEGER NOT NULL DEFAULT 1;
ALTER TABLE subscription_plans ADD COLUMN auto_close INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN expiry_date TEXT;
ALTER TABLE subscription_items ADD COLUMN product_id TEXT REFERENCES products(id);
ALTER TABLE subscription_items ADD COLUMN tax_rate_percent REAL NOT NULL DEFAULT 0;
CREATE TABLE password_resets(token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0);
CREATE TABLE tax_rules(id TEXT PRIMARY KEY, name TEXT NOT NULL, rate REAL NOT NULL CHECK(rate BETWEEN 0 AND 100), product_id TEXT REFERENCES products(id), active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE discount_rules(id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('FIXED','PERCENTAGE')), value REAL NOT NULL CHECK(value >= 0), minimum_purchase REAL NOT NULL DEFAULT 0, minimum_quantity INTEGER NOT NULL DEFAULT 1, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, usage_limit INTEGER NOT NULL DEFAULT 1, used_count INTEGER NOT NULL DEFAULT 0, product_id TEXT REFERENCES products(id), subscription_id TEXT REFERENCES subscriptions(id), active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE discount_uses(rule_id TEXT NOT NULL REFERENCES discount_rules(id), invoice_id TEXT NOT NULL REFERENCES invoices(id), PRIMARY KEY(rule_id,invoice_id));
CREATE TABLE quotation_templates(id TEXT PRIMARY KEY, name TEXT NOT NULL, plan_id TEXT NOT NULL REFERENCES subscription_plans(id), validity_days INTEGER NOT NULL DEFAULT 30, items TEXT NOT NULL);
CREATE TABLE mail_outbox(id TEXT PRIMARY KEY, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'QUEUED', created_at TEXT NOT NULL);
CREATE TABLE payment_allocations(payment_id TEXT PRIMARY KEY REFERENCES payments(id), invoice_amount REAL NOT NULL DEFAULT 0, credit_amount REAL NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX idx_payment_reference ON payments(transaction_reference) WHERE transaction_reference IS NOT NULL AND transaction_reference NOT LIKE 'credit_deduction_%';
CREATE INDEX idx_users_customer ON users(customer_id);
CREATE INDEX idx_subscriptions_due ON subscriptions(status,next_billing_date);
CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscription_items_sub ON subscription_items(subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_billing_cycle_number ON billing_cycles(subscription_id,cycle_number);
