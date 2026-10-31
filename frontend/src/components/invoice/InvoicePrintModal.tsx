import React from 'react';
import { Modal } from '../common/Modal';
import { Invoice } from '../../types';
import { Printer, Download, Zap, CheckCircle2, Clock } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Tax Invoice — ${invoice.invoiceNumber}`} maxWidth="3xl">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 print:hidden">
        <div className="flex items-center gap-2">
          <StatusBadge status={invoice.status} />
          <span className="text-xs text-slate-500">Brightloop demo billing document</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div id="printable-invoice" className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 text-slate-900">
        {/* Header: Company & Invoice Metadata */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Brightloop Software
              </span>
            </div>
            <p className="text-xs text-slate-500">100 Innovation Way, Suite 700</p>
            <p className="text-xs text-slate-500">San Francisco, CA 94105, USA</p>
            <p className="text-xs text-slate-500">Tax Registration ID: US-EIN-94827104</p>
            <p className="text-xs text-slate-500">billing@brightloopsoftware.com</p>
          </div>

          <div className="sm:text-right">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase">
              TAX INVOICE
            </h2>
            <p className="text-sm font-bold text-blue-600 mt-1">{invoice.invoiceNumber}</p>
            <div className="mt-2 text-xs text-slate-600 space-y-0.5">
              <p>
                <span className="text-slate-400">Invoice Date:</span>{' '}
                <span className="font-medium text-slate-800">{invoice.invoiceDate}</span>
              </p>
              <p>
                <span className="text-slate-400">Payment Due:</span>{' '}
                <span className="font-medium text-slate-800">{invoice.dueDate}</span>
              </p>
              {invoice.paymentDate && (
                <p>
                  <span className="text-slate-400">Paid On:</span>{' '}
                  <span className="font-semibold text-emerald-600">{invoice.paymentDate}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Customer Information (Bill To) */}
        <div className="py-5 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Bill To
            </span>
            <h4 className="text-sm font-bold text-slate-900 mt-1">{invoice.customerName}</h4>
            <p className="text-xs text-slate-600 mt-0.5">{invoice.customerEmail}</p>
            {invoice.customerAddress && (
              <p className="text-xs text-slate-500 mt-0.5 max-w-xs">{invoice.customerAddress}</p>
            )}
            {invoice.customerTaxId && (
              <p className="text-xs text-slate-500 mt-0.5">Tax ID: {invoice.customerTaxId}</p>
            )}
          </div>

          <div className="sm:text-right flex flex-col sm:items-end justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase">
              {invoice.status === 'Paid' ? (
                <span className="text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  PAID IN FULL
                </span>
              ) : (
                <span className="text-amber-700 bg-amber-50 border-amber-200 flex items-center gap-1 px-2 py-0.5 rounded">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  PAYMENT PENDING
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-5">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="pb-2.5">Item Description</th>
                <th className="pb-2.5 text-center">Qty</th>
                <th className="pb-2.5 text-right">Unit Price</th>
                <th className="pb-2.5 text-right">Tax</th>
                <th className="pb-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3">
                    <p className="font-semibold text-slate-900">{item.description}</p>
                  </td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right">${item.unitPrice.toFixed(2)}</td>
                  <td className="py-3 text-right">{item.taxRate}%</td>
                  <td className="py-3 text-right font-bold text-slate-900">
                    ${item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculations / Summary */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
          <div className="text-xs text-slate-500 max-w-sm">
            <span className="font-semibold text-slate-700">Payment Terms & Notes:</span>
            <p className="mt-1">
              {invoice.notes || 'Payment is due within 15 days of invoice date. Thank you for your business!'}
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span className="font-medium">-${invoice.discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Tax (GST/VAT 18%):</span>
              <span className="font-medium">${invoice.taxTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
              <span>Total Due:</span>
              <span className="text-blue-600">${invoice.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1">
              <span>Amount Paid:</span>
              <span className="font-semibold text-emerald-600">${invoice.paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-100">
              <span>Balance Due:</span>
              <span className={invoice.totalAmount - invoice.paidAmount > 0 ? 'text-rose-600' : 'text-slate-900'}>
                ${(invoice.totalAmount - invoice.paidAmount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
