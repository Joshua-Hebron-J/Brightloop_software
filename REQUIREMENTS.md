# Official requirement comparison

All four PDF pages were read before application changes and visually inspected. The PDF supplies narrative acceptance criteria and an explicit under-two-second responsiveness constraint; it contains no separate scoring weights. Attachment instructions do not override the user's request.

| Official requirement | Original gap | Implementation/evidence |
|---|---|---|
| Unified product-to-cash system | Frontend mock fallback and fake auth | Existing projects integrated with authenticated API client |
| Unique email; password >8, upper/lower/special | min8 and arbitrary public roles | Normalized unique emails, official validation and tests |
| Email password reset | Simulated frontend send | Hashed expiring single-use tokens, SMTP/webhook and demo queue; real delivery needs credentials |
| Admin/staff/customer; admin creates staff | No customer ownership model | Customer links, direct-ID/filter ownership guard and admin-only staff |
| Product type, sales/cost, notes, variants, extra560 | Missing base fields and surcharge | Additive schema, UI and tested add-on surcharge |
| Daily/weekly/monthly/yearly plans | Daily absent | Daily added; existing quarterly/semiannual retained |
| Minimum quantities, availability, lifecycle policies | Missing | Policy fields, enrollment checks and controls |
| Templates with validity days and product lines | Missing | Reusable templates and validated approval/acceptance/conversion |
| Number, customer, plan, start/expiry, terms, lines/taxes | Partial backend, disconnected UI | Numbered subscriptions, expiry, customer payment terms and recurring line pricing |
| Draft -> Quotation -> Confirmed -> Active -> Closed | Auto-active model | Sequential draft workflow; accepted quote can activate once |
| Automatic batch invoices; nothing duplicated/skipped | Taxes/discounts ignored; one overdue cycle/run | Atomic pricing, rule uses, catch-up, preview and unique cycles |
| Draft -> Confirmed -> Paid; cancel/send/print | Auto-open invoices/local statuses | Draft creation, confirmation gate, real settlement, cancel/email/print |
| Admin fixed/% discounts, thresholds/dates/limits/scopes | Ad hoc discounts only | Persistent automatic rules, product/subscription scope, atomic uses |
| Method/amount/date/note against invoice | Frontend fallback; refund allocation flaw | Real forms, customer/currency checks, references and allocation-aware refunds |
| Paid/outstanding/overdue reports and filters | Static analytics | Live metrics, aging, receipt filters, summary and CSV |
| Thousands of subscriptions, under2s | No measured evidence | UI/API pagination; local HTTP timing tests with 5,000 subscriptions; production browser load not certified |

## Priority decisions

The PDF required customer accounts, daily billing, templates, plan policies and automatic rule discounts before optional polish. Only Admin configures products/plans/taxes/discounts and creates staff. Explicit draft/confirmation workflows take priority over shipped auto-active/auto-open behavior. Public registration cannot elevate privileges.

Secondary enhancements retained include internal role granularity, rotating refresh tokens, trials, other cadences, proration, credits/refunds, CSV and print-to-PDF. Historical MRR snapshots, accounting revenue recognition, live payment gateways and native PDF generation are not claimed.
