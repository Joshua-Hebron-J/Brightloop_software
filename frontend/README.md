# Brightloop Software — Subscription Management Platform

Unified Platform for Subscription Plans, Recurring Billing, and Revenue Management.

Built for the complete business lifecycle:
**Products → Plans → Customers → Quotations → Subscriptions → Invoices → Payments → Revenue Analytics**

---

## ⚡ Quick Start

```powershell
# In PowerShell:
$env:PATH = "$PWD\.tools\node-v20.18.0-win-x64;$env:PATH"

# Run development server
npm run dev

# Or build for production
npm run build
npm run preview
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Personas & Role-Based Access Control (RBAC)

1. **Admin**
   - Complete executive telemetry (Total Revenue, MRR, ARR, Active Subscriptions, Overdue Invoices)
   - Monthly Revenue, MRR expansion, and subscription growth charts
   - Full management across Products, Plans, Customers, Quotations, Subscriptions, Invoices, Payments
   - Deep Revenue Analytics with ASC 606 Revenue Recognition schedule

2. **Staff (Sales & Billing Operations Desk)**
   - Daily operational statistics
   - CPQ Quotation management with 1-click **Convert to Subscription**
   - Customer accounts and profile editing
   - Invoice issuance and **Bulk Recurring Invoice Generation**
   - Multi-channel payment recording (Card, UPI, Bank Transfer, Cash)

3. **Customer (Self-Service Portal)**
   - View primary plan, billing cadence, next renewal date, and outstanding balance
   - Review incoming quotation proposals with instant **Accept & Subscribe**
   - View itemized tax invoices with built-in **Print / Save PDF**
   - Instant invoice payment action

*Note: For testing and evaluation, a **1-Click Role Switcher** is embedded in the top header and on the login page.*

---

## 🔌 Backend API Integration

The frontend is strictly integrated with the agreed REST API contract:

- `GET /api/products` & `POST /api/products`
- `GET /api/plans` & `POST /api/plans`
- `GET /api/customers` & `POST /api/customers`
- `GET /api/quotations` & `POST /api/quotations`
- `GET /api/subscriptions` & `POST /api/subscriptions`
- `PATCH /api/subscriptions/:id` (Activate, Pause, Resume, Close)
- `GET /api/invoices` & `POST /api/invoices`
- `GET /api/payments` & `POST /api/payments`
- `GET /api/dashboard` (Telemetry & SaaS metrics)

### Real-Time Live / Demo Resilience:
When Joshua's backend is running on `http://localhost:5000`, the frontend automatically streams live backend data. If the backend is offline, the frontend seamlessly operates in fallback mode with local storage persistence, ensuring zero broken pages or frozen UI states.
