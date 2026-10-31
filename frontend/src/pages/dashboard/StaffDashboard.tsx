import {formatMoney,formatDate} from '../../utils/format';
import React, { useEffect, useState } from 'react';
import {
  Users,
  FileText,
  Repeat,
  Receipt,
  CreditCard,
  Plus,
  ArrowRight,
  Clock,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { quotationsApi, subscriptionsApi, invoicesApi, customersApi } from '../../services/api';
import { Quotation, Subscription, Invoice, Customer } from '../../types';
import { NavItemKey } from '../../components/layout/Sidebar';

interface StaffDashboardProps {
  onNavigate: (nav: NavItemKey) => void;
  onOpenCreateQuotation?: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ onNavigate }) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [qRes, sRes, iRes, cRes] = await Promise.all([
          quotationsApi.getAll(),
          subscriptionsApi.getAll(),
          invoicesApi.getAll(),
          customersApi.getAll(),
        ]);
        setQuotations(qRes.data);
        setSubscriptions(sRes.data);
        setInvoices(iRes.data);
        setCustomers(cRes.data);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const pendingQuotes = quotations.filter((q) => q.status === 'Sent' || q.status === 'Draft');
  const acceptedQuotes = quotations.filter((q) => q.status === 'Accepted' && !q.convertedSubscriptionId);
  const activeSubs = subscriptions.filter((s) => s.status === 'Active');
  const unpaidInvoices = invoices.filter((i) => i.status !== 'Paid');

  return (
    <div className="space-y-6">
      {/* Staff Operational Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider border border-blue-500/30">
              Operations Hub
            </span>
            <span className="text-xs text-slate-400">Sales & Billing Desk</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1.5">
            Staff Daily Operational Console
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Quickly convert accepted quotes to live subscriptions, follow up on pending invoices, and log customer collections.
          </p>
        </div>

        {/* Operational Shortcut Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('quotations')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Quotation</span>
          </button>
          <button
            onClick={() => onNavigate('payments')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Accounts"
          value={customers.length}
          subtitle="Managed B2B clients"
          icon={Users}
          accentColor="blue"
        />
        <MetricCard
          title="Quotes In Pipeline"
          value={pendingQuotes.length}
          subtitle={`${formatMoney(pendingQuotes.filter(q=>q.currency==='INR').reduce((sum,q)=>sum+q.total,0))} INR value`}
          icon={FileText}
          accentColor="indigo"
        />
        <MetricCard
          title="Active Subscriptions"
          value={activeSubs.length}
          subtitle="Currently fulfilling"
          icon={Repeat}
          accentColor="emerald"
        />
        <MetricCard
          title="Unpaid Invoices"
          value={unpaidInvoices.length}
          subtitle={`${formatMoney(unpaidInvoices.filter(i=>i.currency==='INR').reduce((sum,i)=>sum+i.totalAmount-i.paidAmount,0))} INR balance`}
          icon={Receipt}
          accentColor="amber"
        />
      </div>

      {/* Quick Action Shortcuts Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Daily Operations Shortcuts</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigate('customers')}
            className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900">Manage Customers</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Directory & Profiles</p>
          </button>

          <button
            onClick={() => onNavigate('quotations')}
            className="p-3.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <FileText className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900">Quotations (CPQ)</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Configure & Price</p>
          </button>

          <button
            onClick={() => onNavigate('subscriptions')}
            className="p-3.5 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Repeat className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900">Subscriptions</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Pause, Renew, Close</p>
          </button>

          <button
            onClick={() => onNavigate('invoices')}
            className="p-3.5 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900">Invoices & Billing</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Issue & Print PDF</p>
          </button>

          <button
            onClick={() => onNavigate('payments')}
            className="p-3.5 rounded-lg border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900">Record Payments</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Card, UPI, Bank</p>
          </button>
        </div>
      </div>

      {/* Two Critical Working Operational Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quotations Awaiting Action */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Quotation Pipeline</h3>
              <p className="text-xs text-slate-500">Quotes pending client sign-off or ready to convert</p>
            </div>
            <button
              onClick={() => onNavigate('quotations')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              All Quotes
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {quotations.slice(0, 4).map((q) => (
              <div
                key={q.id}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{q.quotationNumber}</span>
                    <StatusBadge status={q.status} size="sm" />
                  </div>
                  <p className="text-xs font-medium text-slate-700 mt-0.5">{q.customerName}</p>
                  <p className="text-[11px] text-slate-400">Valid until {formatDate(q.validityDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">{formatMoney(q.total,q.currency)}</p>
                  {q.status === 'Accepted' && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      Ready to Convert
                    </span>
                  )}
                  {q.status === 'Sent' && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 font-medium">
                      <Send className="w-3 h-3" />
                      Awaiting Response
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoices Requiring Follow-Up / Settlement */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Invoices Needing Collection</h3>
              <p className="text-xs text-slate-500">Unpaid and pending billing statements</p>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              All Invoices
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {unpaidInvoices.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">All invoices currently settled!</p>
            ) : (
              unpaidInvoices.slice(0, 4).map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{inv.invoiceNumber}</span>
                      <StatusBadge status={inv.status} size="sm" />
                    </div>
                    <p className="text-xs font-medium text-slate-700 mt-0.5">{inv.customerName}</p>
                    <p className="text-[11px] text-slate-400">Due: {formatDate(inv.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-rose-600">{formatMoney(inv.totalAmount,inv.currency)}</p>
                    <button
                      onClick={() => onNavigate('payments')}
                      className="mt-1 text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      Collect Now
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
