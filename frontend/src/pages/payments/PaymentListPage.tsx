import {Modal} from '../../components/common/Modal';
import {formatMoney,formatDate} from '../../utils/format';
import {ListPager} from '../../components/common/ListPager';
import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { paymentsApi, invoicesApi } from '../../services/api';
import { Payment, Invoice, PaymentMethod } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RecordPaymentModal } from './RecordPaymentModal';
import { MetricCard } from '../../components/common/MetricCard';
import { useToast } from '../../context/ToastContext';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';

export const PaymentListPage: React.FC = () => {
  const { showToast } = useToast();
  const { role, user } = useAuth();
  const [ledgerAction,setLedgerAction]=useState<{kind:'refund'|'credit';id:string;label:string}|null>(null),[ledgerValue,setLedgerValue]=useState(''),[ledgerBusy,setLedgerBusy]=useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const[currencyFilter,setCurrencyFilter]=useState('INR');
  const [page,setPage]=useState(1),[total,setTotal]=useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [payRes, invRes] = await Promise.all([
        paymentsApi.getAll(page),
        invoicesApi.getAll(),
      ]);

      setTotal(payRes.total);
      if (role === 'customer') {
        const custId = user?.customerId || 'cust-1';
        setPayments(payRes.data.filter((p) => p.customerId === custId));
        setInvoices(invRes.data.filter((i) => i.customerId === custId));
      } else {
        setPayments(payRes.data.filter(p=>p.currency===currencyFilter));
        setInvoices(invRes.data.filter(i=>i.currency===currencyFilter));
      }
    } catch {
      showToast('error', 'Error', 'Failed to load payments and billing balances');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role, user,page,currencyFilter]);

  // 4 Mandatory Calculations:
  // - Paid Amount
  // - Unpaid Amount
  // - Overdue Amount
  // - Outstanding Balance
  const paidAmount = payments.filter(p=>p.status==='Completed'&&!p.referenceNumber.startsWith('credit_deduction_')).reduce((sum,p)=>sum+p.amount,0);
  const unpaidInvoices = invoices.filter(i=>['Confirmed','Partial'].includes(i.status));
  const unpaidAmount = unpaidInvoices.reduce(
    (sum, i) => sum + (i.totalAmount - i.paidAmount),
    0
  );
  const overdueAmount = unpaidInvoices
    .filter((i) => new Date(i.dueDate) < new Date())
    .reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);
  const outstandingBalance = unpaidAmount;

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.paymentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = methodFilter === 'ALL' || p.paymentMethod.toUpperCase() === methodFilter.toUpperCase();
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="space-y-6">
      {role!=='customer'&&<section className="bg-white border rounded-xl p-4 space-y-2"><h3 className="font-semibold">Reconciliation & credits</h3>{payments.filter(p=>p.status==='Completed'&&!p.referenceNumber.startsWith('credit_deduction_')).slice(0,8).map(p=><p key={p.id} className="text-sm flex justify-between gap-2"><span>{p.paymentNumber} · {p.referenceNumber} · {p.amount.toFixed(2)}</span><button className="text-rose-600" onClick={()=>{setLedgerValue('');setLedgerAction({kind:'refund',id:p.id,label:p.paymentNumber})}}>Record refund</button></p>)}{invoices.filter(i=>['Confirmed','Partial'].includes(i.status)).slice(0,8).map(i=><p key={i.id} className="flex justify-between text-sm"><span>{i.invoiceNumber} · Balance {(i.totalAmount-i.paidAmount).toFixed(2)}</span><button className="text-blue-600" onClick={()=>{setLedgerValue('');setLedgerAction({kind:'credit',id:i.id,label:i.invoiceNumber})}}>Apply customer credit</button></p>)}</section>}

      {role!=='customer'&&<label className="text-sm">Payment currency <select aria-label="Payment currency filter" className="border rounded-lg p-2" value={currencyFilter} onChange={e=>setCurrencyFilter(e.target.value)}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label>}
      <ListPager page={page} total={total} onChange={setPage}/>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {role === 'customer' ? 'My Payment Records' : 'Payment & Settlement Management'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track multi-channel transactions, gateway authorizations, credit settlements and outstanding balances
          </p>
        </div>

        {role !== 'customer' && (
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        )}
      </div>

      {/* 4 Mandatory Settlement Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Paid Amount"
          value={formatMoney(paidAmount,currencyFilter)}
          subtitle="Settled collections"
          icon={CheckCircle2}
          accentColor="emerald"
        />
        <MetricCard
          title="Unpaid Amount"
          value={formatMoney(unpaidAmount,currencyFilter)}
          subtitle="Issued billing awaiting payment"
          icon={Clock}
          accentColor="amber"
        />
        <MetricCard
          title="Overdue Amount"
          value={formatMoney(overdueAmount,currencyFilter)}
          subtitle="Past invoice due date"
          icon={AlertCircle}
          accentColor="rose"
        />
        <MetricCard
          title="Outstanding Balance"
          value={formatMoney(outstandingBalance,currencyFilter)}
          subtitle="Net receivable portfolio"
          icon={DollarSign}
          accentColor="indigo"
        />
      </div>

      {/* Search and Method Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by receipt #, customer, invoice or ref..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-blue-600 text-slate-700"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="CARD">Credit Card</option>
            <option value="UPI">UPI Instant</option>
            <option value="BANK TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash / Check</option>
          </select>
        </div>
      </div>

      {/* Payment Records Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filteredPayments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No Payment Records Found"
          description="Log invoice collections to reconcile accounts."
          actionLabel={role !== 'customer' ? 'Record Payment' : undefined}
          onAction={role !== 'customer' ? () => setIsRecordModalOpen(true) : undefined}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Payment #</th>
                  <th className="py-3 px-4">Customer Account</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reference #</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Settled Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                      {p.paymentNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{p.customerName}</td>
                    <td className="py-3.5 px-4 font-mono text-blue-600 font-medium">
                      {p.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {p.referenceNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{formatDate(p.paymentDate)}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">
                      {formatMoney(p.amount,p.currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={!!ledgerAction} onClose={()=>setLedgerAction(null)} title={ledgerAction?.kind==='refund'?'Record full refund':'Apply customer credit'}><form className="space-y-4" onSubmit={async e=>{e.preventDefault();if(!ledgerAction)return;setLedgerBusy(true);try{if(ledgerAction.kind==='refund')await paymentsApi.refund(ledgerAction.id,ledgerValue);else await paymentsApi.applyCredit(ledgerAction.id,Number(ledgerValue));await loadData();setLedgerAction(null);showToast('success','Ledger updated','The saved balances have been refreshed.')}catch(e){showToast('error','Ledger action failed',String(e))}finally{setLedgerBusy(false)}}}><p>{ledgerAction?.label}. This records bookkeeping only; no money is transferred.</p><label>{ledgerAction?.kind==='refund'?'Refund reason':'Credit amount'}<input aria-label={ledgerAction?.kind==='refund'?'Refund reason':'Credit amount'} className="block w-full border rounded-lg p-2" required type={ledgerAction?.kind==='refund'?'text':'number'} min="0.01" step="0.01" value={ledgerValue} onChange={e=>setLedgerValue(e.target.value)}/></label><button className="bg-blue-600 text-white rounded-lg px-4 py-2" disabled={ledgerBusy}>Save ledger action</button></form></Modal>
      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
