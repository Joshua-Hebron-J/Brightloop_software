import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Subscription } from '../../types';
import { billingApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Layers, Calendar, CheckSquare, Square, Zap } from 'lucide-react';

interface BulkInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: Subscription[];
  onSuccess: () => void;
}

export const BulkInvoiceModal: React.FC<BulkInvoiceModalProps> = ({
  isOpen,
  onClose,
  subscriptions,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const eligibleSubs = subscriptions.filter((s) => s.status === 'Active' || s.status === 'Trial');
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>(eligibleSubs.map((s) => s.id));
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<'Draft' | 'Confirmed'>('Confirmed');
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleSelectAll = () => {
    if (selectedSubIds.length === eligibleSubs.length) {
      setSelectedSubIds([]);
    } else {
      setSelectedSubIds(eligibleSubs.map((s) => s.id));
    }
  };

  const toggleSub = (id: string) => {
    setSelectedSubIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (selectedSubIds.length === 0) {
      showToast('error', 'Selection Required', 'Please select at least one subscription.');
      return;
    }
    setIsProcessing(true);
    try {
      const result=await billingApi.run(selectedSubIds,invoiceDate,false);
      const failures=result.results.filter((r:any)=>r.status==='FAILED');
      if(failures.length)throw new Error(failures.map((r:any)=>r.reason).join('; '));
      showToast('success','Billing complete',`${result.generatedCount} invoices generated; ${result.skippedCount} skipped.`);
      onSuccess();
      onClose();
    } catch {
      showToast('error', 'Batch Generation Failed', 'Could not complete batch invoicing.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Batch Invoicing Engine"
      description="Generate recurring tax invoices across active subscriber accounts in one operation"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Settings Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Billing target date</label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-blue-600 outline-none"
            />
          </div>

        </div>

        {/* Subscription Selection List */}
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="font-bold text-slate-800">
              Select Subscriptions ({selectedSubIds.length} of {eligibleSubs.length} selected)
            </span>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              {selectedSubIds.length === eligibleSubs.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5" /> Deselect All
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" /> Select All
                </>
              )}
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {eligibleSubs.map((sub) => {
              const isSelected = selectedSubIds.includes(sub.id);
              return (
                <div
                  key={sub.id}
                  onClick={() => toggleSub(sub.id)}
                  className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{sub.customerName}</p>
                      <p className="text-[11px] text-slate-500">
                        {sub.subscriptionNumber} • {sub.productName} ({sub.planName})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">${sub.amount.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{sub.billingFrequency}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-slate-500">
            Total Batch Est:{' '}
            <strong className="text-slate-900 font-bold">
              $
              {eligibleSubs
                .filter((s) => selectedSubIds.includes(s.id))
                .reduce((sum, s) => sum + s.amount * 1.18, 0)
                .toFixed(2)}{' '}
              (incl. 18% tax)
            </strong>
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isProcessing || selectedSubIds.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span>{isProcessing ? 'Generating Invoices...' : `Generate ${selectedSubIds.length} Invoices`}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
