# Brightloop Backend API Documentation
**Version:** 1.0.0  
**Coordinated For:** Lakshitha (Frontend) & Integration Teams  
**Shared Type Definitions:** [`shared/types.ts`](../shared/types.ts)

---

## 🚀 Quick Start

### 1. Development Server
```bash
npm install
npm run db:migrate   # Applies SQL schema migrations
npm run db:seed      # Seeds demo users, plans, products, quotes, and customers
npm run dev          # Starts TypeScript server on http://localhost:4000
```

### 2. Run Tests & Validation
```bash
npm run typecheck    # Strict TypeScript check (0 errors)
npm test             # Full integration test suite (37/37 passing)
npm run build        # Production compile to dist/
npm start            # Run compiled production server
```

---

## 👥 Pre-seeded Test Accounts

All accounts share the default password: **`Password123!`**

| Email | Role | Permissions |
|---|---|---|
| `admin@brightloop.io` | **ADMIN** | Full system access, user management, plan & product lifecycle, payment overrides |
| `billing@brightloop.io` | **BILLING_MANAGER** | Invoicing, payments, billing cycles, refunds, plan/product creation |
| `sales@brightloop.io` | **SALES_REP** | Customer onboarding, quotes creation & conversion, subscription initiation |
| `viewer@brightloop.io` | **VIEWER** | Read-only access to catalog, analytics, invoices, and subscriptions |

---

## 📡 API Endpoints Overview

All protected routes expect the HTTP header:
`Authorization: Bearer <JWT_ACCESS_TOKEN>`

### 1. Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate with email & password. Returns JWT token, refresh token, and user profile.
- `POST /api/auth/register`: Create a new user account.
- `POST /api/auth/refresh`: Rotate refresh token and get a new access token.
- `GET /api/auth/me`: Retrieve current authenticated user profile.
- `POST /api/auth/change-password`: Update account password.
- `GET /api/auth/users`: List all platform users *(Admin only)*.

### 2. Products & Variants (`/api/products`)
- `GET /api/products`: List products with pagination, search, status, and category filters.
- `GET /api/products/:id`: Get product details and associated variants.
- `POST /api/products`: Create a product with optional nested variants *(Admin, Billing Manager)*.
- `PUT /api/products/:id`: Update product attributes.
- `DELETE /api/products/:id`: Delete product *(Admin)*.
- `POST /api/products/:id/variants`: Add a new variant (SKU, attributes JSON, unit price).
- `PUT /api/products/variants/:variantId`: Update variant.
- `DELETE /api/products/variants/:variantId`: Delete variant.

### 3. Subscription Plans (`/api/plans`)
- `GET /api/plans/frequencies`: Metadata of supported frequencies (`WEEKLY`, `MONTHLY`, `QUARTERLY`, `SEMI_ANNUALLY`, `ANNUALLY`).
- `GET /api/plans`: List active or archived subscription plans.
- `GET /api/plans/:id`: Retrieve single plan.
- `POST /api/plans`: Create subscription plan with price, setup fee, trial days, and features *(Admin, Billing Manager)*.
- `PUT /api/plans/:id`: Update plan.
- `DELETE /api/plans/:id`: Delete plan (prevented if active subscriptions exist).

### 4. Customers (`/api/customers`)
- `GET /api/customers`: Paginated customer search with outstanding balance calculation.
- `GET /api/customers/:id`: Customer details including active subscriptions and recent invoices.
- `POST /api/customers`: Create customer (`INDIVIDUAL` or `ORGANIZATION`) with billing and shipping address.
- `PUT /api/customers/:id`: Update customer details.
- `POST /api/customers/:id/adjust-credit`: Add or deduct customer store credit balance.
- `DELETE /api/customers/:id`: Delete customer *(Admin)*.

### 5. Quotations & Conversion (`/api/quotes`)
- `GET /api/quotes`: List quotes with customer, line items, and status.
- `GET /api/quotes/:id`: Get quote details.
- `POST /api/quotes`: Create quote with percentage/fixed discount, line item tax rates, and terms.
- `PATCH /api/quotes/:id/status`: Update status (`DRAFT` ➔ `PENDING_APPROVAL` ➔ `APPROVED` ➔ `ACCEPTED` / `REJECTED`).
- `POST /api/quotes/:id/convert`: **One-click conversion** of an approved quote into an active subscription and initial invoice.

### 6. Subscription Lifecycle (`/api/subscriptions`)
- `GET /api/subscriptions`: List subscriptions with plan, status, and renewal dates.
- `GET /api/subscriptions/:id`: Get subscription with itemized breakdown and billing cycles history.
- `POST /api/subscriptions`: Create subscription (handles trial periods and billing frequency calculation).
- `POST /api/subscriptions/:id/pause`: Temporarily pause active subscription.
- `POST /api/subscriptions/:id/resume`: Resume paused subscription (automatically extends period end by the pause duration).
- `POST /api/subscriptions/:id/cancel`: Cancel immediately or mark `cancelAtPeriodEnd: true`.
- `POST /api/subscriptions/:id/change-plan`: Upgrade/downgrade subscription with real-time proration calculation and automatic invoice generation.

### 7. Billing Engine & Duplicate Prevention (`/api/billing`)
- `GET /api/billing/cycles`: List billing cycles and cycle statuses.
- `GET /api/billing/cycles/:id`: Get cycle details.
- `POST /api/billing/run-cycles`: Run automated batch billing cycle engine across all due subscriptions. Supports `dryRun: true` for previewing charges without committing.
- `POST /api/billing/subscriptions/:subscriptionId/generate-cycle`: Generate next cycle for a specific subscription. Guaranteed idempotent using `idempotencyKey` and database constraints.

### 8. Invoices, Taxes & Discounts (`/api/invoices`)
- `GET /api/invoices`: List invoices by customer, subscription, status, or date.
- `GET /api/invoices/:id`: Get invoice with line items, tax breakdowns, discount calculations, and payment history.
- `GET /api/invoices/:id/html`: Render printable, client-ready HTML invoice with status badges and branding.
- `POST /api/invoices`: Create manual ad-hoc invoice with custom line items, tax types (`SALES_TAX`, `VAT`, `GST`, `ZERO_RATED`), and discounts.
- `PATCH /api/invoices/:id/status`: Void or mark invoice uncollectible.

### 9. Payment Recording & Reconciliations (`/api/payments`)
- `GET /api/payments`: List recorded payments and transaction references.
- `GET /api/payments/:id`: Get payment details.
- `POST /api/payments`: Record payment.
  - Full payment: marks invoice as `PAID`.
  - Partial payment: marks invoice as `PARTIALLY_PAID` and reduces `balanceDue`.
  - Overpayment: clears invoice balance and credits remaining amount to `customer.creditBalance`.
- `POST /api/payments/apply-credit`: Use available customer store credit to pay down an open invoice.
- `POST /api/payments/:id/refund`: Refund a payment and reverse applied invoice balances.

### 10. Dashboard Analytics (`/api/analytics`)
- `GET /api/analytics/dashboard`:
  - `mrr`: Normalized Monthly Recurring Revenue
  - `arr`: Annual Recurring Revenue (`mrr * 12`)
  - `activeSubscriptionsCount`: Active subscriber volume
  - `totalCustomersCount`: Customer base count
  - `totalOutstandingAr`: Total Accounts Receivable
  - `arAging`: Aging buckets (0–30 days, 31–60 days, 61–90 days, 90+ days)
  - `revenueByMonth`: Historical collections trend
  - `subscriptionStatusDistribution`: Breakdown by status
  - `recentActivity`: Unified real-time event feed
