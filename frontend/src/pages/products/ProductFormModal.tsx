import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Product, ProductVariant } from '../../types';
import { productsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, Tag } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSuccess: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('SaaS Platform');
  const [costPrice,setCostPrice]=useState('0');
  const [productType,setProductType]=useState('Software');
  const [price, setPrice] = useState('49.00');
  const [status, setStatus] = useState<Product['status']>('Active');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setCostPrice(String((product as any).costPrice||0));setProductType((product as any).productType||'Software');
      setName(product.name);
      setDescription(product.description);
      setCode(product.code);
      setCategory(product.category || 'SaaS Platform');
      setPrice(product.price.toString());
      setStatus(product.status);
      setVariants(product.variants || []);
    } else {
      setName('');
      setDescription('');
      setCode(`PRD-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategory('SaaS Platform');
      setPrice('49.00');
      setStatus('Active');
      setVariants([
        { id: `var-${Date.now()}-1`, name: 'Standard Edition', sku: 'STD-01', price: 49.00, description: 'Core feature set' },
      ]);
    }
  }, [product, isOpen]);

  const handleAddVariant = () => {
    const count = variants.length + 1;
    const newVariant: ProductVariant = {
      id: `var-${Date.now()}-${count}`,
      name: `Tier ${count}`,
      sku: `${code || 'PRD'}-T${count}`,
      price: parseFloat(price) || 49.00,
      description: 'Extended capacity tier',
    };
    setVariants([...variants, newVariant]);
  };

  const handleRemoveVariant = (id: string) => {
    setVariants(variants.filter((v) => v.id !== id));
  };

  const handleVariantChange = (id: string, field: keyof ProductVariant, val: string | number) => {
    setVariants(
      variants.map((v) => (v.id === id ? { ...v, [field]: val } : v))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      showToast('error', 'Validation Error', 'Product Name and SKU Code are required.');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      showToast('error', 'Validation Error', 'Please enter a valid base price.');
      return;
    }

    setIsLoading(true);
    try {
      if (product) {
        await productsApi.update(product.id, {
          name,
          description,
          code,
          category,
          price: numPrice,
          costPrice:Number(costPrice),productType,
          status,
          variants,
        });
        showToast('success', 'Product Updated', `${name} has been updated.`);
      } else {
        await productsApi.create({
          name,
          description,
          code,
          category,
          price: numPrice,
          costPrice:Number(costPrice),productType,
          status,
          variants,
        });
        showToast('success', 'Product Created', `${name} has been registered.`);
      }
      onSuccess();
      onClose();
    } catch {
      showToast('error', 'Operation Failed', 'Could not save product.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add New Product'}
      description="Define product details, SKU codes, pricing, and variant tiers"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="flex gap-3"><label>Product type<input aria-label="Product type" className="border rounded-lg p-2" value={productType} onChange={e=>setProductType(e.target.value)} required/></label><label>Cost price<input aria-label="Cost price" className="border rounded-lg p-2" type="number" min="0" step="0.01" value={costPrice} onChange={e=>setCostPrice(e.target.value)} required/></label></div>
        {variants.map(v=><label key={'extra-'+v.id} className="block">{v.name}: additional variant price<input aria-label={v.name+' additional price'} className="border rounded-lg p-2 ml-2" type="number" min="0" step="0.01" value={(v as any).priceExtra||0} onChange={e=>handleVariantChange(v.id,'priceExtra' as any,Number(e.target.value))}/></label>)}
        {/* Basic Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BrightFlow Engine"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Product Code / SKU <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. BFC-ENTERPRISE"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none uppercase text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Brief overview of software capabilities..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-xs bg-white"
            >
              <option value="SaaS Platform">SaaS Platform</option>
              <option value="Developer Tools">Developer Tools</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Add-on Support">Add-on Support</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Base Price ($ USD) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="49.00"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Product['status'])}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-xs bg-white"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Product Variants & Variant Pricing */}
        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                Product Variants & Pricing
              </span>
              <p className="text-[11px] text-slate-500">Configure edition tiers, capacities and prices</p>
            </div>
            <button
              type="button"
              onClick={handleAddVariant}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Variant
            </button>
          </div>

          {variants.length === 0 ? (
            <p className="text-slate-400 italic text-[11px] py-2">No custom variants. Standard base pricing applies.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {variants.map((v) => (
                <div
                  key={v.id}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => handleVariantChange(v.id, 'name', e.target.value)}
                      placeholder="Variant Name"
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={v.sku}
                      onChange={(e) => handleVariantChange(v.id, 'sku', e.target.value.toUpperCase())}
                      placeholder="SKU"
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono uppercase"
                    />
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-2 top-1 text-slate-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={v.price}
                        onChange={(e) => handleVariantChange(v.id, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="Price"
                        className="w-full pl-5 pr-2 py-1 text-xs border border-slate-300 rounded bg-white font-semibold"
                      />
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(v.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2.5">
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
            {isLoading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
