import {ListPager} from '../../components/common/ListPager';
import {TemplateTools} from '../../components/common/Operations';
import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Repeat,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { quotationsApi, subscriptionsApi, invoicesApi } from '../../services/api';
import { Quotation, QuotationStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QuotationFormModal } from './QuotationFormModal';
import { QuotationDetailPage } from './QuotationDetailPage';
import { useToast } from '../../context/ToastContext';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';

export const QuotationListPage: React.FC = () => {
  const { showToast } = useToast();
  const { role, user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [page,setPage]=useState(1),[total,setTotal]=useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  const loadQuotations = async () => {
    setIsLoading(true);
    try {
      const res = await quotationsApi.getAll(page);
      setTotal(res.total);
      if (role === 'customer') {
        const custId = user?.customerId || 'cust-1';
        setQuotations(res.data.filter((q) => q.customerId === custId));
      } else {
        setQuotations(res.data);
      }
    } catch {
      showToast('error', 'Error', 'Failed to load quotations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, [role, user,page]);

  const handleQuickConvert = async (quote: Quotation) => {
    try {
      await quotationsApi.convert(quote.id);
      showToast('success','Subscription created','Generate the first invoice through recurring billing.');
      loadQuotations();
    } catch {
      showToast('error', 'Conversion Failed', 'Could not convert quotation.');
    }
  };

  const filteredQuotes = quotations.filter((q) => {
    const matchesSearch =
      q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || q.status.toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  if (selectedQuotation) {
    return (
      <QuotationDetailPage
        quotation={selectedQuotation}
        onBack={() => setSelectedQuotation(null)}
        onRefresh={() => {
          loadQuotations();
          setSelectedQuotation(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ListPager page={page} total={total} onChange={setPage}/>
      {role !== 'customer' && <TemplateTools onRefresh={loadQuotations}/>}
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {role === 'customer' ? 'My Quotations & Proposals' : 'Quotation Management (CPQ)'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure custom subscription proposals, calculate taxes, discounts, and convert to active subscriptions
          </p>
        </div>

        {role !== 'customer' && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quotation</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by quote # or customer..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-blue-600 text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="SENT">Sent</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="DRAFT">Draft</option>
            <option value="DECLINED">Declined</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Quotation Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filteredQuotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Quotations Found"
          description="Create customized enterprise proposals to initiate subscriber agreements."
          actionLabel={role !== 'customer' ? 'Create Quotation' : undefined}
          onAction={role !== 'customer' ? () => setIsFormOpen(true) : undefined}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-4">Customer Account</th>
                  <th className="py-3 px-4">Quoted Line Items</th>
                  <th className="py-3 px-4">Validity Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                      {q.quotationNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{q.customerName}</td>
                    <td className="py-3.5 px-4">
                      <p className="text-slate-700 truncate max-w-xs">
                        {q.items.map((it) => `${it.productName} (${it.quantity})`).join(', ')}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{q.validityDate}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">${q.total.toFixed(2)}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={q.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedQuotation(q)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-md font-semibold text-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {role !== 'customer' && q.status === 'Accepted' && (
                          <button
                            onClick={() => handleQuickConvert(q)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md font-semibold text-xs transition-colors"
                            title="Convert to Active Subscription"
                          >
                            <Repeat className="w-3.5 h-3.5" />
                            <span>Convert</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quotation Form Modal */}
      <QuotationFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadQuotations}
      />
    </div>
  );
};
