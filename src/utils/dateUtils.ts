import { BillingFrequency } from '../../shared/types';

export function addBillingPeriod(startDate: Date, frequency: BillingFrequency): Date {
  const next = new Date(startDate.getTime());

  switch (frequency) {
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'SEMI_ANNUALLY':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'ANNUALLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
      break;
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
  const randomPart = Math.random().toString(36).substring(2, 9);
  const timePart = Date.now().toString(36);
  return `${prefix}_${timePart}${randomPart}`;
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
