import {formatMoney,formatDate} from '../../utils/format';
import React, { useEffect, useState } from 'react';
import {
  Repeat,
  Calendar,
  CreditCard,
  Receipt,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { subscriptionsApi, invoicesApi, paymentsApi, quotationsApi } from '../../services/api';
import { Subscription, Invoice, Payment, Quotation } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { NavItemKey } from '../../components/layout/Sidebar';
import { InvoicePrintModal } from '../../components/invoice/InvoicePrintModal';

interface CustomerDashboardProps {
  onNavigate: (nav: NavItemKey) => void;
  onPayInvoice?: (invoice: Invoice) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  onNavigate,
  onPayInvoice,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);

  const customerId = user?.customerId || 'cust-1';

  useEffect(() => {
    async function loadCustomerData() {
      setIsLoading(true);
      try {
        const [subRes, invRes, payRes, quoteRes] = await Promise.all([
          subscriptionsApi.getAll(),
          invoicesApi.getAll(),
          paymentsApi.getAll(),
          quotationsApi.getAll(),
        ]);

        // Filter for this customer (e.g. Acme Corp)
        setSubscriptions(subRes.data.filter((s) => s.customerId === customerId));
        setInvoices(invRes.data.filter((i) => i.customerId === customerId));
        setPayments(payRes.data.filter((p) => p.customerId === customerId));
        setQuotations(quoteRes.data.filter((q) => q.customerId === customerId));
      } finally {
        setIsLoading(false);
      }
    }
    loadCustomerData();
  }, [customerId]);

  const activeSub = subscriptions.find((s) => s.status === 'Active') || subscriptions[0];
  const unpaidInvoices = invoices.filter((i) => i.status !== 'Paid');
  const outstandingBalance = unpaidInvoices.reduce(
    (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
    0
  );

  const handleAcceptQuote = async (quote: Quotation) => {
    try {
      await quotationsApi.updateStatus(quote.id, 'Accepted');
      showToast('success', 'Quotation Accepted', 'Thank you! Our operations team has been notified.');
      setQuotations((prev) =>
        prev.map((q) => (q.id === quote.id ? { ...q, status: 'Accepted' } : q))
      );
    } catch {
      showToast('error', 'Error', 'Failed to accept quote.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Customer Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider border border-emerald-500/30">
              Verified Subscriber
            </span>
            <span className="text-xs text-slate-400">{user?.companyName || 'Acme Corp'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1.5">
            Welcome back, {user?.name || 'Sarah Connor'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Manage your Brightloop cloud subscription, view itemized tax invoices, and review new proposal quotations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {outstandingBalance > 0 ? (
            <button
              onClick={() => onNavigate('invoices')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/30 transition-colors flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Outstanding ({formatMoney(outstandingBalance,'INR')})</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>All Invoices Settled</span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Primary Customer Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Plan */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Primary Plan</span>
            <Repeat className="w-4 h-4 text-blue-600" />
          </div>
          <p className="mt-3 text-lg font-bold text-slate-900 truncate">
            {activeSub ? activeSub.planName : 'No Active Plan'}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {activeSub ? `$${activeSub.amount}/mo (${activeSub.quantity} seats)` : '—'}
            </span>
            {activeSub && <StatusBadge status={activeSub.status} size="sm" />}
          </div>
        </div>

        {/* Billing Frequency */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Billing Frequency</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-3 text-lg font-bold text-slate-900 capitalize">
            {activeSub ? activeSub.billingFrequency : 'Monthly'}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Auto-renew: <span className="font-semibold text-slate-700">{activeSub?.autoRenew ? 'Enabled' : 'Disabled'}</span>
          </p>
        </div>

        {/* Next Billing Date */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Next Billing Cycle</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-lg font-bold text-slate-900">
            {activeSub ? activeSub.nextBillingDate : '—'}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Estimated renewal: <span className="font-semibold text-slate-700">${activeSub?.amount.toFixed(2) || '0.00'}</span>
          </p>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Outstanding Balance</span>
            <AlertCircle className={`w-4 h-4 ${outstandingBalance > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
          </div>
          <p className={`mt-3 text-2xl font-bold ${outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatMoney(outstandingBalance,'INR')}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {unpaidInvoices.length} unpaid bill{unpaidInvoices.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* Pending Quotations awaiting acceptance (if any) */}
      {quotations.filter((q) => q.status === 'Sent').length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-blue-700" />
            <h3 className="text-sm font-bold text-blue-900">New Proposal Quotation Received</h3>
          </div>
          <div className="space-y-3">
            {quotations
              .filter((q) => q.status === 'Sent')
              .map((quote) => (
                <div
                  key={quote.id}
                  className="bg-white p-4 rounded-lg border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{quote.quotationNumber}</span>
                      <StatusBadge status={quote.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {quote.items.map((it) => `${it.productName} (${it.planName}) x${it.quantity}`).join(', ')}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Valid until {quote.validityDate}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-slate-900">{formatMoney(quote.total,'INR')}</span>
                    <button
                      onClick={() => handleAcceptQuote(quote)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Accept & Subscribe</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* My Subscriptions List */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">My Active Subscriptions</h3>
            <p className="text-xs text-slate-500">Live service licenses provisioned for your organization</p>
          </div>
          <button
            onClick={() => onNavigate('subscriptions')}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Manage All
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Subscription #</th>
                <th className="py-2.5 px-3">Product & Plan</th>
                <th className="py-2.5 px-3">Cadence</th>
                <th className="py-2.5 px-3">Recurring Fee</th>
                <th className="py-2.5 px-3">Renewal Date</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-900">{sub.subscriptionNumber}</td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-900">{sub.productName}</p>
                    <p className="text-[11px] text-slate-500">{sub.planName} (Qty: {sub.quantity})</p>
                  </td>
                  <td className="py-3 px-3 capitalize">{sub.billingFrequency}</td>
                  <td className="py-3 px-3 font-semibold text-slate-900">{formatMoney(sub.amount,sub.currency)}</td>
                  <td className="py-3 px-3 text-slate-600">{formatDate(sub.nextBillingDate)}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={sub.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice History & Payment History (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice History */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Invoice History</h3>
              <p className="text-xs text-slate-500">Tax invoices and billing statements</p>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {invoices.slice(0, 4).map((inv) => (
              <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                    <StatusBadge status={inv.status} size="sm" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Issued: {formatDate(inv.invoiceDate)} • Due: {formatDate(inv.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">{formatMoney(inv.totalAmount,inv.currency)}</span>
                  <button
                    onClick={() => setSelectedInvoiceForPrint(inv)}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                    title="View & Download PDF Invoice"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payment History</h3>
              <p className="text-xs text-slate-500">Settled receipts and transaction records</p>
            </div>
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {payments.slice(0, 4).map((pay) => (
              <div key={pay.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{pay.paymentNumber}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {pay.paymentMethod} • Ref: {pay.referenceNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">{formatMoney(pay.amount,'INR')}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(pay.paymentDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice Print Modal */}
      {selectedInvoiceForPrint && (
        <InvoicePrintModal
          isOpen={!!selectedInvoiceForPrint}
          onClose={() => setSelectedInvoiceForPrint(null)}
          invoice={selectedInvoiceForPrint}
        />
      )}
    </div>
  );
};
