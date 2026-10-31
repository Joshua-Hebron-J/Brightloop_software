# Brightloop demo

Run `npm run dev` from this directory. Open http://localhost:5173. An empty database migrates and seeds automatically. `npm run db:seed` safely adds missing demo fixtures.

## Fictional demo accounts

All seeded passwords: `Password123!`.

| Email | Access |
|---|---|
| admin@brightloop.io | Admin |
| billing@brightloop.io | Billing manager |
| sales@brightloop.io | Sales representative |
| viewer@brightloop.io | Internal read-only viewer |
| customer@brightloop.io | Customer linked to Acme |

Quick login buttons call the real authentication API. These public demo credentials must be replaced before deployment.

## Demonstration

1. Sign in as Admin and view live dashboard records.
2. Products: add a name, SKU, type, sales/cost price, notes and variants. Set an Odoo variant's extra price to 560.
3. Subscription Plans: choose the product, daily/monthly cadence, price, minimum quantity, availability dates and allowed lifecycle actions.
4. Customers: create a fictional company with contact/address details.
5. Quotations: create a template with plan/product, quantity, price and validity days. Select it and the customer, then create a quote.
6. Open the quote: submit for approval, approve, accept, then convert. Conversion is allowed once.
7. Invoices: Bulk Generate, select the subscription and today's target date. Alternatively use Settings > Recurring billing > Preview > Run. Preview writes nothing; repeating a due run does not duplicate invoices.
8. Confirm the Draft invoice. View PDF opens the printable invoice; use Print or Save as PDF.
9. Collect: record an externally received bank transfer with date, amount and reference. Record a partial payment, then the remainder with a different reference. No funds are transferred.
10. Verify Partial -> Paid, customer balance, dashboard and report receipt totals. Navigate away and back after changes to refresh views.
11. Subscriptions > View: pause/resume, apply a prorated plan change, add a variant or set its quantity to zero to remove it from future invoices.
12. Cancel at period end or close immediately when the plan permits it.
13. Sign out and sign in as Customer. Only Acme's records are accessible; other customers' direct API URLs are blocked.

## Additional checks

Settings provides admin-only staff, tax and discount rules. Discounts support fixed/percentage values, thresholds, dates, use limits and product/subscription scope. Rules apply automatically to recurring invoices; preview does not consume uses.

Create subscription draft, then advance Draft -> Quotation -> Confirmed -> Active from its detail screen. Payments supports customer credit and recording full refunds. Reports supports receipt-date filters and CSV export. List pages expose Previous/Next.

Forgot password queues a single-use recovery link. Without SMTP credentials, inspect Admin Settings > Email delivery queue, then open the link in a signed-out tab. Do not describe queued messages as delivered.

## Honest limits

External email requires configured SMTP/webhook credentials. Native PDF generation and live payment processing are absent; print-to-PDF and local bookkeeping work. The complete financial journey is automated through HTTP integration tests; browser checks cover selected screens and product creation, rather than every journey interaction. Performance measurements are local API timings.
