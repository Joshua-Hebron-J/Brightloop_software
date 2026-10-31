import {formatMoney,formatDate} from '../../utils/format';
import {AddonTools} from '../../components/common/AddonTools';
import {SubscriptionTools} from '../../components/common/Operations';
import React, { useState, useEffect } from 'react';
import { Subscription, Invoice } from '../../types';
import { invoicesApi } from '../../services/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  ArrowLeft,
  Calendar,
  Repeat,
  DollarSign,
  Play,
  Pause,
  RefreshCw,
  XCircle,
  Receipt,
  Download,
} from 'lucide-react';
import { SubscriptionActionModal, SubscriptionActionType } from './SubscriptionActionModal';
import { InvoicePrintModal } from '../../components/invoice/InvoicePrintModal';

interface SubscriptionDetailPageProps {
  subscription: Subscription;
  onBack: () => void;
  onRefresh: () => void;
}

export const SubscriptionDetailPage: React.FC<SubscriptionDetailPageProps> = ({
  subscription,
  onBack,
  onRefresh,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [actionType, setActionType] = useState<SubscriptionActionType | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    async function loadInvoices() {
      try {
        const res = await invoicesApi.getAll();
        setInvoices(res.data.filter((i) => i.subscriptionId === subscription.id));
      } catch (err) {
        console.error(err);
      }
    }
    loadInvoices();
  }, [subscription.id]);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Subscriptions</span>
      </button>

      <SubscriptionTools sub={subscription} onRefresh={()=>{onRefresh();onBack()}}/>
      {['Active','Paused','Trial'].includes(subscription.status)&&<AddonTools sub={subscription} onRefresh={()=>{onRefresh();onBack()}}/>}
      {/* Main Subscription Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {subscription.subscriptionNumber}
              </span>
              <StatusBadge status={subscription.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Account: <strong className="text-slate-800">{subscription.customerName}</strong> • Started on{' '}
              {formatDate(subscription.startDate)}
            </p>
          </div>

          {/* Lifecycle Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {(subscription.status === 'Confirmed') && (
              <button
                onClick={() => setActionType('activate')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Activate</span>
              </button>
            )}

            {subscription.status === 'Active' && (
              <>
                <button
                  onClick={() => setActionType('pause')}
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
                <button
                  onClick={() => setActionType('renew')}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Renew Cycle</span>
                </button>
                <button
                  onClick={() => setActionType('close')}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Close</span>
                </button>
              </>
            )}

            {subscription.status === 'Paused' && (
              <button
                onClick={() => setActionType('resume')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume Subscription</span>
              </button>
            )}
          </div>
        </div>

        {/* Detailed Grid Info */}
        <div className="py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-b border-slate-100">
          <div>
            <span className="text-slate-400 block text-[11px] font-bold uppercase">Software Product</span>
            <p className="font-bold text-slate-900 mt-1">{subscription.productName}</p>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-bold uppercase">Licensing Plan</span>
            <p className="font-semibold text-blue-600 mt-1">
              {subscription.planName} (Qty: {subscription.quantity})
            </p>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-bold uppercase">Billing Cadence</span>
            <p className="font-semibold text-slate-800 capitalize mt-1">
              {subscription.billingFrequency}
            </p>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-bold uppercase">Recurring Amount</span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">
              {formatMoney(subscription.amount,subscription.currency)}
            </p>
          </div>
        </div>

        <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Start Date</span>
            <span className="font-medium text-slate-800">{formatDate(subscription.startDate)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Next Billing Cycle</span>
            <span className="font-medium text-slate-800">{formatDate(subscription.nextBillingDate)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Auto-Renew Policy</span>
            <span className="font-medium text-slate-800">
              {subscription.autoRenew ? 'Enabled (Automatic)' : 'Cancellation scheduled at period end'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Contract Status</span>
            <span className="capitalize font-semibold text-slate-800">{subscription.status}</span>
          </div>
        </div>

        {subscription.pauseReason && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <strong>Paused Notice:</strong> {subscription.pauseReason} (Paused at {subscription.pausedAt?.split('T')[0]})
          </div>
        )}

        {subscription.closeReason && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
            <strong>Termination Record:</strong> {subscription.closeReason} (Closed on {subscription.closedAt?.split('T')[0]})
          </div>
        )}
      </div>

      {/* Generated Invoices for this subscription */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900">Subscription Invoices</h3>
          </div>
          <span className="text-xs text-slate-500">{invoices.length} billing statements</span>
        </div>

        {invoices.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No invoices generated yet for this subscription.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
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
                    <td className="py-2.5 px-3 text-slate-600">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-2.5 px-3 text-slate-600">{formatDate(inv.dueDate)}</td>
                    <td className="py-2.5 px-3 font-bold">{formatMoney(inv.totalAmount,inv.currency)}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="p-1 text-slate-400 hover:text-blue-600"
                        title="View / Print Tax Invoice"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionType && (
        <SubscriptionActionModal
          isOpen={!!actionType}
          onClose={() => setActionType(null)}
          subscription={subscription}
          action={actionType}
          onSuccess={() => {
            onRefresh();
            onBack();
          }}
        />
      )}

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
