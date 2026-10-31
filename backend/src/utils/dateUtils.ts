import { randomUUID } from 'node:crypto';
import { BillingFrequency } from '../../shared/types';

export function addBillingPeriod(startDate: Date, frequency: BillingFrequency): Date {
  const next = new Date(startDate.getTime());

  if (frequency === 'DAILY' || frequency === 'WEEKLY') {
    next.setUTCDate(next.getUTCDate() + (frequency === 'DAILY' ? 1 : 7));
  } else {
    const months = { MONTHLY: 1, QUARTERLY: 3, SEMI_ANNUALLY: 6, ANNUALLY: 12 }[frequency];
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + months);
    const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth()+1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, last));
  }

  return next;
}

export function calculateProration(
  periodStart: Date,
  periodEnd: Date,
  changeDate: Date,
  oldPrice: number,
  newPrice: number
): {
  daysTotal: number;
  daysRemaining: number;
  unusedCredit: number;
  proratedCharge: number;
  netProration: number;
} {
  const totalMs = Math.max(1, periodEnd.getTime() - periodStart.getTime());
  const remainingMs = Math.max(0, periodEnd.getTime() - changeDate.getTime());
  const ratio = Math.min(1, Math.max(0, remainingMs / totalMs));

  const daysTotal = Math.round(totalMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.round(remainingMs / (1000 * 60 * 60 * 24));

  const unusedCredit = Number((oldPrice * ratio).toFixed(2));
  const proratedCharge = Number((newPrice * ratio).toFixed(2));
  const netProration = Number((proratedCharge - unusedCredit).toFixed(2));

  return {
    daysTotal,
    daysRemaining,
    unusedCredit,
    proratedCharge,
    netProration,
  };
}

export function generateId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function generateFormattedNumber(prefix: string): string {
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${year}-${randomDigits}`;
}

export function generateBillingCycleKey(subscriptionId: string, periodStart: string, periodEnd: string): string {
  const startDay = periodStart.substring(0, 10);
  const endDay = periodEnd.substring(0, 10);
  return `cycle:${subscriptionId}:${startDay}:${endDay}`;
}
