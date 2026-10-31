# Integrated API

All routes return `{success,data}` or `{success:false,error:{code,message,details}}`. Business endpoints require `Authorization: Bearer <token>`. List results contain `items,total,page,limit,totalPages`; page size is at most 100. See backend source schemas for exact optional fields.

## Authentication

- POST /api/auth/register: email, password, firstName, lastName. Always customer access.
- POST /api/auth/login: email, password. Returns user, token, refreshToken.
- POST /api/auth/refresh: refreshToken; rotates the token.
- GET /api/auth/me: current authenticated user, including linked customerId.
- POST /api/auth/logout: revokes this user's sessions.
- POST /api/auth/change-password: currentPassword, newPassword.
- POST /api/auth/forgot-password: email. Queues recovery; never returns a token to the requester.
- POST /api/auth/reset-password: token, password. Single use, 30-minute expiry.
- POST /api/auth/staff: Admin only; names/email/password/role (BILLING_MANAGER, SALES_REP or VIEWER).
- GET /api/auth/users: Admin only.

## Existing modules

GET/POST /api/products, /api/plans, /api/customers, /api/quotes, /api/subscriptions, /api/invoices, /api/payments. Detail GET /:id. Catalog/customer updates use PUT /:id. Server role checks restrict all writes independently of the UI. Customer lists and direct IDs are scoped to the signed-in customer; customer-supplied customerId filters cannot override ownership.

Products include productType/salesPrice/costPrice and variants; variant prices have unitPrice and priceExtra. Plans support DAILY, WEEKLY, MONTHLY, QUARTERLY, SEMI_ANNUALLY and ANNUALLY; productId, minimumQuantity, availableFrom/Until, allowPause/Close/Renew and autoClose.

## Workflows

- PATCH /api/quotes/:id/status: DRAFT -> PENDING_APPROVAL -> APPROVED -> ACCEPTED; rejection supported before conversion.
- POST /api/quotes/:id/convert: once, accepted and unexpired only. Returns subscription identifiers; billing creates the invoice.
- POST /api/official/subscriptions/:id/transition: QUOTATION, CONFIRMED or ACTIVE, sequentially from Draft.
- POST /api/subscriptions/:id/pause, /resume, /cancel, /change-plan.
- POST /api/subscriptions/:id/addons: variantId, quantity. Zero removes an add-on; unitPrice plus priceExtra is persisted. Authorized customers may manage their own add-ons.
- POST /api/billing/run-cycles: targetDate (ISO), optional subscriptionIds and dryRun. Returns generated/skipped/cancelled counts and per-subscription results.
- POST /api/billing/subscriptions/:id/generate-cycle: generate a due cycle; date inputs validated.
- PATCH /api/invoices/:id/status: OPEN confirms, VOID cancels. Paid invoices are settled through payment recording, not arbitrary status changes.
- GET /api/invoices/:id/html: authenticated printable HTML, with escaped text and customer ownership enforcement.
- POST /api/official/invoices/:id/send: queues or sends to the invoice customer's registered email.
- POST /api/payments: customerId, invoiceId, amount, paymentMethod, paymentDate, transactionReference, notes. Repeated identical references are idempotent; mismatched reuse conflicts.
- POST /api/payments/apply-credit: invoiceId, amount.
- POST /api/payments/:id/refund: reason. Full local refund bookkeeping; no external funds transfer.

## Official setup and reports

- GET /api/official/rules; POST /api/official/taxes or /discounts; DELETE /api/official/rules/tax/:id or /discount/:id disables a rule. Writes require Admin.
- Taxes: name, rate, optional product_id.
- Discounts: name, kind (FIXED/PERCENTAGE), value, minimum_purchase, minimum_quantity, starts_at, ends_at, usage_limit, optional product_id/subscription_id. Active rules apply automatically and usage is consumed only in the committed invoice transaction.
- GET/POST /api/official/templates: name, planId, validityDays, items.
- POST /api/official/templates/:id/quote: customerId.
- GET /api/official/mail: Admin-only local delivery queue, including demo recovery links.
- GET /api/official/dashboard?from=ISO&to=ISO: current subscription/receivable metrics; date-filtered cash receipts, history, methods, distribution and aging.

SMTP or webhook credentials enable external email. Without them, delivered=false and the queue retains the message. No real gateway processing is implemented.
