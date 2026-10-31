import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Customer } from '../../types';
import { customersApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSuccess: () => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [status, setStatus] = useState<Customer['status']>('Active');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setCompany(customer.company);
      setEmail(customer.email);
      setPhone(customer.phone);
      setAddress(customer.address);
      setTaxId(customer.taxId);
      setCurrency(customer.currency || 'USD');
      setStatus(customer.status);
    } else {
      setName('');
      setCompany('');
      setEmail('');
      setPhone('+1 (555) ');
      setAddress('');
      setTaxId(`US-EIN-${Math.floor(10000000 + Math.random() * 90000000)}`);
      setCurrency('USD');
      setStatus('Active');
    }
  }, [customer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !company.trim()) {
      showToast('error', 'Validation Error', 'Contact Name, Company, and Email are required.');
      return;
    }

    setIsLoading(true);
    try {
      if (customer) {
        await customersApi.update(customer.id, {
          name,
          company,
          email,
          phone,
          address,
          taxId,
          currency,
          status,
        });
        showToast('success', 'Customer Updated', `${company} profile updated.`);
      } else {
        await customersApi.create({
          name,
          company,
          email,
          phone,
          address,
          taxId,
          currency,
          status,
        });
        showToast('success', 'Customer Registered', `${company} added to customer directory.`);
      }
      onSuccess();
      onClose();
    } catch {
      showToast('error', 'Error', 'Failed to save customer account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? 'Edit Customer Profile' : 'Add New Customer'}
      description="Register subscriber organization details, billing address, and tax identification"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Contact Person <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Connor"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Company / Account Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Work Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@acmecorp.com"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 234-5678"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">Billing Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="100 Silicon Way, Suite 400, San Jose, CA 95112"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Tax ID / GSTIN</label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="US-EIN-94827104"
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg outline-none font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg outline-none bg-white"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Account Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Customer['status'])}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg outline-none bg-white"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
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
            {isLoading ? 'Saving...' : customer ? 'Update Profile' : 'Add Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
