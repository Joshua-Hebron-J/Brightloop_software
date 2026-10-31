import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStyles = (s: string) => {
    const normalized = s.toLowerCase();
    switch (normalized) {
      case 'active':
      case 'paid':
      case 'completed':
      case 'accepted':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20';
      case 'confirmed':
      case 'sent':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20';
      case 'draft':
      case 'quotation':
      case 'pending':
        return 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/20';
      case 'paused':
      case 'suspended':
      case 'inactive':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20';
      case 'closed':
      case 'declined':
      case 'failed':
      case 'archived':
      case 'expired':
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/20';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ring-1 ring-inset ${getStyles(
        status
      )} ${sizeClasses}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          ['active', 'paid', 'completed', 'accepted'].includes(status.toLowerCase())
            ? 'bg-emerald-500'
            : ['confirmed', 'sent'].includes(status.toLowerCase())
            ? 'bg-blue-500'
            : ['paused', 'suspended', 'inactive'].includes(status.toLowerCase())
            ? 'bg-amber-500'
            : ['closed', 'declined', 'failed', 'archived', 'expired'].includes(status.toLowerCase())
            ? 'bg-rose-500'
            : 'bg-slate-400'
        }`}
      />
      {status}
    </span>
  );
};
