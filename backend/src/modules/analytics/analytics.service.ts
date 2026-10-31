import {getDb} from '../../database/db';
import {DashboardMetrics} from '../../../shared/types';
import {dashboard} from '../official/dashboard';
import {formatMoney} from '../../../shared/money';

export class AnalyticsService {
 static getDashboardMetrics():DashboardMetrics {
  const d=dashboard({currency:'INR'}),db=getDb();
  return {mrr:d.metrics.mrr,arr:d.metrics.arr,activeSubscriptionsCount:d.metrics.activeSubscriptions,trialingSubscriptionsCount:Number((db.prepare("SELECT count(*) n FROM subscriptions WHERE currency='INR' AND status='TRIALING'").get() as any).n),totalCustomersCount:d.metrics.totalCustomers,totalOutstandingAr:d.metrics.outstandingPayments,arAging:d.aging,revenueByMonth:d.revenueHistory as any,subscriptionStatusDistribution:d.distribution as any,recentActivity:d.recentTransactions.map((p:any)=>({id:p.id,type:'PAYMENT',description:`Received ${formatMoney(p.amount,p.currency)} via ${p.paymentMethod}`,amount:p.amount,timestamp:p.paymentDate}))};
 }
}
