export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  companyName?: string;
  customerId?: string; // If customer role, linked customer ID
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  description?: string;
}

export interface Product {
  currency?:string;
  gst?:any;
  id: string;
  name: string;
  description: string;
  code: string; // SKU
  price: number;
  status: 'Active' | 'Inactive' | 'Archived';
  category?: string;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt?: string;
}

export type BillingFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Plan {
  currency?:string;
  gst?:any;
  id: string;
  name: string;
  description: string;
  productId: string;
  productName?: string;
  billingFrequency: BillingFrequency;
  price: number;
  minimumQuantity: number;
  availabilityStartDate: string;
  availabilityEndDate?: string;
  pauseSettings: {
    allowPause: boolean;
    maxPauseDays: number;
  };
  renewalSettings: {
    autoRenew: boolean;
    gracePeriodDays: number;
  };
  status: 'Active' | 'Inactive';
  features?: string[];
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  billingAddress?:any;
  shippingAddress?:any;
  paymentTermsDays?:number;
  outstandingBalance?:number;
  creditBalance?:number;
  address: string;
  taxId: string;
  currency: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  createdAt: string;
  totalSpent?: number;
  activeSubscriptionsCount?: number;
}

export type QuotationStatus = 'Approved' | 'Converted' | 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Expired';

export interface QuotationItem {
  id: string;
  productId: string;
  productName: string;
  planId: string;
  planName: string;
  quantity: number;
  unitPrice: number;
  discount: number; // percentage or flat amount
  taxRate: number; // e.g. 18%
  subtotal: number;
}

export interface Quotation {
  currency?:string;
  gst?:any;
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: QuotationItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  validityDate: string;
  status: QuotationStatus;
  notes?: string;
  createdAt: string;
  convertedSubscriptionId?: string;
}

export type SubscriptionStatus = 'Draft' | 'Quotation' | 'Confirmed' | 'Active' | 'Closed' | 'Trial' | 'Paused';

export interface Subscription {
  currency?:string;
  gst?:any;
  id: string;
  subscriptionNumber: string;
  customerId: string;
  customerName: string;
  planId: string;
  planName: string;
  productId: string;
  productName: string;
  quantity: number;
  billingFrequency: BillingFrequency;
  startDate: string;
  nextBillingDate: string;
  endDate?: string;
  amount: number;
  status: SubscriptionStatus;
  autoRenew: boolean;
  pausedAt?: string;
  pauseReason?: string;
  closedAt?: string;
  closeReason?: string;
  createdAt: string;
}

export type InvoiceStatus = 'Partial' | 'Cancelled' | 'Uncollectible' | 'Draft' | 'Confirmed' | 'Paid';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  amount: number;
}

export interface Invoice {
  currency?:string;
  gst?:any;
  id: string;
  invoiceNumber: string;
  subscriptionId?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  customerTaxId?: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceLineItem[];
  subtotal: number;
  taxBreakdown: {
    name: string;
    rate: number;
    amount: number;
  }[];
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  status: InvoiceStatus;
  paidAmount: number;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
}

export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'UPI';

export interface Payment {
  currency?:string;
  gst?:any;
  id: string;
  paymentNumber: string;
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  status: 'Completed' | 'Pending' | 'Failed';
  notes?: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  totalCustomers: number;
  outstandingPayments: number;
  overdueInvoices: number;
  paidAmount: number;
  unpaidAmount: number;
  overdueAmount: number;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  mrr: number;
  netNewMrr: number;
}

export interface SubscriptionTrendPoint {
  month: string;
  active: number;
  newCount: number;
  churned: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  revenueHistory: RevenuePoint[];
  subscriptionGrowth: SubscriptionTrendPoint[];
  paymentOverview: {
    method: string;
    amount: number;
    count: number;
  }[];
  recentTransactions: Payment[];
  recentSubscriptions: Subscription[];
  upcomingRenewals: Subscription[];
  outstandingInvoices: Invoice[];
}

// Universal API Response matching backend contract
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
