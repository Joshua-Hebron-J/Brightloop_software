# Brightloop Software

Subscription Management System: a real React/Vite/TypeScript/Tailwind frontend, Express/TypeScript API, JWT authentication and persistent SQLite database.

The seven official scenarios are mapped in REQUIREMENTS.md: customer signup/roles; products/variants/plans; quotation templates and conversion; recurring billing; automatic discounts; invoice payments; financial reporting. Existing functionality and original Git history are preserved.

## Run

Requires Node22.13+ and npm. Clone the official repository, then from its root:

```powershell
npm ci
npm run setup
Copy-Item backend/.env.example backend/.env
# Configure a long random JWT_SECRET in backend/.env.
npm --prefix backend run db:migrate
npm run db:seed
npm run dev
```

Frontend http://localhost:5173; API health http://localhost:4000/api/health. For the built app:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

Open http://localhost:4000. Default persistent DB: backend/brightloop-demo.sqlite. Tests use an in-memory DB. Seeding adds missing fixtures without wiping user records. Environment variables include PORT, DATABASE_PATH, JWT_SECRET, CORS_ORIGIN and APP_URL. Optional SMTP settings or mail webhook configure delivery. Without credentials messages stay queued, not delivered. Never commit .env or SQLite files.

## Demo accounts

Development-only: admin@brightloop.io, billing@brightloop.io, sales@brightloop.io, viewer@brightloop.io and customer@brightloop.io use Password123!. Existing India-demo accounts at billsync.test remain compatible; saved account emails are not renamed. Public registration creates customers; only admin creates staff.

## Workflow

Create a product/variant, matching-currency plan and customer. Create a quotation or reuse a template. Submit, approve, accept and convert once. Generate recurring draft invoices, inspect taxes/discounts, confirm, record a partial payment and the remainder. Review customer history and analytics. See USER_GUIDE.md and DEMO_SCRIPT.md.

## Billing and limits

INR defaults, en-IN formatting, DD/MM/YYYY dates, integer-paise pricing and configured GST are retained. Historical USD records stay USD. Ordinary same-state tax splits CGST/SGST; interstate uses IGST. Invoice snapshots retain historical supplier/tax values. UTGST special cases, filing, e-invoice certification, SEZ/export/reverse-charge/cess are unsupported; DEMO identifiers are fictional.

Payments/refunds are bookkeeping, not live charging. Controlled overpayments become customer credit; allocated invoice amounts never exceed its balance. Email delivery and OS PDF-save dialogs require separate verification. List filters search the displayed100-record page; some auxiliary summaries are page-limited. No historical MRR snapshots or revenue-recognition accounting. Local API performance was measured with5000 subscriptions; deployed browser performance is not certified. Dependency audit and remaining browser checks are documented in PROGRESS_HANDOFF.md.

Official remote: https://github.com/Joshua-Hebron-J/Subscription-Management-System-odooxkochi.git, branch main. **No push without Joshua's explicit final approval.** This is a hackathon prototype, not production certification.
