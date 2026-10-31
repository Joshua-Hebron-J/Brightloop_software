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
 const db=getDb();
 const taxes:any[]=db.prepare('SELECT * FROM tax_rules WHERE active=1').all();
 const rules:any[]=db.prepare('SELECT * FROM discount_rules WHERE active=1 AND starts_at<=? AND ends_at>=? AND used_count<usage_limit ORDER BY id').all(date,date);
 const lines=items.map(i=>({...i,amount:money(i.quantity*i.unit_price),discount:0,tax:0,rate:0}));
 const subtotal=money(lines.reduce((n,l)=>n+l.amount,0));const used:string[]=[];
 const metadata=typeof sub.metadata==='string'?JSON.parse(sub.metadata):sub.metadata;
 if(metadata?.discountValue && subtotal>0){const discount=money(Math.min(subtotal,metadata.discountType==='FIXED'?metadata.discountValue:subtotal*metadata.discountValue/100));let assigned=0;lines.forEach((l,i)=>{l.discount=i===lines.length-1?money(discount-assigned):money(discount*l.amount/subtotal);assigned=money(assigned+l.discount)})}

 for(const r of rules) {
  if(r.subscription_id && r.subscription_id!==sub.id) continue;
  const selected=lines.filter(l=>!r.product_id || l.product_id===r.product_id);
  const base=money(selected.reduce((n,l)=>n+l.amount-l.discount,0));
  if(base<=0 || base<r.minimum_purchase || selected.reduce((n,l)=>n+l.quantity,0)<r.minimum_quantity) continue;
  const discount=money(Math.min(base,r.kind==='PERCENTAGE'?base*r.value/100:r.value));
  let allocated=0;selected.forEach((l,i)=>{const part=i===selected.length-1?money(discount-allocated):money(discount*(l.amount-l.discount)/base);l.discount=money(l.discount+part);allocated=money(allocated+part)});used.push(r.id);
 }
 for(const l of lines) { const matching=taxes.filter(t=>!t.product_id || t.product_id===l.product_id);l.rate=matching.length?matching.reduce((n,t)=>n+t.rate,0):(l.tax_rate_percent||0);l.tax=money((l.amount-l.discount)*l.rate/100); }
 const discount=money(lines.reduce((n,l)=>n+l.discount,0)),tax=money(lines.reduce((n,l)=>n+l.tax,0));
 return {subtotal,discount,tax,total:money(subtotal-discount+tax),lines,used};
}
