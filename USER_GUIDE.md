# Brightloop Software user guide

## Admin

Sign in using a development account from README.md. Products -> Add Product: set name, type, sales/cost, currency and notes. Add a variant with base unit price and560 additional price to demonstrate the official surcharge. Archive catalog records instead of removing financial history.

Subscription Plans -> Add Plan: choose matching product/currency, price, interval, minimum quantity, availability dates and individual pause/close/renew/automatic-close policies. Customers -> Add Customer: enter company/contact/email, billing street/city/state/PIN, currency, GSTIN and payment terms. INR GST requires an Indian billing state.

Settings configures supplier, tax and discount rules and creates internal staff. Product tax rules override global rules. Discounts support fixed/percentage values, thresholds, dates, use limits and product/subscription scopes. Billing previews do not consume uses.

## Quote to cash

Quotations -> New template saves reusable plan/product/quantity/price and validity days. Select template/customer -> Create quote from template, or Create Quotation manually. Match currencies, enter quantities/prices/discounts and wait for server tax preview. Draft quotes can be edited with the same number.

Open quote -> submit -> approve -> mark accepted -> convert once. A real subscription is created. Separate drafts follow Draft -> Quotation -> Confirmed -> Active. Plan policies govern pause/resume, renewal and cancellation. Inspect subscription dates and invoice history.

Bulk Invoicing generates due draft invoices. Settings provides a dry run. Repeat runs skip existing cycles. Invoices -> View PDF shows taxable value, discounts, GST, paid and balance. Confirm before Collect. Record a partial external payment, inspect the balance, then record the remainder to reach Paid. Payments supports refund-reason and credit-amount forms; these record ledger changes only. No funds move.

Send queues email without provider configuration; it does not promise inbox delivery. Print / Save PDF uses the browser print dialog. Invoice cancellation retains the record.

## Staff and customers

Staff operate only authorized workflows and cannot create staff or admin discount rules. Customers register with unique email and a password longer than8 characters containing uppercase/lowercase/special characters. Their portal restricts lists and direct record IDs to their own account. Lifecycle actions depend on plan permissions.

## Review

Customer360 retrieves related payments/invoices/subscriptions. Dashboard and Analytics separate currencies, collected receipts, recurring taxable value and receivables. INR reports preserve historical USD records separately. List search is currently page-local. Always reload after saving to verify persistence. See FINAL_QA_REPORT.md for actual coverage and unverified areas.
