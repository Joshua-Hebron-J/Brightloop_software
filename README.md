# Brightloop - B2B Subscription & Recurring Billing Management Engine

Brightloop is a production-grade B2B recurring billing, subscription lifecycle, and revenue orchestration backend.

## Architecture & Technology Stack
- **Runtime:** Node.js v24 (LTS)
- **Language:** TypeScript 5.7+ (Strict Mode)
- **Framework:** Express with modular domain controllers and services
- **Database Engine:** Embedded SQLite (`node:sqlite` in WAL mode with foreign keys enabled)
- **Validation:** Zod v3 schemas for requests, queries, and parameters
- **Security:** Bcrypt password hashing, JWT authorization, Role-Based Access Control (RBAC)
- **Testing:** Native `node:test` test runner with `supertest` integration tests

## Key Implemented Systems
1. **Database Schema & Migrations**: Versioned DDL migration runner with automatic seeding.
2. **Authentication & RBAC**: JWT access tokens, rotating refresh tokens, and granular permission enforcement (`ADMIN`, `BILLING_MANAGER`, `SALES_REP`, `VIEWER`).
3. **Products & Variants**: Hierarchical catalog management, SKUs, and extensible attribute support.
4. **Subscription Plans & Frequencies**: Flexible cadences (`WEEKLY`, `MONTHLY`, `QUARTERLY`, `SEMI_ANNUALLY`, `ANNUALLY`), trial periods, and setup fees.
5. **Customer Management**: Individual and organizational accounts, structured addresses, tax numbers, and real-time ledger & credit balance tracking.
6. **Quotations & Conversion**: Quote drafting, pricing, discounts, and one-click atomic conversion into subscriptions and initial invoices.
7. **Subscription Lifecycle Management**: Full state machine (`DRAFT`, `TRIALING`, `ACTIVE`, `PAUSED`, `CANCELLED`, `EXPIRED`), pause/resume with time extension, cancellation rules, and plan change proration calculations.
8. **Billing-Cycle Engine with Duplicate Prevention**: Idempotency key tracking preventing duplicate cycles or double billing under any concurrent conditions.
9. **Invoicing, Taxes & Discounts**: Itemized invoicing, configurable taxes (`VAT`, `GST`, `SALES_TAX`), discounts, and printable HTML templates.
10. **Payment Recording & Reconciliations**: Partial payments, overpayments with automated store credit balance top-up, credit deductions, and refund reversals.
11. **Dashboard Analytics**: Real-time MRR, ARR, AR aging breakdown, revenue trends, and activity logging.

## Shared Contracts
Frontend contracts are coordinated in [`shared/types.ts`](./shared/types.ts). Detailed API specs are available in [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md).
