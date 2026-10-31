/**
 * Shared Type Definitions for Brightloop Platform
 * Coordinated for frontend integration (Lakshitha) and backend services.
 */

// ==========================================
// ENUMS & CONSTANTS
// ==========================================

export type UserRole = 'ADMIN' | 'BILLING_MANAGER' | 'SALES_REP' | 'VIEWER' | 'CUSTOMER';

export type ProductStatus = 'ACTIVE' | 'ARCHIVED';

export type BillingFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMI_ANNUALLY'
  | 'ANNUALLY';

export type PlanStatus = 'ACTIVE' | 'ARCHIVED';

export type CustomerType = 'INDIVIDUAL' | 'ORGANIZATION';

export type CustomerStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export type QuoteStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CONVERTED';

export type SubscriptionStatus =
  | 'DRAFT'
  | 'QUOTATION'
  | 'CONFIRMED'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CANCELLED'
  | 'EXPIRED';

export type BillingCycleStatus = 'PENDING' | 'GENERATED' | 'SKIPPED' | 'FAILED';

export type InvoiceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'VOID'
  | 'UNCOLLECTIBLE';

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export type TaxType = 'SALES_TAX' | 'VAT' | 'GST' | 'ZERO_RATED';

export type PaymentMethod =
  | 'CREDIT_CARD'
  | 'BANK_TRANSFER'
  | 'CASH'
  | 'UPI'
  | 'CHECK'
  | 'MOCK_GATEWAY';

export type PaymentStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED';

// ==========================================
// CORE ENTITIES
// ==========================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileResponse {
  user: Omit<User, 'passwordHash'>;
  token?: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  description?: string | null;
  attributes?: Record<string, any> | null;
  unitPrice: number;
  costPrice?: number | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  category?: string | null;
  status: ProductStatus;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  billingFrequency: BillingFrequency;
  price: number;
  currency: string;
  trialPeriodDays: number;
  setupFee: number;
  features?: string[] | null;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
}

export interface Customer {
  id: string;
  customerNumber: string;
  type: CustomerType;
  companyName?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  billingAddress: CustomerAddress;
  shippingAddress?: CustomerAddress | null;
  taxId?: string | null;
  currency: string;
  paymentTermsDays: number;
  creditBalance: number;
  outstandingBalance: number;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId?: string | null;
  variantId?: string | null;
  productName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRatePercent: number;
  lineTotal: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId: string;
  customer?: Customer;
  status: QuoteStatus;
  planId?: string | null;
  plan?: SubscriptionPlan;
  issueDate: string;
  validUntil: string;
  currency: string;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string | null;
  terms?: string | null;
  createdById: string;
  convertedSubscriptionId?: string | null;
  convertedInvoiceId?: string | null;
  items: QuoteItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionItem {
  id: string;
  subscriptionId: string;
  variantId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Subscription {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  customer?: Customer;
  planId: string;
  plan?: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  trialStart?: string | null;
  trialEnd?: string | null;
  pausedAt?: string | null;
  resumeAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  cancelAtPeriodEnd: boolean;
  renewalCount: number;
  currency: string;
  items?: SubscriptionItem[];
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingCycle {
  id: string;
  subscriptionId: string;
  cycleNumber: number;
  periodStart: string;
  periodEnd: string;
  billingDate: string;
  invoiceId?: string | null;
  status: BillingCycleStatus;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRatePercent: number;
  taxAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: Customer;
  subscriptionId?: string | null;
  billingCycleId?: string | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string | null;
  currency: string;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxType: TaxType;
  taxRatePercent: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string | null;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId?: string | null;
  customerId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionReference?: string | null;
  notes?: string | null;
  recordedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// ANALYTICS & DASHBOARD METRICS
// ==========================================

export interface DashboardMetrics {
  mrr: number;
  arr: number;
  activeSubscriptionsCount: number;
  trialingSubscriptionsCount: number;
  totalCustomersCount: number;
  totalOutstandingAr: number;
  arAging: {
    current: number;    // 0 - 30 days
    overdue30: number;  // 31 - 60 days
    overdue60: number;  // 61 - 90 days
    overdue90: number;  // 90+ days
  };
  revenueByMonth: {
    month: string;
    revenue: number;
  }[];
  subscriptionStatusDistribution: {
    status: SubscriptionStatus;
    count: number;
  }[];
  recentActivity: {
    id: string;
    type: 'PAYMENT' | 'SUBSCRIPTION' | 'INVOICE' | 'QUOTE';
    description: string;
    amount?: number;
    timestamp: string;
  }[];
}

// ==========================================
// API ENVELOPE & PAGINATION
// ==========================================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
