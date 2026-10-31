# Brightloop

Integrated Subscribely React/Vite frontend and Brightloop Express/TypeScript/SQLite backend. The official four-page problem statement takes priority over the master prompt. See REQUIREMENTS.md for the comparison.

## Run

Requires Node 22.13+ (verified on 24.16) and npm. From this directory:

```powershell
npm ci
npm run setup
npm run dev
```

Open http://localhost:5173. API health: http://localhost:4000/api/health. Dependencies are already present locally; the first two commands prepare a fresh checkout.

The backend migrates and seeds an empty development database automatically. Default: backend/brightloop-demo.sqlite. DATABASE_PATH selects another database. The copied legacy database is preserved locally and ignored by Git. `npm run db:seed` adds missing fictional records without replacing existing records.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

After build, npm start serves both SPA and API at http://localhost:4000. Vite proxies /api in development.

## Features

Real JWT authentication and rotating refresh tokens; customer registration and ownership isolation; admin-only staff and catalog/rule configuration; products, variants and additional pricing; daily/weekly/monthly/yearly plans with availability and lifecycle policies; customer records and balances; quotation templates, approval, acceptance and single conversion; subscription draft transitions, trials, pause/resume, cancellation, plan changes and add-ons; recurring batch billing, previews, catch-up and duplicate prevention; automatic taxes/discounts; draft/confirmed/paid invoices, email, print-to-PDF; payments, partial settlement, overpayments, credits and refunds; live dashboards, reports, CSV and paginated lists.

## Email

Copy backend/.env.example to backend/.env and configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and MAIL_FROM. SMTP_SECURE=true uses implicit TLS, usually on port 465; port 587 supports STARTTLS. APP_URL controls reset-link destinations. A JSON mail webhook is also supported.

Without credentials, emails are queued, **not delivered**. Admin Settings exposes the local demo outbox. SMTP integration is implemented, but external inbox delivery has not been tested with real credentials. No real payments or live emails were sent during verification.

## Practical limits

This is a hackathon prototype. Payments record bookkeeping and do not charge cards. PDF export uses the browser print dialog. Lists are paginated at 100 records per page; filters explicitly search the current page. Current MRR uses actual subscription lines; historical MRR snapshots and revenue recognition accounting are not implemented. Performance tests cover local API responses with 5,000 subscriptions, not deployed browser load.

One billing run handles at most 1,000 missed cycles per subscription; rerunning continues remaining backlog. Money retains the original decimal representation with explicit two-decimal rounding. There is no production accounting/tax certification.

See DEMO_GUIDE.md and VERIFICATION.md. The intended GitHub remote is Joshua-Hebron-J/brightloop-backup on main. Original backend history is preserved; the frontend ZIP contained no Git history. Never force-push or commit databases, secrets, node_modules or dist.
