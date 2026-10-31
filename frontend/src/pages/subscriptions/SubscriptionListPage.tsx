import {formatMoney,formatDate} from '../../utils/format';
import {ListPager} from '../../components/common/ListPager';
import {NewSubscription} from '../../components/common/Operations';
import React, { useEffect, useState } from 'react';
import {
  Repeat,
  Plus,
  Search,
  Filter,
  Eye,
  Play,
  Pause,
  RefreshCw,
  XCircle,
  Zap,
} from 'lucide-react';
import { subscriptionsApi } from '../../services/api';
import { Subscription, SubscriptionStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SubscriptionDetailPage } from './SubscriptionDetailPage';
import { SubscriptionActionModal, SubscriptionActionType } from './SubscriptionActionModal';
import { BulkInvoiceModal } from '../../components/invoice/BulkInvoiceModal';
import { useToast } from '../../context/ToastContext';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';

export const SubscriptionListPage: React.FC = () => {
  const { showToast } = useToast();
  const { role, user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [page,setPage]=useState(1),[total,setTotal]=useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedSubForDetail, setSelectedSubForDetail] = useState<Subscription | null>(null);
  const [actionModal, setActionModal] = useState<{
    sub: Subscription;
    action: SubscriptionActionType;
  } | null>(null);
  const [isBulkInvoiceOpen, setIsBulkInvoiceOpen] = useState(false);

  const loadSubscriptions = async () => {
    setIsLoading(true);
    try {
      const res = await subscriptionsApi.getAll(page);
      setTotal(res.total);
      if (role === 'customer') {
        const custId = user?.customerId || 'cust-1';
        setSubscriptions(res.data.filter((s) => s.customerId === custId));
      } else {
        setSubscriptions(res.data);
      }
    } catch {
      showToast('error', 'Error', 'Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [role, user,page]);

  const filteredSubscriptions = subscriptions.filter((s) => {
    const matchesSearch =
      s.subscriptionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.productName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status.toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  if (selectedSubForDetail) {
    return (
      <SubscriptionDetailPage
        subscription={selectedSubForDetail}
        onBack={() => setSelectedSubForDetail(null)}
        onRefresh={loadSubscriptions}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ListPager page={page} total={total} onChange={setPage}/>
      {role !== 'customer' && <NewSubscription onRefresh={loadSubscriptions}/>}
      {/* Header & Bulk Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {role === 'customer' ? 'My Active Subscriptions' : 'Subscription Management'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full lifecycle control: Draft → Quotation → Confirmed → Active → Closed with pause and proration rules
          </p>
        </div>

        {role !== 'customer' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkInvoiceOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>Bulk Invoicing</span>
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by sub #, customer or plan..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-blue-600 text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Closed</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Subscription Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filteredSubscriptions.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No Subscriptions Found"
          description="Subscriptions will populate when quotations are converted or direct contracts are created."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Subscription #</th>
                  <th className="py-3 px-4">Customer Account</th>
                  <th className="py-3 px-4">Product & Plan</th>
                  <th className="py-3 px-4">Cadence</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Next Billing Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                      {sub.subscriptionNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{sub.customerName}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{sub.productName}</p>
                      <p className="text-[11px] text-slate-500">
                        {sub.planName} (Qty: {sub.quantity})
                      </p>
                    </td>
                    <td className="py-3.5 px-4 capitalize text-slate-700">{sub.billingFrequency}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{formatMoney(sub.amount,sub.currency)}</td>
                    <td className="py-3.5 px-4 text-slate-600">{formatDate(sub.nextBillingDate)}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedSubForDetail(sub)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-md font-semibold text-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {/* Quick Action Buttons for staff/admin */}
                        {role !== 'customer' && (
                          <>
                            {(sub.status === 'Confirmed') && (
                              <button
                                onClick={() => setActionModal({ sub, action: 'activate' })}
                                className="p-1 text-slate-400 hover:text-emerald-600"
                                title="Activate"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {sub.status === 'Active' && (
                              <button
                                onClick={() => setActionModal({ sub, action: 'pause' })}
                                className="p-1 text-slate-400 hover:text-amber-600"
                                title="Pause"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {sub.status === 'Paused' && (
                              <button
                                onClick={() => setActionModal({ sub, action: 'resume' })}
                                className="p-1 text-slate-400 hover:text-emerald-600"
                                title="Resume"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {sub.status === 'Active' && (
                              <button
                                onClick={() => setActionModal({ sub, action: 'renew' })}
                                className="p-1 text-slate-400 hover:text-blue-600"
                                title="Renew Cycle"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lifecycle Action Modal */}
      {actionModal && (
        <SubscriptionActionModal
          isOpen={!!actionModal}
          onClose={() => setActionModal(null)}
          subscription={actionModal.sub}
          action={actionModal.action}
          onSuccess={loadSubscriptions}
        />
      )}

      {/* Bulk Invoice Modal */}
      <BulkInvoiceModal
        isOpen={isBulkInvoiceOpen}
        onClose={() => setIsBulkInvoiceOpen(false)}
        subscriptions={subscriptions}
        onSuccess={loadSubscriptions}
      />
    </div>
  );
};
