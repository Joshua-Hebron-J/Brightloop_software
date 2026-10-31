import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Plan, Product, BillingFrequency } from '../../types';
import { plansApi, productsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, X, Layers } from 'lucide-react';

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: Plan | null;
  onSuccess: () => void;
}

export const PlanFormModal: React.FC<PlanFormModalProps> = ({
  isOpen,
  onClose,
  plan,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const[currency,setCurrency]=useState('INR'),[trial,setTrial]=useState('0'),[setup,setSetup]=useState('0');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState('');
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('monthly');
  const [price, setPrice] = useState('49.00');
  const [minimumQuantity, setMinimumQuantity] = useState('1');
  const [availabilityStartDate, setAvailabilityStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [availabilityEndDate, setAvailabilityEndDate] = useState('');
  const[allowClose,setAllowClose]=useState(true),[autoClose,setAutoClose]=useState(false);
  const [allowPause, setAllowPause] = useState(true);
  const [maxPauseDays, setMaxPauseDays] = useState('30');
  const [autoRenew, setAutoRenew] = useState(true);
  const [gracePeriodDays, setGracePeriodDays] = useState('7');
  const [status, setStatus] = useState<Plan['status']>('Active');
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await productsApi.getAll();
        setProducts(res.data);
        if (res.data.length > 0 && !productId) {
          setProductId(res.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchProducts();
  }, [isOpen]);

  useEffect(() => {
    if (plan) {
      setAllowClose((plan as any).allowClose??true);setAutoClose((plan as any).autoClose??false);
      setCurrency(plan.currency||'USD');setTrial(String((plan as any).trialPeriodDays||0));setSetup(String((plan as any).setupFee||0));
      setName(plan.name);
      setDescription(plan.description);
      setProductId(plan.productId);
      setBillingFrequency(plan.billingFrequency);
      setPrice(plan.price.toString());
      setMinimumQuantity(plan.minimumQuantity.toString());
      setAvailabilityStartDate(plan.availabilityStartDate);
      setAvailabilityEndDate(plan.availabilityEndDate || '');
      setAllowPause(plan.pauseSettings?.allowPause ?? true);
      setMaxPauseDays((plan.pauseSettings?.maxPauseDays ?? 30).toString());
      setAutoRenew(plan.renewalSettings?.autoRenew ?? true);
      setGracePeriodDays((plan.renewalSettings?.gracePeriodDays ?? 7).toString());
      setStatus(plan.status);
      setFeatures(plan.features || []);
    } else {
      setName('');
      setDescription('');
      setBillingFrequency('monthly');
      setPrice('49.00');
      setMinimumQuantity('1');
      setAvailabilityStartDate(new Date().toISOString().split('T')[0]);
      setAvailabilityEndDate('');
      setAllowPause(true);
      setMaxPauseDays('30');
      setAutoRenew(true);
      setGracePeriodDays('7');
      setStatus('Active');
      setFeatures(['Automated recurring billing', 'Real-time telemetry', 'Priority email support']);
    }
  }, [plan, isOpen]);

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    setFeatures([...features, newFeature.trim()]);
    setNewFeature('');
  };

  const handleRemoveFeature = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Validation Error', 'Plan Name is required.');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      showToast('error', 'Validation Error', 'Please enter a valid price.');
      return;
    }

    const selectedProduct = products.find((p) => p.id === productId);

    setIsLoading(true);
    try {
      const planPayload = {
        name,
        allowClose,autoClose,currency,trialPeriodDays:Number(trial),setupFee:Number(setup),
        description,
        productId,
        productName: selectedProduct?.name || 'Brightloop Cloud Engine',
        billingFrequency,
        price: numPrice,
        minimumQuantity: parseInt(minimumQuantity, 10) || 1,
        availabilityStartDate,
        availabilityEndDate: availabilityEndDate || undefined,
        pauseSettings: {
          allowPause,
          maxPauseDays: parseInt(maxPauseDays, 10) || 0,
        },
        renewalSettings: {
          autoRenew,
          gracePeriodDays: parseInt(gracePeriodDays, 10) || 0,
        },
        status,
        features,
      };

      if (plan) {
        await plansApi.update(plan.id, planPayload);
        showToast('success', 'Plan Updated', `${name} plan updated.`);
      } else {
        await plansApi.create(planPayload);
        showToast('success', 'Plan Created', `${name} subscription plan created.`);
      }
      onSuccess();
      onClose();
    } catch {
      showToast('error', 'Operation Failed', 'Could not save subscription plan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={plan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
      description="Configure billing cadences (Daily/Weekly/Monthly/Yearly), pricing and lifecycle policies"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="flex gap-6"><label><input type="checkbox" checked={allowClose} onChange={e=>setAllowClose(e.target.checked)}/> Allow early closure</label><label><input type="checkbox" checked={autoClose} onChange={e=>setAutoClose(e.target.checked)}/> Close automatically at expiry</label></div>
        <div className="grid sm:grid-cols-3 gap-3"><label>Plan currency<select aria-label="Plan currency" className="block border rounded-lg p-2" value={currency} onChange={e=>setCurrency(e.target.value)}><option>INR</option><option>USD</option></select></label><label>Trial days<input aria-label="Trial days" className="block border rounded-lg p-2" type="number" min="0" value={trial} onChange={e=>setTrial(e.target.value)}/></label><label>Setup fee<input aria-label="Setup fee" className="block border rounded-lg p-2" type="number" min="0" step="0.01" value={setup} onChange={e=>setSetup(e.target.value)}/></label></div>
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Plan Name <span className="text-rose-500">*</span>
            </label>
            <input aria-label="Plan name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Professional Monthly"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Target Product <span className="text-rose-500">*</span>
            </label>
            <select aria-label="Target Product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-xs bg-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">Plan Description</label>
          <textarea aria-label="Plan Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Plan description, targeted segment or license terms..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-xs"
          />
        </div>

        {/* Pricing & Billing Cadence */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Billing Frequency</label>
            <select aria-label="Billing Frequency"
              value={billingFrequency}
              onChange={(e) => setBillingFrequency(e.target.value as BillingFrequency)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white capitalize"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Price per Interval (currency)</label>
            <input aria-label="Price per Interval (currency)"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Minimum Quantity</label>
            <input aria-label="Minimum Quantity"
              type="number"
              min="1"
              value={minimumQuantity}
              onChange={(e) => setMinimumQuantity(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white"
            />
          </div>
        </div>

        {/* Availability Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Availability Start Date</label>
            <input aria-label="Availability Start Date"
              type="date"
              value={availabilityStartDate}
              onChange={(e) => setAvailabilityStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Availability End Date (Optional)</label>
            <input aria-label="Availability End Date (Optional)"
              type="date"
              value={availabilityEndDate}
              onChange={(e) => setAvailabilityEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
            />
          </div>
        </div>

        {/* Pause & Renewal Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
          {/* Pause Settings */}
          <div>
            <span className="font-bold text-slate-900 block mb-2">Pause Settings</span>
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPause}
                onChange={(e) => setAllowPause(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-slate-700 font-medium">Allow Customer Pause</span>
            </label>
          </div>

          {/* Renewal Settings */}
          <div>
            <span className="font-bold text-slate-900 block mb-2">Renewal Settings</span>
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-slate-700 font-medium">Auto-Renew Default</span>
            </label>
            
          </div>
        </div>

        {/* Feature bullets */}
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Plan Entitlements / Features</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="e.g. 50k API calls, Dedicated support"
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddFeature();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddFeature}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {features.map((feat, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs border border-slate-200"
              >
                <span>{feat}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(idx)}
                  className="text-slate-400 hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors"
          >
            {isLoading ? 'Saving...' : plan ? 'Update Plan' : 'Save Plan'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
