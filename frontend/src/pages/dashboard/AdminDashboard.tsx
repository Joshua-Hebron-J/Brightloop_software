import {formatMoney,formatDate} from '../../utils/format';
import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Repeat,
  Users,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { dashboardApi } from '../../services/api';
import { DashboardData } from '../../types';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { NavItemKey } from '../../components/layout/Sidebar';

interface AdminDashboardProps {
  onNavigate: (nav: NavItemKey) => void;
}

const PIE_COLORS = ['#2563eb', '#6366f1', '#10b981', '#f59e0b'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const result = await dashboardApi.getDashboardData();
        setData(result.data);
      } catch (err) {
        console.error('Failed to load admin dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (!isLoading && !data) return <p role="alert" className="p-8 text-red-700">Could not load the dashboard. Check the API connection and reload.</p>;
  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const { metrics, revenueHistory, subscriptionGrowth, paymentOverview, recentTransactions, recentSubscriptions, upcomingRenewals, outstandingInvoices } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner / Executive Summary */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider border border-blue-500/30">
              Executive View
            </span>
            <span className="text-xs text-slate-400">Brightloop Software HQ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1.5">
            Platform Revenue & Subscription Overview
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Real-time telemetry across products, active subscribers, recurring billings and cash settlements.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('analytics')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>Deep Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 7 Mandatory Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={formatMoney(metrics.totalRevenue)}
          icon={DollarSign}
          accentColor="emerald"
        />
        <MetricCard
          title="Monthly Recurring (MRR)"
          value={formatMoney(metrics.mrr)}
          icon={TrendingUp}
          accentColor="blue"
        />
        <MetricCard
          title="Annual Run Rate (ARR)"
          value={formatMoney(metrics.arr)}
          subtitle="Forecasted annualized recurring"
          icon={ShieldCheck}
          accentColor="indigo"
        />
        <MetricCard
          title="Active Subscriptions"
          value={metrics.activeSubscriptions}
          badgeText="Active"
          icon={Repeat}
          accentColor="blue"
        />
        <MetricCard
          title="Total Customers"
          value={metrics.totalCustomers}
          icon={Users}
          subtitle="Registered accounts"
          accentColor="slate"
        />
        <MetricCard
          title="Outstanding Payments"
          value={formatMoney(metrics.outstandingPayments)}
          icon={Clock}
          accentColor="amber"
        />
        <MetricCard
          title="Overdue Invoices"
          value={metrics.overdueInvoices}
          icon={AlertCircle}
          badgeText="Overdue"
          accentColor="rose"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue & MRR Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly cash receipts</h3>
              <p className="text-xs text-slate-500">Recorded payments by month</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md">
              INR
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => formatMoney(Number(val))} />
                <Tooltip
                  formatter={(val: number) => [formatMoney(val), '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />

              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Overview Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payment Methods</h3>
              <p className="text-xs text-slate-500">Volume distribution by channel</p>
            </div>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentOverview}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="amount"
                  nameKey="method"
                >
                  {paymentOverview.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [formatMoney(val), 'Amount']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
            {paymentOverview.map((item, idx) => (
              <div key={item.method} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                <span className="text-slate-600 truncate">{item.method}:</span>
                <span className="font-semibold text-slate-900 ml-auto">{formatMoney(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subscription Growth Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Subscription Trajectory & Net Adds</h3>
            <p className="text-xs text-slate-500">Active subscriber cohort growth vs monthly churn</p>
          </div>
          <button
            onClick={() => onNavigate('subscriptions')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            Manage Subscriptions
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subscriptionGrowth} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="active" name="Active Subscribers" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="newCount" name="New Subscriptions" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="churned" name="Churned" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4 Additional Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Recent Transactions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{tx.customerName}</p>
                  <p className="text-[11px] text-slate-500">
                    {tx.invoiceNumber} • {tx.paymentMethod} • {formatDate(tx.paymentDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">+{formatMoney(tx.amount,'INR')}</p>
                  <span className="text-[10px] text-slate-400 font-mono">{tx.referenceNumber}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Outstanding Invoices */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Outstanding Invoices</h3>
              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[10px]">
                {outstandingInvoices.length} Pending
              </span>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Billing
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {outstandingInvoices.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No outstanding invoices</p>
            ) : (
              outstandingInvoices.map((inv) => (
                <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                      <StatusBadge status={inv.status} size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {inv.customerName} • Due: {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-rose-600">{formatMoney(inv.totalAmount,inv.currency)}</p>
                    <span className="text-[10px] text-slate-400">Unsettled</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Recent Subscriptions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-900">Recent Subscriptions</h3>
            <button
              onClick={() => onNavigate('subscriptions')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Directory
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSubscriptions.map((sub) => (
              <div key={sub.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{sub.customerName}</span>
                    <StatusBadge status={sub.status} size="sm" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {sub.planName} • {sub.billingFrequency}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{formatMoney(sub.amount,sub.currency)}</p>
                  <p className="text-[10px] text-slate-400">Next: {formatDate(sub.nextBillingDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Upcoming Renewals */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Upcoming Renewals</h3>
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                Auto-Renew Active
              </span>
            </div>
            <button
              onClick={() => onNavigate('subscriptions')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              View
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingRenewals.map((ren) => (
              <div key={ren.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{ren.customerName}</p>
                  <p className="text-[11px] text-slate-500">
                    {ren.planName} ({ren.billingFrequency})
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    Due {formatDate(ren.nextBillingDate)}
                  </span>
                  <p className="text-[11px] font-bold text-slate-800 mt-0.5">
                    {formatMoney(ren.amount,'INR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
