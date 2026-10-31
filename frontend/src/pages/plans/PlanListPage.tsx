import {formatMoney,formatDate} from '../../utils/format';
import {ListPager} from '../../components/common/ListPager';
import React, { useEffect, useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Edit,
  Check,
  Calendar,
  Clock,
  Repeat,
} from 'lucide-react';
import { plansApi } from '../../services/api';
import { Plan, BillingFrequency } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PlanFormModal } from './PlanFormModal';
import { useToast } from '../../context/ToastContext';
import { EmptyState } from '../../components/common/EmptyState';

export const PlanListPage: React.FC = () => {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [page,setPage]=useState(1),[total,setTotal]=useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<'all' | BillingFrequency>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const res = await plansApi.getAll(page);
      setTotal(res.total);
      setPlans(res.data);
    } catch {
      showToast('error', 'Error', 'Failed to load subscription plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [page]);

  const filteredPlans = plans.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.productName && p.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFreq = frequencyFilter === 'all' || p.billingFrequency === frequencyFilter;
    return matchesSearch && matchesFreq;
  });

  return (
    <div className="space-y-6">
      <ListPager page={page} total={total} onChange={setPage}/>
      {/* Header & New Plan Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Subscription Plans</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure recurring billing structures, cadences, renewal and pause permissions
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPlan(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Plan</span>
        </button>
      </div>

      {/* Filter Toolbar & Billing Frequency Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Frequency Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg w-full md:w-auto overflow-x-auto">
          {(['all', 'monthly', 'yearly', 'weekly', 'daily'] as const).map((freq) => (
            <button
              key={freq}
              onClick={() => setFrequencyFilter(freq)}
              className={`px-3 py-1 text-xs font-semibold rounded-md capitalize whitespace-nowrap transition-all ${
                frequencyFilter === freq
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {freq === 'all' ? 'All Frequencies' : freq}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plans or products..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>
      </div>

      {/* Plans Grid Display */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Subscription Plans Found"
          description="Create plans to enable customer signups and recurring invoicing."
          actionLabel="Create Plan"
          onAction={() => {
            setEditingPlan(null);
            setIsFormOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Plan Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                      {plan.productName || 'BillSync Cloud'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{plan.name}</h3>
                  </div>
                  <StatusBadge status={plan.status} size="sm" />
                </div>

                <p className="mt-2 text-xs text-slate-500 line-clamp-2">{plan.description}</p>

                {/* Price Display */}
                <div className="mt-4 pb-4 border-b border-slate-100 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {formatMoney(plan.price,plan.currency)}
                  </span>
                  <span className="text-xs font-medium text-slate-500 capitalize">
                    / {plan.billingFrequency}
                  </span>
                </div>

                {/* Settings Badges */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Pause Policy</span>
                    <span className="font-semibold text-slate-800">
                      {plan.pauseSettings?.allowPause
                        ? 'Allowed'
                        : 'No Pause'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Auto-Renew</span>
                    <span className="font-semibold text-slate-800">
                      {plan.renewalSettings?.autoRenew ? 'Active (Auto)' : 'Manual'}
                    </span>
                  </div>
                </div>

                {/* Features list */}
                {plan.features && plan.features.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Included Capabilities
                    </span>
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer: Edit Button */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Min Qty: <strong>{plan.minimumQuantity}</strong>
                </span>
                <button
                  onClick={() => {
                    setEditingPlan(plan);
                    setIsFormOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Configure Plan</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Form Modal */}
      <PlanFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        plan={editingPlan}
        onSuccess={loadPlans}
      />
    </div>
  );
};
