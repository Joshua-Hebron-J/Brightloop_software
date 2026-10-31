import { getDb } from '../../database/db';
import { DashboardMetrics, SubscriptionStatus } from '../../../shared/types';

export class AnalyticsService {
  static getDashboardMetrics(): DashboardMetrics {
    const db = getDb();
    const now = new Date();

    // 1. Calculate MRR & ARR from active subscriptions
    const activeSubs = db.prepare(`
      SELECT s.id, coalesce((SELECT sum(quantity*unit_price) FROM subscription_items WHERE subscription_id=s.id),p.price) price, p.billing_frequency
      FROM subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.status = 'ACTIVE'
    `).all() as any[];

    let mrr = 0;
    for (const sub of activeSubs) {
      let monthlyValue = 0;
      switch (sub.billing_frequency) {
        case 'DAILY':
          monthlyValue=sub.price*365/12;
          break;
        case 'WEEKLY':
          monthlyValue = sub.price * (52 / 12);
          break;
        case 'MONTHLY':
          monthlyValue = sub.price;
          break;
        case 'QUARTERLY':
          monthlyValue = sub.price / 3;
          break;
        case 'SEMI_ANNUALLY':
          monthlyValue = sub.price / 6;
          break;
        case 'ANNUALLY':
          monthlyValue = sub.price / 12;
          break;
        default:
          monthlyValue = sub.price;
      }
      mrr += monthlyValue;
    }
    mrr = Number(mrr.toFixed(2));
    const arr = Number((mrr * 12).toFixed(2));

    // 2. Counts
    const activeCountRow = db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'ACTIVE'").get() as any;
    const trialingCountRow = db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'TRIALING'").get() as any;
    const customersCountRow = db.prepare("SELECT COUNT(*) as c FROM customers WHERE status != 'ARCHIVED'").get() as any;

    const activeSubscriptionsCount = activeCountRow?.c || 0;
    const trialingSubscriptionsCount = trialingCountRow?.c || 0;
    const totalCustomersCount = customersCountRow?.c || 0;

    // 3. Accounts Receivable & AR Aging
    const openInvoices = db.prepare(`
      SELECT id, balance_due, due_date
      FROM invoices
      WHERE status IN ('OPEN', 'PARTIALLY_PAID') AND balance_due > 0
    `).all() as any[];

    let totalOutstandingAr = 0;
    const arAging = {
      current: 0,
      overdue30: 0,
      overdue60: 0,
      overdue90: 0,
    };

    const nowMs = now.getTime();
    for (const inv of openInvoices) {
      const balance = Number(inv.balance_due || 0);
      totalOutstandingAr += balance;

      const dueMs = new Date(inv.due_date).getTime();
      const diffDays = Math.floor((nowMs - dueMs) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        arAging.current += balance;
      } else if (diffDays <= 30) {
        arAging.overdue30 += balance;
      } else if (diffDays <= 60) {
        arAging.overdue60 += balance;
      } else {
        arAging.overdue90 += balance;
      }
    }

    totalOutstandingAr = Number(totalOutstandingAr.toFixed(2));
    arAging.current = Number(arAging.current.toFixed(2));
    arAging.overdue30 = Number(arAging.overdue30.toFixed(2));
    arAging.overdue60 = Number(arAging.overdue60.toFixed(2));
    arAging.overdue90 = Number(arAging.overdue90.toFixed(2));

    // 4. Revenue by Month (last 6 months from completed payments)
    const revenueRows = db.prepare(`
      SELECT substr(payment_date, 1, 7) as month, SUM(amount) as revenue
      FROM payments
      WHERE status = 'SUCCESS'
      GROUP BY substr(payment_date, 1, 7)
      ORDER BY month ASC
      LIMIT 6
    `).all() as any[];

    const revenueByMonth = revenueRows.map((r) => ({
      month: r.month,
      revenue: Number(Number(r.revenue || 0).toFixed(2)),
    }));

    // 5. Subscription Status Distribution
    const statusRows = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM subscriptions
      GROUP BY status
    `).all() as any[];

    const subscriptionStatusDistribution = statusRows.map((r) => ({
      status: r.status as SubscriptionStatus,
      count: Number(r.count || 0),
    }));

    // 6. Recent Activity Feed
    const recentPayments = db.prepare(`
      SELECT id, 'PAYMENT' as type, ('Received $' || amount || ' via ' || payment_method) as description, amount, payment_date as timestamp
      FROM payments
      ORDER BY payment_date DESC LIMIT 5
    `).all() as any[];

    const recentInvoices = db.prepare(`
      SELECT id, 'INVOICE' as type, ('Generated invoice ' || invoice_number || ' for $' || total_amount) as description, total_amount as amount, created_at as timestamp
      FROM invoices
      ORDER BY created_at DESC LIMIT 5
    `).all() as any[];

    const combinedActivity = [...recentPayments, ...recentInvoices]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      mrr,
      arr,
      activeSubscriptionsCount,
      trialingSubscriptionsCount,
      totalCustomersCount,
      totalOutstandingAr,
      arAging,
      revenueByMonth,
      subscriptionStatusDistribution,
      recentActivity: combinedActivity,
    };
  }
}
