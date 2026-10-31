import React, { useState } from 'react';
import { Quotation } from '../../types';
import { quotationsApi, subscriptionsApi, invoicesApi } from '../../services/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Repeat,
  Send,
  Building,
  Mail,
  FileCheck,
} from 'lucide-react';

interface QuotationDetailPageProps {
  quotation: Quotation;
  onBack: () => void;
  onRefresh: () => void;
}

export const QuotationDetailPage: React.FC<QuotationDetailPageProps> = ({
  quotation,
  onBack,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [isConverting, setIsConverting] = useState(false);

  const handleStatusChange = async (newStatus: Quotation['status']) => {
    try {
      await quotationsApi.updateStatus(quotation.id, newStatus);
      showToast('success', 'Status Updated', `Quotation marked as ${newStatus}.`);
      onRefresh();
    } catch {
      showToast('error', 'Error', 'Failed to update quotation status.');
    }
  };

  const handleConvertToSubscription = async () => {
    setIsConverting(true);
    try {
      await quotationsApi.convert(quotation.id);
      showToast('success','Subscription created','Generate the first invoice from the billing screen.');
      onRefresh();
      onBack();
    } catch {
      showToast('error', 'Error', 'Failed to convert quotation to subscription.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Quotations</span>
      </button>

      {/* Header Proposal Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {quotation.quotationNumber}
              </span>
              <StatusBadge status={quotation.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Valid until <strong>{quotation.validityDate}</strong> • Created on{' '}
              {quotation.createdAt.split('T')[0]}
            </p>
          </div>

          {/* Action Buttons: Convert to Subscription, Accept, Decline */}
          <div className="flex flex-wrap items-center gap-2">
            {quotation.status==='Draft' && <button className="px-3 py-2 border rounded-lg" onClick={()=>handleStatusChange('Sent')}>Submit for approval</button>}
            {quotation.status==='Sent' && <button className="px-3 py-2 border rounded-lg" onClick={()=>handleStatusChange('Approved')}>Approve quotation</button>}

            {quotation.status === 'Approved' && (
              <button
                onClick={() => handleStatusChange('Accepted')}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Accepted</span>
              </button>
            )}

            {!['Converted','Declined'].includes(quotation.status) && (
              <button
                onClick={() => handleStatusChange('Declined')}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Decline</span>
              </button>
            )}

            <button
              onClick={handleConvertToSubscription}
              disabled={isConverting || quotation.status!=='Accepted'}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Repeat className="w-4 h-4" />
              <span>{isConverting ? 'Activating...' : 'Convert to Subscription'}</span>
            </button>
          </div>
        </div>

        {/* Customer Details */}
        <div className="py-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
              Customer Account
            </span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{quotation.customerName}</p>
            <p className="text-slate-500 mt-0.5">{quotation.customerEmail}</p>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
              Notes & Special Conditions
            </span>
            <p className="text-slate-700 mt-0.5 italic">
              {quotation.notes || 'Standard subscription quotation. Pre-approved for instant activation.'}
            </p>
          </div>
        </div>

        {/* Itemized Line Items */}
        <div className="py-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Quoted Products & Licensing Plans
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Plan Tier</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Discount</th>
                  <th className="py-2.5 px-3 text-right">Tax Rate</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotation.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-3 px-3 font-bold text-slate-900">{it.productName}</td>
                    <td className="py-3 px-3 text-blue-600 font-semibold">{it.planName}</td>
                    <td className="py-3 px-3 text-center font-bold">{it.quantity}</td>
                    <td className="py-3 px-3 text-right">${it.unitPrice.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right text-emerald-600">{it.discount.toFixed(2)}%</td>
                    <td className="py-3 px-3 text-right">{it.taxRate}%</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      ${it.subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <div className="w-full sm:w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Gross Subtotal:</span>
              <span className="font-medium">${quotation.subtotal.toFixed(2)}</span>
            </div>
            {quotation.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discounts Applied:</span>
                <span className="font-medium">-${quotation.discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Applicable tax:</span>
              <span className="font-medium">${quotation.taxTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-bold text-slate-900">
              <span>Proposal Total:</span>
              <span className="text-blue-600">${quotation.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
