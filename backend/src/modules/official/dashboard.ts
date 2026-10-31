import { getDb } from '../../database/db';
import { AnalyticsService } from '../analytics/analytics.service';
import { InvoicesService } from '../invoices/invoices.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PaymentsService } from '../payments/payments.service';
export function dashboard(query:any={}) {
 const db=getDb(),a=AnalyticsService.getDashboardMetrics(),now=new Date().toISOString();
 const from=query.from||'0000',to=query.to||'9999';
 const revenue:any=db.prepare("SELECT coalesce(sum(amount),0) total FROM payments WHERE status='SUCCESS' AND (transaction_reference IS NULL OR transaction_reference NOT LIKE 'credit_deduction_%') AND payment_date>=? AND payment_date<=?").get(from,to);
 const overdue:any=db.prepare("SELECT count(*) count,coalesce(sum(balance_due),0) total FROM invoices WHERE status IN ('OPEN','PARTIALLY_PAID') AND due_date<?").get(now);
 const payments:any[]=db.prepare("SELECT payment_method method,sum(amount) amount,count(*) count FROM payments WHERE status='SUCCESS' AND (transaction_reference IS NULL OR transaction_reference NOT LIKE 'credit_deduction_%') AND payment_date>=? AND payment_date<=? GROUP BY payment_method").all(from,to);
 const history:any[]=db.prepare("SELECT substr(payment_date,1,7) month,sum(amount) revenue FROM payments WHERE status='SUCCESS' AND (transaction_reference IS NULL OR transaction_reference NOT LIKE 'credit_deduction_%') AND payment_date>=? AND payment_date<=? GROUP BY month ORDER BY month").all(from,to);
 const growth:any[]=db.prepare("SELECT substr(created_at,1,7) month,count(*) newCount,sum(CASE WHEN status='ACTIVE' THEN 1 ELSE 0 END) active,sum(CASE WHEN status IN ('CANCELLED','EXPIRED') THEN 1 ELSE 0 END) churned FROM subscriptions GROUP BY month ORDER BY month").all();
 return {metrics:{totalRevenue:revenue.total,mrr:a.mrr,arr:a.arr,activeSubscriptions:a.activeSubscriptionsCount,totalCustomers:a.totalCustomersCount,outstandingPayments:a.totalOutstandingAr,overdueInvoices:overdue.count,paidAmount:revenue.total,unpaidAmount:a.totalOutstandingAr,overdueAmount:overdue.total},revenueHistory:history,subscriptionGrowth:growth,paymentOverview:payments,recentTransactions:PaymentsService.listPayments({page:1,limit:20,status:'SUCCESS'}).items.filter(p=>!p.transactionReference?.startsWith('credit_deduction_')).slice(0,5),recentSubscriptions:SubscriptionsService.listSubscriptions({page:1,limit:5}).items,upcomingRenewals:SubscriptionsService.listSubscriptions({page:1,limit:100,status:'ACTIVE'}).items.filter(x=>x.nextBillingDate<=new Date(Date.now()+7*86400000).toISOString()).slice(0,10),outstandingInvoices:InvoicesService.listInvoices({page:1,limit:100,status:'OPEN'}).items,aging:a.arAging,distribution:a.subscriptionStatusDistribution};
}
