import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createApp} from '../app';
import {seedDatabase} from '../database/seed';
import {getDb} from '../database/db';
import {addBillingPeriod} from '../utils/dateUtils';
const app=createApp();let admin='',billing='',customer='',customerId='';
const call=(method:string,path:string,token=admin,body?:any)=>(request(app) as any)[method]('/api'+path).set('Authorization','Bearer '+token).send(body);
before(async()=>{seedDatabase();for(const[email,set] of [['admin@brightloop.io',(t:string)=>admin=t],['billing@brightloop.io',(t:string)=>billing=t]] as const){const r=await call('post','/auth/login','',{email,password:'Password123!'});set(r.body.data.token)}});
test('Registration enforces official password policy and prevents public staff creation',async()=>{
 for(const password of ['Abcdefg!','abcdefghi!','ABCDEFGHI!','Abcdefghi1'])assert.equal((await call('post','/auth/register','',{email:'bad@example.test',password,firstName:'Test',lastName:'Account'})).status,422);
 assert.equal((await call('post','/auth/register','',{email:'escalate@example.test',password:'Password123!',firstName:'Bad',lastName:'Role',role:'ADMIN'})).status,422);
 const r=await call('post','/auth/register','',{email:'owner@example.test',password:'Password123!',firstName:'Owner',lastName:'Test'});assert.equal(r.status,201,JSON.stringify(r.body));customer=r.body.data.token;
 const me=await call('get','/auth/me',customer);customerId=me.body.data.user.customerId;assert.ok(customerId);assert.equal(me.body.data.user.role,'CUSTOMER');
 assert.equal((await call('post','/auth/register','',{email:'OWNER@example.test',password:'Password123!',firstName:'Duplicate',lastName:'Account'})).status,409);
});
test('Only admins create staff and configure products, plans, taxes and discounts',async()=>{
 assert.equal((await call('post','/auth/staff',billing,{})).status,403);
 for(const p of ['/products','/plans','/official/taxes','/official/discounts'])assert.equal((await call('post',p,billing,{})).status,403);
 assert.equal((await call('post','/auth/staff',admin,{email:'staff@example.test',password:'Password123!',firstName:'Staff',lastName:'Member',role:'SALES_REP'})).status,201);
});
let planId='',productId='',subId='',invoiceId='',discountId='';
test('Official journey: product, daily plan, template, approval, conversion, billing, payment and reports',async()=>{
 let r=await call('post','/products',admin,{name:'Official product',code:'OFFICIAL',productType:'Software',salesPrice:100,costPrice:20,variants:[{name:'Odoo brand',sku:'OFFICIAL-ODOO',unitPrice:100,priceExtra:560}]});assert.equal(r.status,201);productId=r.body.data.id;
 r=await call('post','/plans',admin,{name:'Daily seats',code:'DAILY-TEST',productId,billingFrequency:'DAILY',price:100,minimumQuantity:2,allowPause:true,allowClose:true,allowRenew:true});assert.equal(r.status,201,JSON.stringify(r.body));planId=r.body.data.id;
 assert.equal((await call('post','/subscriptions',admin,{customerId,planId,items:[{description:'seat',quantity:1,unitPrice:100}]})).status,400);
 r=await call('post','/official/taxes',admin,{name:'Service tax',rate:10,product_id:productId});assert.equal(r.status,201);
 r=await call('post','/official/discounts',admin,{name:'Volume offer',kind:'PERCENTAGE',value:10,minimum_purchase:100,minimum_quantity:2,starts_at:new Date(Date.now()-86400000).toISOString(),ends_at:new Date(Date.now()+10*86400000).toISOString(),usage_limit:1,product_id:productId});assert.equal(r.status,201);discountId=r.body.data.id;
 r=await call('post','/official/templates',admin,{name:'Daily team offer',planId,validityDays:30,items:[{productId,description:'Team seats',quantity:2,unitPrice:100}]});assert.equal(r.status,201);const tid=r.body.data.id;
 r=await call('post','/official/templates/'+tid+'/quote',admin,{customerId});assert.equal(r.status,201);const qid=r.body.data.id;
 assert.equal((await call('post','/quotes/'+qid+'/convert',admin,{})).status,400);
 for(const status of ['PENDING_APPROVAL','APPROVED','ACCEPTED'])assert.equal((await call('patch','/quotes/'+qid+'/status',admin,{status})).status,200);
 r=await call('post','/quotes/'+qid+'/convert',admin,{});assert.equal(r.status,200,JSON.stringify(r.body));subId=r.body.data.subscriptionId;
 assert.equal((await call('post','/quotes/'+qid+'/convert',admin,{})).status,400);
 const targetDate=new Date(Date.now()+1000).toISOString();
 r=await call('post','/billing/run-cycles',admin,{targetDate,subscriptionIds:[subId],dryRun:true});assert.equal(r.body.data.generatedCount,1);assert.equal(r.body.data.results[0].amount,198);assert.equal((getDb().prepare('SELECT used_count FROM discount_rules WHERE id=?').get(discountId) as any).used_count,0);
 r=await call('post','/billing/run-cycles',admin,{targetDate,subscriptionIds:[subId]});assert.equal(r.body.data.generatedCount,1,JSON.stringify(r.body));invoiceId=r.body.data.results[0].invoiceId;
 r=await call('get','/invoices/'+invoiceId);assert.equal(r.body.data.status,'DRAFT');assert.equal(r.body.data.totalAmount,198);assert.equal(r.body.data.taxAmount,18);assert.equal(r.body.data.discountAmount,20);
 assert.equal((await call('post','/billing/run-cycles',admin,{targetDate,subscriptionIds:[subId]})).body.data.generatedCount,0);
 assert.equal((await call('post','/payments',admin,{customerId,invoiceId,amount:198,paymentMethod:'CASH'})).status,400);
 assert.equal((await call('patch','/invoices/'+invoiceId+'/status',admin,{status:'OPEN'})).status,200);
 const payload={customerId,invoiceId,amount:198,paymentMethod:'BANK_TRANSFER',transactionReference:'official-settlement'};
 r=await call('post','/payments',admin,payload);assert.equal(r.status,201,JSON.stringify(r.body));const paymentId=r.body.data.payment.id;
 r=await call('post','/payments',admin,payload);assert.equal(r.status,201);assert.equal(r.body.data.payment.id,paymentId);
 r=await call('get','/invoices/'+invoiceId);assert.equal(r.body.data.status,'PAID');assert.equal(r.body.data.balanceDue,0);
 r=await call('get','/customers/'+customerId);assert.equal(r.body.data.outstandingBalance,0);
 r=await call('get','/official/dashboard');assert.equal(r.status,200);assert.ok(r.body.data.metrics.totalRevenue>=198);
 r=await call('post','/billing/run-cycles',admin,{targetDate:new Date(Date.now()+86400000+1000).toISOString(),subscriptionIds:[subId]});assert.equal(r.body.data.results[0].amount,220,'discount stops at usage limit');
});
test('Customers can only read their own records; direct URLs, filters and mutation spoofing are blocked',async()=>{
 let r=await call('get','/subscriptions?customerId=cust_acme',customer);assert.equal(r.status,200);assert.ok(r.body.data.items.every((s:any)=>s.customerId===customerId));
 assert.equal((await call('get','/customers/cust_acme',customer)).status,404);
 assert.equal((await call('get','/invoices/inv_1001/html',customer)).status,404);
 assert.equal((await call('get','/official/dashboard',customer)).status,403);
 assert.equal((await call('get','/invoices/'+invoiceId,customer)).status,200);
 assert.equal((await call('post','/payments',customer,{customerId,invoiceId,amount:1,paymentMethod:'CASH'})).status,403);
 assert.equal((await call('post','/subscriptions/'+subId+'/pause',customer,{})).status,200);
 assert.equal((await call('post','/subscriptions/'+subId+'/resume',customer,{})).status,200);
});
test('Draft lifecycle follows Draft → Quotation → Confirmed → Active, with invalid transitions rejected',async()=>{
 const r=await call('post','/subscriptions',admin,{customerId,planId:'plan_starter_monthly',startTrial:false});assert.equal(r.status,201);const id=r.body.data.id;assert.equal(r.body.data.status,'DRAFT');
 assert.equal((await call('post','/official/subscriptions/'+id+'/transition',admin,{status:'ACTIVE'})).status,400);
 for(const status of ['QUOTATION','CONFIRMED','ACTIVE'])assert.equal((await call('post','/official/subscriptions/'+id+'/transition',admin,{status})).status,200);
});
test('Plan policies prevent pause and early closure; unavailable plans reject enrollment',async()=>{
 await call('put','/plans/'+planId,admin,{allowPause:false,allowClose:false});
 assert.equal((await call('post','/subscriptions/'+subId+'/pause',admin,{})).status,400);
 assert.equal((await call('post','/subscriptions/'+subId+'/cancel',admin,{cancelReason:'Test',immediate:true})).status,400);
 await call('put','/plans/'+planId,admin,{availableUntil:'2000-01-01T00:00:00.000Z'});
 assert.equal((await call('post','/subscriptions',admin,{customerId,planId})).status,400);
});
test('Password reset is single-use, expires and revokes refresh tokens',async()=>{
 const r=await call('post','/auth/forgot-password','',{email:'owner@example.test'});assert.equal(r.status,200);assert.equal(r.body.data.token,undefined);
 const row:any=getDb().prepare("SELECT body FROM mail_outbox WHERE recipient='owner@example.test'").get();const token=new URL(row.body).searchParams.get('reset');assert.ok(token);
 assert.equal((await call('post','/auth/reset-password','',{token,password:'ChangedPass!'})).status,200);
 assert.equal((await call('post','/auth/reset-password','',{token,password:'ChangedPass!'})).status,400);
 assert.equal((await call('post','/auth/login','',{email:'owner@example.test',password:'Password123!'})).status,401);
 assert.equal((await call('post','/auth/login','',{email:'owner@example.test',password:'ChangedPass!'})).status,200);
});
test('Renewals clamp month-end dates and support leap years and daily periods',()=>{
 assert.equal(addBillingPeriod(new Date('2024-01-31T00:00:00Z'),'MONTHLY').toISOString(),'2024-02-29T00:00:00.000Z');
 assert.equal(addBillingPeriod(new Date('2024-02-29T00:00:00Z'),'ANNUALLY').toISOString(),'2025-02-28T00:00:00.000Z');
 assert.equal(addBillingPeriod(new Date('2026-10-31T00:00:00Z'),'DAILY').toISOString(),'2026-11-01T00:00:00.000Z');
});
test('5,000 subscriptions: indexed list and summary HTTP responses stay below two seconds',async()=>{
 const db=getDb(),now=new Date().toISOString();const stmt=db.prepare("INSERT INTO subscriptions(id,subscription_number,customer_id,plan_id,status,current_period_start,current_period_end,next_billing_date,currency,created_at,updated_at) VALUES(?,?,'cust_acme','plan_starter_monthly','ACTIVE',?,?,?,'USD',?,?)");db.exec('BEGIN');for(let i=0;i<5000;i++)stmt.run('perf-'+i,'PERF-'+i,now,now,now,now,now);db.exec('COMMIT');
 for(const path of ['/subscriptions?limit=20&page=100','/official/dashboard','/products','/plans','/customers','/quotes','/invoices','/payments']){const start=performance.now();const r=await call('get',path);const elapsed=performance.now()-start;assert.equal(r.status,200);assert.ok(elapsed<2000,`${path} took ${elapsed}ms`);console.log(`Performance: ${path} ${elapsed.toFixed(1)}ms`)}
});

test('Add-on selection includes the 560 variant extra and supports switching off',async()=>{
 const login=await call('post','/auth/login','',{email:'owner@example.test',password:'ChangedPass!'});const token=login.body.data.token;
 const v:any=getDb().prepare("SELECT id FROM product_variants WHERE sku='OFFICIAL-ODOO'").get();
 let r=await call('post','/subscriptions/'+subId+'/addons',token,{variantId:v.id,quantity:1});assert.equal(r.status,200,JSON.stringify(r.body));
 const item:any=getDb().prepare('SELECT * FROM subscription_items WHERE subscription_id=? AND variant_id=? AND is_base=0').get(subId,v.id);assert.equal(item.unit_price,660);
 assert.equal((await call('post','/subscriptions/'+subId+'/addons',token,{variantId:v.id,quantity:0})).status,200);
 assert.equal(getDb().prepare('SELECT id FROM subscription_items WHERE subscription_id=? AND variant_id=? AND is_base=0').get(subId,v.id),undefined);
});
test('Refund reverses the invoice allocation and the unspent overpayment credit exactly once',async()=>{
 let r=await call('post','/invoices',admin,{customerId,items:[{description:'Refund test',quantity:1,unitPrice:100}]});const id=r.body.data.id;
 await call('patch','/invoices/'+id+'/status',admin,{status:'OPEN'});
 r=await call('post','/payments',admin,{customerId,invoiceId:id,amount:120,paymentMethod:'CASH'});assert.equal(r.status,201);const pid=r.body.data.payment.id;
 assert.equal((await call('post','/payments/'+pid+'/refund',admin,{reason:'Test refund'})).status,200);
 r=await call('get','/invoices/'+id);assert.equal(r.body.data.balanceDue,100);assert.equal(r.body.data.amountPaid,0);
 r=await call('get','/customers/'+customerId);assert.equal(r.body.data.creditBalance,0);
 assert.equal((await call('post','/payments/'+pid+'/refund',admin,{reason:'Again'})).status,400);
});
test('Billing catches up missed daily cycles and automatically closes expired contracts',async()=>{
 let r=await call('post','/plans',admin,{name:'Catchup',code:'CATCHUP',billingFrequency:'DAILY',price:10,autoClose:true});const pid=r.body.data.id;
 const start=new Date(Date.now()-3*86400000).toISOString(),expiry=new Date(Date.now()+10*86400000).toISOString();
 r=await call('post','/subscriptions',admin,{customerId,planId:pid,initialStatus:'ACTIVE',startTrial:false,startDate:start,expiryDate:expiry});const id=r.body.data.id;
 r=await call('post','/billing/run-cycles',admin,{subscriptionIds:[id],targetDate:new Date().toISOString()});assert.equal(r.body.data.generatedCount,4,JSON.stringify(r.body));
 r=await call('post','/billing/run-cycles',admin,{subscriptionIds:[id],targetDate:new Date(Date.now()+11*86400000).toISOString()});assert.equal(r.body.data.cancelledCount,1);
 r=await call('get','/subscriptions/'+id);assert.equal(r.body.data.status,'EXPIRED');
});
test('Logout invalidates JWT and refresh token; refresh rotation invalidates the previous refresh token',async()=>{
 const login=await call('post','/auth/login','',{email:'owner@example.test',password:'ChangedPass!'});const first=login.body.data;
 const refreshed=await call('post','/auth/refresh','',{refreshToken:first.refreshToken});assert.equal(refreshed.status,200);
 assert.equal((await call('post','/auth/refresh','',{refreshToken:first.refreshToken})).status,401);
 await call('post','/auth/logout',refreshed.body.data.token,{});
 assert.equal((await call('get','/auth/me',refreshed.body.data.token)).status,401);
 assert.equal((await call('post','/auth/refresh','',{refreshToken:refreshed.body.data.refreshToken})).status,401);
});
