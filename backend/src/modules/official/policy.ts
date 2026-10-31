import {minor,major,rateAmount,ratio,allocate} from '../../../shared/money';
import {configuredRate} from './gst';
import { getDb } from '../../database/db';
import { HttpError } from '../../middlewares/errorHandler';
export function planPolicy(id: string): any {
 const r:any=getDb().prepare('SELECT product_id,minimum_quantity,available_from,available_until,allow_pause,allow_close,allow_renew,auto_close FROM subscription_plans WHERE id=?').get(id);
 return r ? {productId:r.product_id,minimumQuantity:r.minimum_quantity,availableFrom:r.available_from,availableUntil:r.available_until,allowPause:!!r.allow_pause,allowClose:!!r.allow_close,allowRenew:!!r.allow_renew,autoClose:!!r.auto_close}:{};
}
export function savePlanPolicy(id:string,d:any) {
 const fields:any={productId:'product_id',minimumQuantity:'minimum_quantity',availableFrom:'available_from',availableUntil:'available_until',allowPause:'allow_pause',allowClose:'allow_close',allowRenew:'allow_renew',autoClose:'auto_close'};
 const keys=Object.keys(fields).filter(k=>d[k]!==undefined);
 if(keys.length) getDb().prepare(`UPDATE subscription_plans SET ${keys.map(k=>fields[k]+'=?').join(',')} WHERE id=?`).run(...keys.map(k=>typeof d[k]==='boolean'?Number(d[k]):d[k]),id);
}
export function checkPlan(plan:any,start:string,items:any[]=[]) {
 if(plan.status!=='ACTIVE') throw new HttpError(400,'Plan is archived','PLAN_UNAVAILABLE');
 if((plan.available_from && start<plan.available_from)||(plan.available_until && start>plan.available_until)) throw new HttpError(400,'Plan is outside its availability dates','PLAN_UNAVAILABLE');
 if(items.length && items.reduce((n,x)=>n+x.quantity,0)<plan.minimum_quantity) throw new HttpError(400,'Plan minimum quantity not met','MINIMUM_QUANTITY');
}
export const money=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
// Called inside the invoice transaction; preview never consumes a rule.
export function priceRecurring(sub:any,items:any[],date:string) {
 const db=getDb(),currency=sub.currency||'USD';
 const rules:any[]=db.prepare('SELECT * FROM discount_rules WHERE active=1 AND starts_at<=? AND ends_at>=? AND used_count<usage_limit AND (currency=? OR currency IS NULL) ORDER BY id').all(date,date,currency);
 const lines=items.map(i=>{const amount=minor(i.unit_price)*i.quantity;return {...i,paise:amount,off:rateAmount(amount,i.discount_percent||0),taxPaise:0,rate:0}});
 const used:string[]=[];const metadata=typeof sub.metadata==='string'?JSON.parse(sub.metadata):sub.metadata;
 const apply=(selected:typeof lines,kind:string,value:number)=>{const base=selected.reduce((n,l)=>n+l.paise-l.off,0);const discount=Math.min(base,kind==='FIXED'?minor(value):rateAmount(base,value));const portions=allocate(discount,selected.map(l=>l.paise-l.off));selected.forEach((l,i)=>{l.off+=portions[i]})};
 if(metadata?.discountValue)apply(lines,metadata.discountType,metadata.discountValue);
 for(const r of rules){if(r.subscription_id&&r.subscription_id!==sub.id)continue;const selected=lines.filter(l=>!r.product_id||l.product_id===r.product_id);const base=selected.reduce((n,l)=>n+l.paise-l.off,0);if(base<=0||base<minor(r.minimum_purchase)||selected.reduce((n,l)=>n+l.quantity,0)<r.minimum_quantity)continue;apply(selected,r.kind,r.value);used.push(r.id)}
 for(const l of lines){l.rate=configuredRate(l.product_id,currency,l.tax_rate_percent||0);l.taxPaise=rateAmount(l.paise-l.off,l.rate)}
 const subtotal=lines.reduce((n,l)=>n+l.paise,0),discount=lines.reduce((n,l)=>n+l.off,0),tax=lines.reduce((n,l)=>n+l.taxPaise,0);
 return {subtotal:major(subtotal),discount:major(discount),tax:major(tax),total:major(subtotal-discount+tax),lines:lines.map(l=>({...l,amount:major(l.paise),discount:major(l.off),tax:major(l.taxPaise)})),used};
}
