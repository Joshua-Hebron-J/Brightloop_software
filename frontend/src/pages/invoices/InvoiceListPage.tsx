import {ListPager} from '../../components/common/ListPager';

import React, { useEffect, useState } from 'react';

import {

  Receipt,

  Plus,

  Search,

  Filter,

  Eye,

  Download,

  CreditCard,

  Zap,

  Printer,

} from 'lucide-react';

import { invoicesApi, subscriptionsApi } from '../../services/api';

import { Invoice, Subscription } from '../../types';

import { StatusBadge } from '../../components/common/StatusBadge';

import { InvoiceFormModal } from './InvoiceFormModal';

import { InvoicePrintModal } from '../../components/invoice/InvoicePrintModal';

import { BulkInvoiceModal } from '../../components/invoice/BulkInvoiceModal';

import { useToast } from '../../context/ToastContext';

import { EmptyState } from '../../components/common/EmptyState';

import { useAuth } from '../../context/AuthContext';

interface InvoiceListPageProps {

  onRecordPaymentForInvoice?: (invoice: Invoice) => void;

}

export const InvoiceListPage: React.FC<InvoiceListPageProps> = ({

  onRecordPaymentForInvoice,

}) => {

  const { showToast } = useToast();

  const { role, user } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [page,setPage]=useState(1),[total,setTotal]=useState(0);

  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');

  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);

  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  const loadData = async () => {

    setIsLoading(true);

    try {

      const [invRes, subRes] = await Promise.all([

        invoicesApi.getAll(page),

        subscriptionsApi.getAll(),

      ]);

      setTotal(invRes.total);

      if (role === 'customer') {

        const custId = user?.customerId || 'cust-1';

        setInvoices(invRes.data.filter((i) => i.customerId === custId));

      } else {

        setInvoices(invRes.data);

      }

      setSubscriptions(subRes.data);

    } catch {

      showToast('error', 'Error', 'Failed to load invoices');

    } finally {

      setIsLoading(false);

    }

  };

  useEffect(() => {

    loadData();

  }, [role, user,page]);

  const handleMarkPaid = (inv:Invoice) => onRecordPaymentForInvoice?.(inv);

  const filteredInvoices = invoices.filter((inv) => {

    const matchesSearch =

      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||

      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || inv.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;

  });

  return (

    <div className="space-y-6">

      <ListPager page={page} total={total} onChange={setPage}/>

      {/* Header & Actions */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>

          <h2 className="text-xl font-bold text-slate-900 tracking-tight">

            {role === 'customer' ? 'My Billing & Invoices' : 'Invoice Management & Recurring Billing'}

          </h2>

          <p className="text-xs text-slate-500 mt-0.5">

            Compliant tax invoice generation, automated batch schedules, and PDF print formatting

          </p>

        </div>

        {role !== 'customer' && (

          <div className="flex items-center gap-2">

            <button

              onClick={() => setIsBulkOpen(true)}

              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"

            >

              <Zap className="w-3.5 h-3.5 text-blue-600" />

              <span>Bulk Generate</span>

            </button>

            <button

              onClick={() => setIsFormOpen(true)}

              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"

            >

              <Plus className="w-4 h-4" />

              <span>Create Invoice</span>

            </button>

          </div>

        )}

      </div>

      {role!=='customer' && <div className="bg-white border rounded-xl p-4 space-y-2"><h3 className="font-semibold">Invoice actions</h3>{invoices.filter(i=>i.status!=='Paid'&&i.status!=='Cancelled').slice(0,10).map(i=><div className="flex flex-wrap items-center gap-3 text-sm" key={i.id}><span>{i.invoiceNumber} Â· {i.status}</span>{i.status==='Draft'&&<button className="text-blue-600" onClick={async()=>{try{await invoicesApi.updateStatus(i.id,'Confirmed');loadData()}catch(e){showToast('error','Confirm failed',String(e))}}}>Confirm</button>}<button className="text-blue-600" onClick={async()=>{try{const r=await invoicesApi.send(i.id);showToast('info','Invoice email',r.delivered?'Accepted by email provider':'Queued in local demo outbox')}catch(e){showToast('error','Send failed',String(e))}}}>Send</button><button className="text-rose-600" onClick={async()=>{if(!confirm('Cancel this invoice?'))return;try{await invoicesApi.updateStatus(i.id,'Cancelled');loadData()}catch(e){showToast('error','Cancel failed',String(e))}}}>Cancel</button></div>)}</div>}

      {/* Search and Filters */}

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">

        <div className="relative w-full sm:w-80">

          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

          <input

            type="text"

            value={searchQuery}

            onChange={(e) => setSearchQuery(e.target.value)}

            placeholder="Search by invoice # or customer..."

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

            <option value="ALL">All Payment Statuses</option>

            <option value="PAID">Paid</option>

            <option value="CONFIRMED">Confirmed (Unpaid)</option>

            <option value="DRAFT">Draft</option>

          </select>

        </div>

      </div>

      {/* Invoices Table */}

      {isLoading ? (

        <div className="flex items-center justify-center min-h-[300px]">

          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />

        </div>

      ) : filteredInvoices.length === 0 ? (

        <EmptyState

          icon={Receipt}

          title="No Invoices Found"

          description="Invoices are issued automatically on recurring billing dates or generated manually."

          actionLabel={role !== 'customer' ? 'Create Invoice' : undefined}

          onAction={role !== 'customer' ? () => setIsFormOpen(true) : undefined}

        />

      ) : (

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full text-xs text-left">

              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">

                <tr>

                  <th className="py-3 px-4">Invoice #</th>

                  <th className="py-3 px-4">Customer Account</th>

                  <th className="py-3 px-4">Issue Date</th>

                  <th className="py-3 px-4">Due Date</th>

                  <th className="py-3 px-4">Tax (18%)</th>

                  <th className="py-3 px-4">Total Amount</th>

                  <th className="py-3 px-4">Status</th>

                  <th className="py-3 px-4 text-right">Actions</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredInvoices.map((inv) => (

                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">

                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">

                      {inv.invoiceNumber}

                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">{inv.customerName}</td>

                    <td className="py-3.5 px-4 text-slate-600">{inv.invoiceDate}</td>

                    <td className="py-3.5 px-4 text-slate-600">{inv.dueDate}</td>

                    <td className="py-3.5 px-4 text-slate-600">${inv.taxTotal.toFixed(2)}</td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">

                      ${inv.totalAmount.toFixed(2)}

                    </td>

                    <td className="py-3.5 px-4">

                      <StatusBadge status={inv.status} size="sm" />

                    </td>

                    <td className="py-3.5 px-4 text-right">

                      <div className="inline-flex items-center gap-1.5">

                        <button

                          onClick={() => setPrintingInvoice(inv)}

                          className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-md font-semibold text-xs transition-colors"

                          title="View / Print Tax Invoice"

                        >

                          <Printer className="w-3.5 h-3.5" />

                          <span>View PDF</span>

                        </button>

                        {role !== 'customer' && ['Confirmed','Partial'].includes(inv.status) && (

                          <button

                            onClick={() => {

                              if (onRecordPaymentForInvoice) {

                                onRecordPaymentForInvoice(inv);

                              } else {

                                handleMarkPaid(inv);

                              }

                            }}

                            className="inline-flex items-center gap-1 px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md font-semibold text-xs transition-colors"

                            title="Collect / Record Payment"

                          >

                            <CreditCard className="w-3.5 h-3.5" />

                            <span>Collect</span>

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

      {/* Invoice Form Modal */}

      <InvoiceFormModal

        isOpen={isFormOpen}

        onClose={() => setIsFormOpen(false)}

        onSuccess={loadData}

      />

      {/* Bulk Invoicing Modal */}

      <BulkInvoiceModal

        isOpen={isBulkOpen}

        onClose={() => setIsBulkOpen(false)}

        subscriptions={subscriptions}

        onSuccess={loadData}

      />

      {/* Print / Download Modal */}

      {printingInvoice && (

        <InvoicePrintModal

          isOpen={!!printingInvoice}

          onClose={() => setPrintingInvoice(null)}

          invoice={printingInvoice}

        />

      )}

    </div>

  );

};
