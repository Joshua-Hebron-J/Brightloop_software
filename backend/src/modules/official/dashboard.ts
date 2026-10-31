import {getDb} from '../../database/db';
import {InvoicesService} from '../invoices/invoices.service';
import {SubscriptionsService} from '../subscriptions/subscriptions.service';
import {PaymentsService} from '../payments/payments.service';
import {priceRecurring} from './policy';
import {money} from './policy';
export function dashboard(query:any={}){
 const db=getDb(),currency=['INR','USD','EUR','GBP'].includes(query.currency)?query.currency:'INR';
 const from=query.from||'0000',to=query.to||'9999',now=new Date().toISOString();
 const subs:any[]=db.prepare("SELECT s.*,p.billing_frequency FROM subscriptions s JOIN subscription_plans p ON p.id=s.plan_id WHERE s.currency=? AND s.status='ACTIVE'").all(currency);
 let mrr=0;const factor:any={DAILY:365/12,WEEKLY:52/12,MONTHLY:1,QUARTERLY:1/3,SEMI_ANNUALLY:1/6,ANNUALLY:1/12};
 for(const s of subs){const lines:any[]=db.prepare('SELECT * FROM subscription_items WHERE subscription_id=?').all(s.id);const p=priceRecurring(s,lines,now);mrr+=(p.subtotal-p.discount)*factor[s.billing_frequency]}
 const paymentWhere="currency=? AND status='SUCCESS' AND (transaction_reference IS NULL OR transaction_reference NOT LIKE 'credit_deduction_%') AND payment_date>=? AND payment_date<=?";
 const receipt:any=db.prepare(`SELECT coalesce(sum(amount),0) total FROM payments WHERE ${paymentWhere}`).get(currency,from,to);
 const outstanding:any=db.prepare("SELECT coalesce(sum(balance_due),0) amount FROM invoices WHERE currency=? AND status IN ('OPEN','PARTIALLY_PAID')").get(currency);
 const invoices:any[]=db.prepare("SELECT * FROM invoices WHERE currency=? AND status IN ('OPEN','PARTIALLY_PAID')").all(currency);
 const overdue=invoices.filter(i=>i.due_date.slice(0,10)<now.slice(0,10));const aging={current:0,overdue30:0,overdue60:0,overdue90:0};
 for(const i of invoices){const days=Math.ceil((Date.parse(now.slice(0,10))-Date.parse(i.due_date.slice(0,10)))/86400000);const key=days<=0?'current':days<=30?'overdue30':days<=60?'overdue60':'overdue90';aging[key]=money(aging[key]+i.balance_due)}
 const recentSubIds:any[]=db.prepare('SELECT id FROM subscriptions WHERE currency=? ORDER BY created_at DESC LIMIT 5').all(currency);
 const upcoming:any[]=db.prepare("SELECT id FROM subscriptions WHERE currency=? AND status='ACTIVE' AND next_billing_date<=? ORDER BY next_billing_date LIMIT 10").all(currency,new Date(Date.now()+7*86400000).toISOString());
 const recentPayments:any[]=db.prepare(`SELECT id FROM payments WHERE ${paymentWhere} ORDER BY payment_date DESC LIMIT 5`).all(currency,from,to);
 return {currency,metrics:{totalRevenue:money(receipt.total),mrr:money(mrr),arr:money(mrr*12),activeSubscriptions:subs.length,totalCustomers:(db.prepare("SELECT count(*) count FROM customers WHERE currency=? AND status!='ARCHIVED'").get(currency) as any).count,outstandingPayments:money(outstanding.amount),overdueInvoices:overdue.length,paidAmount:money(receipt.total),unpaidAmount:money(outstanding.amount),overdueAmount:money(overdue.reduce((n,i)=>n+i.balance_due,0))},revenueHistory:db.prepare(`SELECT substr(payment_date,1,7) month,sum(amount) revenue FROM payments WHERE ${paymentWhere} GROUP BY month ORDER BY month`).all(currency,from,to),subscriptionGrowth:db.prepare("SELECT substr(created_at,1,7) month,count(*) newCount,sum(status='ACTIVE') active,sum(status IN ('CANCELLED','EXPIRED')) churned FROM subscriptions WHERE currency=? GROUP BY month ORDER BY month").all(currency),paymentOverview:db.prepare(`SELECT payment_method method,sum(amount) amount,count(*) count FROM payments WHERE ${paymentWhere} GROUP BY payment_method`).all(currency,from,to),recentTransactions:recentPayments.map(p=>PaymentsService.getPaymentById(p.id)),recentSubscriptions:recentSubIds.map(s=>SubscriptionsService.getSubscriptionById(s.id)),upcomingRenewals:upcoming.map(s=>SubscriptionsService.getSubscriptionById(s.id)),outstandingInvoices:invoices.sort((a,b)=>a.due_date.localeCompare(b.due_date)).slice(0,10).map(i=>InvoicesService.getInvoiceById(i.id)),aging,distribution:db.prepare('SELECT status,count(*) count FROM subscriptions WHERE currency=? GROUP BY status').all(currency)};
}
