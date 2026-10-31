import {priceLines} from '../../utils/format';
import {formatMoney,formatDate} from '../../utils/format';
import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Quotation, QuotationItem, Customer, Product, Plan } from '../../types';
import { request, quotationsApi, customersApi, productsApi, plansApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, Calculator } from 'lucide-react';

interface QuotationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation?: Quotation | null;
  onSuccess: () => void;
}

export const QuotationFormModal: React.FC<QuotationFormModalProps> = ({
  isOpen,
  onClose,
  quotation,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [validityDate, setValidityDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Quotation['status']>('Draft');
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadDependencies() {
      try {
        const [cRes, pRes, plRes] = await Promise.all([
          customersApi.getAll(),
          productsApi.getAll(),
          plansApi.getAll(),
        ]);
        setCustomers(cRes.data);
        setProducts(pRes.data);
        setPlans(plRes.data);

        if (cRes.data.length > 0 && !customerId) {
          setCustomerId(cRes.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadDependencies();
  }, [isOpen]);

  useEffect(() => {
    if (quotation) {
      setCustomerId(quotation.customerId);
      setValidityDate(quotation.validityDate);
      setNotes(quotation.notes || '');
      setStatus(quotation.status);
      setItems(quotation.items);
    } else {
      setValidityDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
      setNotes('Standard enterprise quotation terms apply. Net 30.');
      setStatus('Draft');
      if (products.length > 0 && plans.length > 0) {
        const defaultProd = products[0];
        const defaultPlan = plans.find((pl) => pl.productId === defaultProd.id) || plans[0];
        setItems([
          {
            id: `qitem-${Date.now()}`,
            productId: defaultProd.id,
            productName: defaultProd.name,
            planId: defaultPlan.id,
            planName: defaultPlan.name,
            quantity: 1,
            unitPrice: defaultPlan.price,
            discount: 0,
            taxRate: 0,
            subtotal: defaultPlan.price,
          },
        ]);
      }
    }
  }, [quotation, isOpen, products, plans]);

  const handleAddItem = () => {
    if (products.length === 0 || plans.length === 0) return;
    const defaultProd = products[0];
    const defaultPlan = plans.find((pl) => pl.productId === defaultProd.id) || plans[0];
    const newItem: QuotationItem = {
      id: `qitem-${Date.now()}-${items.length}`,
      productId: defaultProd.id,
      productName: defaultProd.name,
      planId: defaultPlan.id,
      planName: defaultPlan.name,
      quantity: 1,
      unitPrice: defaultPlan.price,
      discount: 0,
      taxRate: 0,
      subtotal: defaultPlan.price,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      showToast('warning', 'Notice', 'Quotation must have at least one line item.');
      return;
    }
    setItems(items.filter((i) => i.id !== id));
  };

  const handleProductChange = (itemId: string, newProdId: string) => {
    const prod = products.find((p) => p.id === newProdId);
    const availablePlans = plans.filter((pl) => pl.productId === newProdId);
    const chosenPlan = availablePlans[0] || plans[0];

    setItems(
      items.map((it) => {
        if (it.id === itemId) {
          const unitPrice = chosenPlan ? chosenPlan.price : prod?.price || 49;
          const subtotal = unitPrice * it.quantity - it.discount;
          return {
            ...it,
            productId: newProdId,
            productName: prod?.name || '',
            planId: chosenPlan?.id || '',
            planName: chosenPlan?.name || '',
            unitPrice,
            subtotal: Math.max(0, subtotal),
          };
        }
        return it;
      })
    );
  };

  const handlePlanChange = (itemId: string, newPlanId: string) => {
    const chosenPlan = plans.find((pl) => pl.id === newPlanId);
    if (!chosenPlan) return;

    setItems(
      items.map((it) => {
        if (it.id === itemId) {
          const unitPrice = chosenPlan.price;
          const subtotal = unitPrice * it.quantity - it.discount;
          return {
            ...it,
            planId: newPlanId,
            planName: chosenPlan.name,
            unitPrice,
            subtotal: Math.max(0, subtotal),
          };
        }
        return it;
      })
    );
  };

  const handleItemFieldChange = (
    itemId: string,
    field: 'quantity' | 'unitPrice' | 'discount' | 'taxRate',
    val: number
  ) => {
    setItems(
      items.map((it) => {
        if (it.id === itemId) {
          const updated = { ...it, [field]: val };
          const subtotal = updated.unitPrice * updated.quantity - updated.discount;
          updated.subtotal = Math.max(0, subtotal);
          return updated;
        }
        return it;
      })
    );
  };

  const localPreview=priceLines(items.map(i=>({quantity:i.quantity,unitPrice:i.unitPrice,discountPercent:i.discount,taxRatePercent:i.taxRate})));
  const[serverPreview,setServerPreview]=useState<any>(null),[previewError,setPreviewError]=useState(''),[previewBusy,setPreviewBusy]=useState(false);
  useEffect(()=>{let current=true;if(!customerId||!items.length)return;setPreviewBusy(true);setPreviewError('');request('/official/quote-preview','POST',{customerId,planId:items[0]?.planId,validUntil:new Date(validityDate).toISOString(),items:items.map(i=>({productId:i.productId||null,description:i.productName,quantity:i.quantity,unitPrice:i.unitPrice,discountPercent:i.discount,taxRatePercent:i.taxRate}))}).then(p=>{if(current)setServerPreview(p)}).catch(e=>{if(current){setServerPreview(null);setPreviewError(e.message)}}).finally(()=>{if(current)setPreviewBusy(false)});return()=>{current=false}},[customerId,items,validityDate]);
  const preview=serverPreview||localPreview;
  const subtotal=preview.subtotal,discountTotal=preview.discount,taxTotal=preview.tax,total=preview.total;
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
      await (quotation?quotationsApi.update.bind(null,quotation.id):quotationsApi.create)({
        customerId,
        customerName: customer.company,
        customerEmail: customer.email,
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        taxTotal: Math.round(taxTotal * 100) / 100,
        discountTotal: Math.round(discountTotal * 100) / 100,
        total: Math.round(total * 100) / 100,
        validityDate,
        status,
        notes,
      });
      showToast('success', 'Quotation saved', `Quote for ${customer.company} created.`);
      onSuccess();
      onClose();
    } catch {
      showToast('error', 'Error', 'Failed to generate quotation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={quotation ? 'Edit Quotation Proposal' : 'Configure New Quotation (CPQ)'}
      description="Configure line items, select subscription tiers, apply discounts, and generate binding proposal"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {previewError&&<p role="alert" className="text-red-600">{previewError}</p>}
        {/* Customer & Expiration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Recipient Customer <span className="text-rose-500">*</span>
            </label>
            <select aria-label="Recipient Customer"
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
            <label className="block text-slate-700 font-semibold mb-1">Validity Expiration Date</label>
            <input aria-label="Validity Expiration Date"
              type="date"
              value={validityDate}
              onChange={(e) => setValidityDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Initial Status</label>
            <select aria-label="Initial Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Quotation['status'])}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none"
            >

              <option value="Draft">Draft (Internal review)</option>

            </select>
          </div>
        </div>

        {/* Dynamic Line Items Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-800 text-xs">Line Items & Subscription Plans</span>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 rounded-md"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {items.map((item,index) => (
              <div
                key={item.id}
                className="p-3 bg-white border border-slate-200 rounded-lg grid grid-cols-12 gap-2 items-center"
              >
                {/* Product Select */}
                <div className="col-span-3">
                  <label className="text-[10px] text-slate-400 block">Product</label>
                  <select aria-label="Product"
                    value={item.productId}
                    onChange={(e) => handleProductChange(item.id, e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs truncate"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plan Select */}
                <div className="col-span-3">
                  <label className="text-[10px] text-slate-400 block">Plan</label>
                  <select aria-label="Plan"
                    value={item.planId}
                    onChange={(e) => handlePlanChange(item.id, e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs truncate"
                  >
                    {plans
                      .filter((pl) => pl.productId === item.productId)
                      .map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name} ({formatMoney(pl.price,pl.currency)})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 block">Quantity</label>
                  <input aria-label="Quantity"
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemFieldChange(item.id, 'quantity', parseInt(e.target.value, 10) || 1)
                    }
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-center font-semibold"
                  />
                </div>

                {/* Discount */}
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 block">Discount (%)</label>
                  <input aria-label="Discount (%)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.discount}
                    onChange={(e) =>
                      handleItemFieldChange(item.id, 'discount', parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-center"
                  />
                </div>

                <label className="col-span-3 text-xs">Unit price<input aria-label="Quotation unit price" className="w-full border rounded p-2" type="number" min="0" step="0.01" value={item.unitPrice} onChange={e=>handleItemFieldChange(item.id,'unitPrice',Number(e.target.value))}/></label><label className="col-span-3 text-xs">GST rate (%)<input aria-label="GST rate (%)" className="w-full border rounded p-2" type="number" min="0" max="100" step="0.01" value={item.taxRate} onChange={e=>handleItemFieldChange(item.id,'taxRate',Number(e.target.value))}/></label>
                {/* Subtotal & Delete */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Subtotal</span>
                    <span className="font-bold text-slate-900">{formatMoney(serverPreview?.lines[index]?.lineTotal??item.subtotal,serverPreview?.currency||customers.find(c=>c.id===customerId)?.currency)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calculation Summary Bar */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex-1">
            <label className="block text-slate-700 font-semibold mb-1">Proposal Terms & Notes</label>
            <textarea aria-label="Proposal Terms & Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Custom SLA terms, payment conditions, or executive discount approvals..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-xs outline-none"
            />
          </div>

          <div className="w-full sm:w-56 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Gross Total:</span>
              <span className="font-medium">{formatMoney(subtotal,'INR')}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discounts:</span>
                <span className="font-medium">-{formatMoney(discountTotal,'INR')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Configured GST:</span>
              <span className="font-medium">{formatMoney(taxTotal,'INR')}</span>
            </div>
            {serverPreview?.gst&&<p className="text-xs text-slate-500">{serverPreview.gst.mode==='IGST'?'IGST':'CGST + SGST'} ? {serverPreview.gst.placeOfSupplyName}</p>}
            <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-bold text-slate-900">
              <span>Proposal Total:</span>
              <span className="text-blue-600">{formatMoney(total,'INR')}</span>
            </div>
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
            disabled={isLoading||previewBusy||!!previewError||!serverPreview}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors"
          >
            {isLoading ? 'Processing...' : 'Issue Quotation'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
