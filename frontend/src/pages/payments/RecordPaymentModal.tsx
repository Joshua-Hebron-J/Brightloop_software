import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Customer, Invoice, PaymentMethod } from '../../types';
import { paymentsApi, customersApi, invoicesApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { CreditCard, Banknote, QrCode, Building } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedInvoice?: Invoice | null;
  onSuccess: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedInvoice,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, iRes] = await Promise.all([
          customersApi.getAll(),
          invoicesApi.getAll(),
        ]);
        setCustomers(cRes.data);
        setInvoices(iRes.data);

        if (preselectedInvoice) {
          setCustomerId(preselectedInvoice.customerId);
          setInvoiceId(preselectedInvoice.id);
          const balance = preselectedInvoice.totalAmount - preselectedInvoice.paidAmount;
          setAmount(balance.toFixed(2));
          generateRef('Card');
        } else if (cRes.data.length > 0) {
          setCustomerId(cRes.data[0].id);
          generateRef('Card');
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, [isOpen, preselectedInvoice]);

  const generateRef = (method: PaymentMethod) => {
    const random = Math.floor(100000 + Math.random() * 900000);
    switch (method) {
      case 'Card':
        setReferenceNumber(`TXN-CARD-${random}`);
        break;
      case 'UPI':
        setReferenceNumber(`TXN-UPI-${random}`);
        break;
      case 'Bank Transfer':
        setReferenceNumber(`WIRE-ACH-${random}`);
        break;
      case 'Cash':
        setReferenceNumber(`REC-CSH-${random.toString().slice(0, 4)}`);
        break;
    }
  };

  const handleMethodChange = (m: PaymentMethod) => {
    setPaymentMethod(m);
    generateRef(m);
  };

  const handleCustomerChange = (newCustId: string) => {
    setCustomerId(newCustId);
    const customerUnpaidInvoices = invoices.filter(
      (i) => i.customerId === newCustId && ['Confirmed','Partial'].includes(i.status)
    );
    if (customerUnpaidInvoices.length > 0) {
      const inv = customerUnpaidInvoices[0];
      setInvoiceId(inv.id);
      setAmount((inv.totalAmount - inv.paidAmount).toFixed(2));
    } else {
      setInvoiceId('');
      setAmount('0.00');
    }
  };

  const handleInvoiceChange = (newInvId: string) => {
    setInvoiceId(newInvId);
    const inv = invoices.find((i) => i.id === newInvId);
    if (inv) {
      setAmount((inv.totalAmount - inv.paidAmount).toFixed(2));
    }
  };

  const availableInvoices = invoices.filter(
    (i) => (!customerId || i.customerId === customerId) && ['Confirmed','Partial'].includes(i.status)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('error', 'Validation Error', 'Please enter a valid payment amount.');
      return;
    }
    const customer = customers.find((c) => c.id === customerId);
    const invoice = invoices.find((i) => i.id === invoiceId);

    if (!customer) {
      showToast('error', 'Validation Error', 'Customer is required.');
      return;
    }

    setIsLoading(true);
    try {
      await paymentsApi.create({
        customerId: customer.id,
        customerName: customer.company,
        invoiceId: invoice?.id || `inv-adhoc-${Date.now()}`,
        invoiceNumber: invoice?.invoiceNumber || 'INV-DIRECT',
        amount: numAmount,
        paymentDate,
        paymentMethod,
        referenceNumber: referenceNumber || `TXN-${Date.now()}`,
        status: 'Completed',
        notes: notes || `Direct settlement for ${customer.company}`,
      });

      showToast(
        'success',
        'Payment Recorded Successfully',
        `$${numAmount.toFixed(2)} recorded via ${paymentMethod}.`
      );
      onSuccess();
      onClose();
    } catch {
      showToast('error', 'Error', 'Failed to log payment transaction.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment & Settlement"
      description="Record incoming cash, credit card, bank wire, or UPI settlement against outstanding invoices"
      maxWidth="lg"
    >
      <p className="text-sm text-slate-500 mb-3">This records a payment received outside Brightloop. No card is charged and no funds are transferred.</p>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Customer & Invoice Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Customer Organization <span className="text-rose-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white outline-none"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company} ({c.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Target Invoice</label>
            <select
              value={invoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white outline-none"
            >
              <option value="">Select Invoice...</option>
              {availableInvoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoiceNumber} (${(i.totalAmount - i.paidAmount).toFixed(2)} due)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Payment Amount ($ USD) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-sm outline-none text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Payment Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
            />
          </div>
        </div>

        {/* Payment Method Selector Grid */}
        <div>
          <label className="block text-slate-700 font-semibold mb-1.5">Payment Method</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'Card' as PaymentMethod, label: 'Credit Card', icon: CreditCard },
              { id: 'UPI' as PaymentMethod, label: 'UPI Instant', icon: QrCode },
              { id: 'Bank Transfer' as PaymentMethod, label: 'Bank Wire', icon: Building },
              { id: 'Cash' as PaymentMethod, label: 'Cash / Check', icon: Banknote },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMethodChange(m.id)}
                  className={`p-2.5 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-medium'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px]">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reference Number & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Gateway Reference / Authorization #
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Notes / Ledger Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared via Stripe / Authorize.net"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-xs"
            />
          </div>
        </div>

        {/* Action Buttons */}
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
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm transition-colors"
          >
            {isLoading ? 'Processing...' : 'Record Settlement'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
