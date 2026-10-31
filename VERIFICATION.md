# Verification record

Executed locally on 31 October 2026 using Node 24.16.0.

- Original unmodified backend: 37/37 shipped tests passed using an isolated in-memory database.
- Integrated backend: 50/50 automated tests passed; 0 failures or skipped tests.
- Backend and frontend TypeScript checks: passed.
- ESLint checks for unreachable code, duplicate keys/cases/arguments, unsafe finally, constant conditions, conditional assignments and typeof validity: passed.
- Backend production build and Vite production build: passed. Vite reports a non-blocking chart chunk size warning (about 547 KB uncompressed, 155 KB gzip).
- Empty development database: all four migrations applied, seed initialized, backend health endpoint started.
- Browser: real admin login, responsive navigation, product form submission and persisted product listing verified. Other screen checks are recorded as performed; the complete financial journey is covered at HTTP level, not claimed as a full browser E2E run.

## Automated acceptance coverage

Official password rules, case-insensitive duplicate email, public privilege escalation prevention, admin-only setup/staff, customer filter/direct-ID isolation, quotation template/approval/acceptance/conversion, daily billing, invoice draft/confirmation/settlement, partial payments, overpayment credits, refunds, duplicate references, discount thresholds/use limits, tax calculation, dry-run non-consumption, lifecycle transitions/policies, monthly/leap-year dates, add-on 560 surcharge and removal, missed-cycle catch-up, automatic closure, password reset, refresh rotation and logout revocation.

## Local API performance with 5,000 subscriptions

| Endpoint | Latest measured response |
|---|---:|
| subscriptions page 100 | 32.4 ms |
| dashboard summary | 54.9 ms |
| products | 12.4 ms |
| plans | 16.9 ms |
| customers | 10.4 ms |
| quotes | 6.8 ms |
| invoices | 8.4 ms |
| payments | 5.7 ms |

All were below the official two-second target in this local HTTP test. This does not certify production browser performance or distributed concurrency.

## Unverified external services

No live SMTP credentials or payment gateway credentials were supplied. Email queue/reset-token behavior is tested; delivery to an external inbox is not. Payment/refund operations record local bookkeeping and never transfer funds. GitHub publishing is contingent on the requested repository being accessible and a working push credential path.
