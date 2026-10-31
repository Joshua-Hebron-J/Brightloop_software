// All new financial arithmetic uses integer minor units and rational half-up rounding.
export function minor(value:number|string):number {
 const text=String(value);if(!/^-?\d+(?:\.\d+)?$/.test(text))throw new Error('Invalid monetary value');
 const negative=text.startsWith('-'),[whole,fraction='']=text.replace('-','').split('.');
 const n=BigInt(whole)*100n+BigInt((fraction+'00').slice(0,2))+(Number(fraction[2]||0)>=5?1n:0n);
 const result=Number(negative?-n:n);if(!Number.isSafeInteger(result))throw new Error('Amount exceeds supported precision');return result;
}
export function ratio(amount:number,numerator:number,denominator=10000):number {
 if(!Number.isSafeInteger(amount)||!Number.isSafeInteger(numerator)||denominator<=0)throw new Error('Invalid monetary ratio');
 const n=BigInt(amount)*BigInt(numerator),d=BigInt(denominator);return Number(n<0n?-((-n+d/2n)/d):(n+d/2n)/d);
}
export const rateAmount=(paise:number,percent:number)=>ratio(paise,minor(percent));
export const major=(paise:number)=>paise/100;
export function allocate(total:number,weights:number[]):number[]{
 const sum=weights.reduce((n,w)=>n+w,0);if(!sum)return weights.map(()=>0);const d=BigInt(sum),t=BigInt(total);
 const pieces=weights.map((w,i)=>({i,value:Number(t*BigInt(w)/d),remainder:t*BigInt(w)%d}));let left=total-pieces.reduce((n,p)=>n+p.value,0);
 [...pieces].sort((a,b)=>a.remainder>b.remainder?-1:a.remainder<b.remainder?1:a.i-b.i).forEach(p=>{if(left>0){p.value++;left--}});return pieces.map(p=>p.value);
}
export function priceLines(items:{quantity:number;unitPrice:number;discountPercent?:number;taxRatePercent?:number}[],discountType='PERCENTAGE',discountValue=0){
 const lines=items.map(i=>{const gross=minor(i.unitPrice)*i.quantity,discount=rateAmount(gross,i.discountPercent||0);return {...i,gross,discount,taxable:gross-discount,tax:0}});
 const subtotal=lines.reduce((n,l)=>n+l.gross,0),net=lines.reduce((n,l)=>n+l.taxable,0);
 const overall=Math.min(net,discountType==='FIXED'?minor(discountValue):rateAmount(net,discountValue));const portions=allocate(overall,lines.map(l=>l.taxable));
 lines.forEach((l,i)=>{const part=portions[i];l.discount+=part;l.taxable-=part;l.tax=rateAmount(l.taxable,l.taxRatePercent||0)});
 const discount=lines.reduce((n,l)=>n+l.discount,0),tax=lines.reduce((n,l)=>n+l.tax,0);
 return {subtotal:major(subtotal),discount:major(discount),tax:major(tax),total:major(subtotal-discount+tax),lines:lines.map(l=>({...l,amount:major(l.taxable),taxAmount:major(l.tax),discountAmount:major(l.discount),lineTotal:major(l.taxable+l.tax)}))};
}
export function formatMoney(value:number,currency='INR'){return new Intl.NumberFormat('en-IN',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(value||0)}
export function formatDate(value?:string|null){if(!value)return '—';const day=value.slice(0,10);if(/^\d{4}-\d{2}-\d{2}$/.test(day))return day.split('-').reverse().join('/');return '—'}
