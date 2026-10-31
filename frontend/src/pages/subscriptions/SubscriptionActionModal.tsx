import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Subscription } from '../../types';
import { subscriptionsApi, billingApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Play, Pause, RefreshCw, XCircle, CheckCircle2 } from 'lucide-react';

export type SubscriptionActionType = 'activate' | 'pause' | 'resume' | 'renew' | 'close';

interface SubscriptionActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription;
  action: SubscriptionActionType;
  onSuccess: () => void;
}

export const SubscriptionActionModal: React.FC<SubscriptionActionModalProps> = ({
  isOpen,
  onClose,
  subscription,
  action,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [generateInvoice, setGenerateInvoice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const getTitle = () => {
    switch (action) {
      case 'activate':
        return `Activate Subscription ${subscription.subscriptionNumber}`;
      case 'pause':
        return `Pause Subscription ${subscription.subscriptionNumber}`;
      case 'resume':
        return `Resume Subscription ${subscription.subscriptionNumber}`;
      case 'renew':
        return `Renew Subscription Cycle — ${subscription.subscriptionNumber}`;
      case 'close':
        return `Close & Terminate Subscription — ${subscription.subscriptionNumber}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if(action==='activate')await subscriptionsApi.transition(subscription.id,'ACTIVE');
      else if(action==='pause')await subscriptionsApi.update(subscription.id,{status:'Paused',pauseReason:reason});
      else if(action==='resume')await subscriptionsApi.update(subscription.id,{status:'Active'});
      else if(action==='renew') {const result=await billingApi.generate(subscription.id);if(result.status!=='GENERATED')throw new Error(result.reason||'Not due for billing');}
      else await subscriptionsApi.update(subscription.id,{status:'Closed',closeReason:reason});
      showToast('success','Subscription updated','The server has applied the action.');
      onSuccess();
      onClose();
    } catch {
      showToast('error', 'Action Failed', 'Could not process subscription update.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {action === 'activate' && (
          <p className="text-slate-600">
            Confirm activation for <strong className="text-slate-900">{subscription.customerName}</strong> on the{' '}
            <strong>{subscription.planName}</strong> plan (${subscription.amount.toFixed(2)}/mo). This will transition status from{' '}
            <span className="font-semibold">{subscription.status}</span> to <span className="text-emerald-600 font-semibold">Active</span>.
          </p>
        )}

        {action === 'pause' && (
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Pause Reason / Feedback</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white mb-2"
            >
              <option value="Customer requested hold">Customer requested temporary hold</option>
              <option value="ERP migration in progress">Customer internal system migration</option>
              <option value="Billing dispute pending review">Billing inquiry / verification</option>
              <option value="Seasonal off-peak pause">Seasonal pause</option>
            </select>
            <textarea
              placeholder="Additional internal notes..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none"
              rows={2}
            />
          </div>
        )}

        {action === 'resume' && (
          <p className="text-slate-600">
            Resume active billing for <strong className="text-slate-900">{subscription.customerName}</strong>. The billing period is extended by the duration of the pause.
          </p>
        )}

        {action === 'renew' && (
          <div>
            <p className="text-slate-600 mb-3">
              Process contract renewal for <strong className="text-slate-900">{subscription.customerName}</strong>.
            </p>
<p className="text-sm text-slate-500">Generate the next due invoice using configured rules. Not-yet-due cycles are skipped.</p>
          </div>
        )}

        {action === 'close' && (
          <div>
            <p className="text-slate-600 mb-2">
              Closing this subscription will immediately cease recurring billing and revoke platform license access.
            </p>
            <label className="block text-slate-700 font-semibold mb-1">Cancellation / Churn Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="Pricing / Budgetary constraints">Pricing / Budgetary constraints</option>
              <option value="Missing features / Integration gap">Missing features / Integration gap</option>
              <option value="Switched to competitor">Switched to competitor</option>
              <option value="Project discontinued / Business closure">Project discontinued</option>
              <option value="Poor customer support experience">Support experience</option>
            </select>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 text-white rounded-lg font-semibold shadow-sm transition-colors ${
              action === 'close'
                ? 'bg-rose-600 hover:bg-rose-700'
                : action === 'pause'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Processing...' : 'Confirm Action'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
