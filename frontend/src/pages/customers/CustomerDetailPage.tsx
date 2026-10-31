import React, { useEffect, useState } from 'react';
import { Customer, Subscription, Invoice, Payment, Quotation } from '../../types';
import { subscriptionsApi, invoicesApi, paymentsApi, quotationsApi } from '../../services/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  FileText,
  Repeat,
  Receipt,
  CreditCard,
  Edit,
  Download,
} from 'lucide-react';
import { InvoicePrintModal } from '../../components/invoice/InvoicePrintModal';

interface CustomerDetailPageProps {
  customer: Customer;
  onBack: () => void;
  onEdit: (customer: Customer) => void;
}

export const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({
  customer,
  onBack,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'invoices' | 'payments' | 'quotes'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [subRes, invRes, payRes, quoteRes] = await Promise.all([
          subscriptionsApi.getAll(),
          invoicesApi.getAll(),
          paymentsApi.getAll(),
          quotationsApi.getAll(),
        ]);
        setSubscriptions(subRes.data.filter((s) => s.customerId === customer.id));
        setInvoices(invRes.data.filter((i) => i.customerId === customer.id));
        setPayments(payRes.data.filter((p) => p.customerId === customer.id));
        setQuotations(quoteRes.data.filter((q) => q.customerId === customer.id));
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [customer.id]);

  const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);
  const unpaidInvoices = invoices.filter((i) => i.status !== 'Paid');
  const outstandingBalance = unpaidInvoices.reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Customer Directory</span>
      </button>

      {/* Customer 360 Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
              {customer.company.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{customer.company}</h2>
                <StatusBadge status={customer.status} size="sm" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Primary Contact: {customer.name}</p>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {customer.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {customer.phone || 'N/A'}
                </span>
                {customer.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {customer.address}
                  </span>
                )}
                {customer.taxId && (
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    Tax ID: {customer.taxId}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => onEdit(customer)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Quick Customer KPI Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Total Settled Revenue</span>
            <span className="text-lg font-bold text-slate-900">${totalSpent.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Active Subscriptions</span>
            <span className="text-lg font-bold text-blue-600">
              {subscriptions.filter((s) => s.status === 'Active').length}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Outstanding Due</span>
            <span className={`text-lg font-bold ${outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              ${outstandingBalance.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Invoices Issued</span>
            <span className="text-lg font-bold text-slate-900">{invoices.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs for Subscription, Invoice, and Payment History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 px-4 pt-2 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'subscriptions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>Subscriptions ({subscriptions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'invoices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Invoices ({invoices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'payments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payments ({payments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('quotes')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'quotes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Quotations ({quotations.length})</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="p-4">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading history...</div>
          ) : activeTab === 'subscriptions' ? (
            subscriptions.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No subscriptions for this customer.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Subscription #</th>
                      <th className="py-2.5 px-3">Product / Plan</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Next Billing</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{s.subscriptionNumber}</td>
                        <td className="py-2.5 px-3 font-medium">
                          {s.productName} — {s.planName}
                        </td>
                        <td className="py-2.5 px-3 capitalize">{s.billingFrequency}</td>
                        <td className="py-2.5 px-3 font-bold">${s.amount.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-slate-600">{s.nextBillingDate}</td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={s.status} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === 'invoices' ? (
            invoices.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No invoices issued for this customer.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3">Total Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600">{inv.invoiceDate}</td>
                        <td className="py-2.5 px-3 text-slate-600">{inv.dueDate}</td>
                        <td className="py-2.5 px-3 font-bold">${inv.totalAmount.toFixed(2)}</td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={inv.status} size="sm" />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1 text-slate-400 hover:text-blue-600"
                            title="View / Print Invoice"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === 'payments' ? (
            payments.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No payments recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Payment #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Reference #</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{p.paymentNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600">{p.paymentDate}</td>
                        <td className="py-2.5 px-3">{p.paymentMethod}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {p.referenceNumber}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-600">${p.amount.toFixed(2)}</td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={p.status} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            quotations.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No quotations generated yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Quote #</th>
                      <th className="py-2.5 px-3">Items Summary</th>
                      <th className="py-2.5 px-3">Validity</th>
                      <th className="py-2.5 px-3">Total</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotations.map((q) => (
                      <tr key={q.id}>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{q.quotationNumber}</td>
                        <td className="py-2.5 px-3">
                          {q.items.map((it) => `${it.productName} (${it.quantity})`).join(', ')}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{q.validityDate}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">${q.total.toFixed(2)}</td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={q.status} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Invoice Print Modal */}
      {selectedInvoice && (
        <InvoicePrintModal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
        />
      )}
    </div>
  );
};
