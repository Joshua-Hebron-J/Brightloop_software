import {priceLines} from '../../utils/format';
import {formatMoney,formatDate} from '../../utils/format';
import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Invoice, InvoiceLineItem, Customer } from '../../types';
import { invoicesApi, customersApi, request } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2 } from 'lucide-react';

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<Invoice['status']>('Draft');
  const [notes, setNotes] = useState('Payment is due within 15 days of invoice date.');
  const [items, setItems] = useState<InvoiceLineItem[]>([
    {
      id: `li-${Date.now()}`,
      description: 'Brightloop Cloud Platform — Monthly Enterprise Subscription',
      quantity: 1,
      unitPrice: 99.00,
      taxRate: 0,
      discount: 0,
      amount: 99.00,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await customersApi.getAll();
        setCustomers(res.data);
        if (res.data.length > 0 && !customerId) {
          setCustomerId(res.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchCustomers();
  }, [isOpen]);

  const handleAddItem = () => {
    const newItem: InvoiceLineItem = {
      id: `li-${Date.now()}-${items.length}`,
      description: 'Add-on License / Support Service',
      quantity: 1,
      unitPrice: 49.00,
      taxRate: 0,
      discount: 0,
      amount: 49.00,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      showToast('warning', 'Notice', 'Invoice must have at least one line item.');
      return;
    }
    setItems(items.filter((i) => i.id !== id));
  };

  const handleItemChange = (
    id: string,
    field: keyof InvoiceLineItem,
    val: string | number
  ) => {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          const updated = { ...it, [field]: val };
          const qty = Number(updated.quantity) || 1;
          const price = Number(updated.unitPrice) || 0;
          const disc = Number(updated.discount) || 0;
          updated.amount = Math.max(0, qty * price - disc);
          return updated;
        }
        return it;
      })
    );
  };

  const discountTotal=items.reduce((n,i)=>n+(i.discount||0),0);
  const preview=priceLines(items.map(i=>({quantity:i.quantity,unitPrice:i.unitPrice,taxRatePercent:i.taxRate})),'FIXED',discountTotal);
  const [serverPreview,setServerPreview]=useState<any>(null),[previewError,setPreviewError]=useState(''),[previewBusy,setPreviewBusy]=useState(false);
  useEffect(()=>{if(!isOpen||!customerId)return;let current=true;setPreviewBusy(true);setPreviewError('');request('/official/quote-preview','POST',{customerId,validUntil:dueDate,discountType:'FIXED',discountValue:discountTotal,items:items.map(i=>({description:i.description,quantity:i.quantity,unitPrice:i.unitPrice,taxRatePercent:i.taxRate}))}).then(p=>{if(current)setServerPreview(p)}).catch(e=>{if(current)setPreviewError(e.message)}).finally(()=>{if(current)setPreviewBusy(false)});return()=>{current=false}},[isOpen,customerId,items,dueDate,discountTotal]);
  const calculated=serverPreview||preview;
  const subtotal=calculated.subtotal,taxTotal=calculated.tax,totalAmount=calculated.total;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      showToast('error', 'Validation Error', 'Please select a customer.');
      return;
    }
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    setIsLoading(true);
    try {
      await invoicesApi.create({
        customerId,
        customerName: customer.company,
        customerEmail: customer.email,
        customerAddress: customer.address,
        customerTaxId: customer.taxId,
        invoiceDate,
        dueDate,
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        taxBreakdown: [],
        taxTotal: Math.round(taxTotal * 100) / 100,
        discountTotal: Math.round(discountTotal * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        status,
        paidAmount: 0,
        notes,
      });

      showToast('success', 'Invoice Generated', `Invoice created for ${customer.company}`);
      onSuccess();
      onClose();
    } catch {
      showToast('error', 'Error', 'Failed to generate invoice.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Single Tax Invoice"
      description="Create an ad-hoc or direct subscription tax billing invoice"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Customer & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Customer Account <span className="text-rose-500">*</span>
            </label>
            <select aria-label="Customer Account"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company} ({c.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Invoice Date</label>
            <input aria-label="Invoice Date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Due Date</label>
            <input aria-label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none"
            />
          </div>
        </div>

        {/* Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Initial Status</label>
            <select aria-label="Initial Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Invoice['status'])}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none"
            >

              <option value="Draft">Draft</option>
              
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Payment Terms</label>
            <input aria-label="Payment Terms"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none"
            />
          </div>
        </div>

        {previewError&&<p role="alert" className="text-red-600">{previewError}</p>}
        <p className="text-xs text-slate-500">Configured tax rules override manual fallback rates. The server calculates the final total. Invoices start as drafts; confirm before recording settlement.</p>
        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-800 text-xs">Itemized Line Items</span>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 rounded-md"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white border border-slate-200 rounded-lg grid grid-cols-12 gap-2 items-center"
              >
                <div className="col-span-5">
                  <label className="text-[10px] text-slate-400 block">Description</label>
                  <input aria-label="Description"
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 block">Qty</label>
                  <input aria-label="Qty"
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(item.id, 'quantity', parseInt(e.target.value, 10) || 1)
                    }
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-center font-semibold"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 block">Price (currency)</label>
                  <input aria-label="Price (currency)"
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-center font-semibold"
                  />
                </div>

                <div className="col-span-2"><label className="text-[10px] text-slate-400 block">GST rate (%)<input aria-label="GST rate (%)" className="w-full border rounded p-1" type="number" min="0" max="100" step="0.01" value={item.taxRate} onChange={e=>handleItemChange(item.id,'taxRate',Number(e.target.value))}/></label></div>
                <div className="col-span-2 text-right">
                  <span className="text-[10px] text-slate-400 block">Line Amount</span>
                  <span className="font-bold text-slate-900">{formatMoney(item.amount,customers.find(c=>c.id===customerId)?.currency)}</span>
                </div>

                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-end">
          <div className="w-full sm:w-60 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium">{formatMoney(subtotal,customers.find(c=>c.id===customerId)?.currency)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Configured tax:</span>
              <span className="font-medium">{formatMoney(taxTotal,customers.find(c=>c.id===customerId)?.currency)}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-bold text-slate-900">
              <span>Total Amount:</span>
              <span className="text-blue-600">{formatMoney(totalAmount,customers.find(c=>c.id===customerId)?.currency)}</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading || previewBusy || !!previewError}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || previewBusy || !!previewError}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors"
          >
            {isLoading ? 'Issuing...' : 'Generate Invoice'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
