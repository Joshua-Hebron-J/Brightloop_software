import {getDb} from '../../database/db';
import {HttpError} from '../../middlewares/errorHandler';
import {minor,major,rateAmount} from '../../../shared/money';
import {states} from '../../../shared/india';
export {states} from '../../../shared/india';
export function stateCode(value:string){return states[value]?value:Object.keys(states).find(k=>states[k].toLowerCase()===String(value).toLowerCase())||''}
export function business(){return getDb().prepare('SELECT * FROM business_settings WHERE id=1').get() as any}
export function gstSnapshot(customerId:string,currency:string,lines:{amount:number;taxAmount:number;taxRatePercent?:number}[]){
 if(currency!=='INR')return null;
 const db=getDb(),supplier=business(),customer:any=db.prepare('SELECT * FROM customers WHERE id=?').get(customerId);if(!customer)throw new HttpError(404,'Customer not found','CUSTOMER_NOT_FOUND');
 const address=JSON.parse(customer.billing_address),place=stateCode(address.state||'');
 if(!place||address.country!=='IN')throw new HttpError(400,'INR billing requires an Indian billing address and valid state/place of supply','PLACE_OF_SUPPLY_REQUIRED');
 const totalTax=lines.reduce((n,l)=>n+minor(l.taxAmount),0);let cgst=0,sgst=0,igst=0;
 const intra=place===supplier.state_code;
 if(intra&&totalTax&&['04','26','31','35','38'].includes(place))throw new HttpError(400,'Intra-territory UTGST is outside this prototype; configure a supported supplier/place of supply','UTGST_UNSUPPORTED');
 if(!supplier.gst_enabled && totalTax)throw new HttpError(400,'GST is disabled for this supplier; use a zero tax rate','GST_DISABLED');
 for(const l of lines){const tax=minor(l.taxAmount);if(intra){const central=Math.floor(tax/2);cgst+=central;sgst+=tax-central}else igst+=tax}
 return {mode:totalTax?(intra?'CGST_SGST':'IGST'):'ZERO_RATED',supplier:{name:supplier.name,address:supplier.address,stateCode:supplier.state_code,gstin:supplier.gstin},customer:{name:customer.company_name||customer.first_name+' '+customer.last_name,address,gstin:customer.tax_id||''},placeOfSupply:place,placeOfSupplyName:states[place],taxableValue:major(lines.reduce((n,l)=>n+minor(l.amount),0)),cgst:major(cgst),sgst:major(sgst),igst:major(igst),taxTotal:major(totalTax)};
}
export function saveInvoiceGst(id:string){const db=getDb(),i:any=db.prepare('SELECT * FROM invoices WHERE id=?').get(id);if(i.currency!=='INR')return;const lines:any[]=db.prepare('SELECT amount,tax_amount taxAmount,tax_rate_percent taxRatePercent FROM invoice_items WHERE invoice_id=?').all(id);const snapshot=gstSnapshot(i.customer_id,i.currency,lines);db.prepare("UPDATE invoices SET gst_snapshot=?,tax_type='GST' WHERE id=?").run(JSON.stringify(snapshot),id)}
export function configuredRate(productId:string|undefined,currency:string,fallback:number){const rules:any[]=getDb().prepare('SELECT * FROM tax_rules WHERE active=1 AND (currency=? OR currency IS NULL) AND (product_id IS NULL OR product_id=?) ORDER BY rowid DESC').all(currency,productId||'');const specific=rules.find(r=>r.product_id);return (specific||rules[0])?.rate??fallback}
