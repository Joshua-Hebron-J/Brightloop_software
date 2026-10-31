import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createApp} from '../app';
import {seedDatabase} from '../database/seed';
import {priceLines,minor,formatMoney,formatDate} from '../../shared/money';
const app=createApp();let token='';
const call=(method:string,path:string,body?:any)=>(request(app) as any)[method]('/api'+path).set('Authorization','Bearer '+token).send(body);
before(async()=>{seedDatabase();const r=await call('post','/auth/login',{email:'admin@billsync.test',password:'Password123!'});token=r.body.data.token});
test('INR formatting and date-only values preserve Indian grouping and calendar day',()=>{
 assert.equal(formatMoney(1250000),'\u20b912,50,000.00');assert.equal(formatMoney(100,'USD'),'$100.00');
 assert.equal(formatDate('2026-10-31'),'31/10/2026');assert.equal(formatDate('2026-10-31T23:00:00Z'),'31/10/2026');assert.equal(minor('1.005'),101);
});
test('Integer-paise pricing allocates discounts without negative lines and rounds GST exactly',()=>{
 const p=priceLines([{quantity:2,unitPrice:1000,discountPercent:10,taxRatePercent:18}]);assert.deepEqual([p.subtotal,p.discount,p.tax,p.total],[2000,200,324,2124]);
 const tiny=priceLines(Array.from({length:7},()=>({quantity:1,unitPrice:0.01,taxRatePercent:18})),'FIXED',0.04);
 assert.equal(tiny.total,0.03);assert.ok(tiny.lines.every(l=>l.amount>=0));assert.equal(tiny.lines.reduce((n,l)=>n+minor(l.discountAmount),0),4);
});
async function customer(state:string,name:string){const r=await call('post','/customers',{type:'ORGANIZATION',companyName:name,firstName:'Demo',lastName:'Test',email:name+'@demo.example',currency:'INR',billingAddress:{line1:'Fictional test office',city:'Demo city',state,postalCode:'600001',country:'IN'},taxId:'DEMO-NOT-REAL'});assert.equal(r.status,201,JSON.stringify(r.body));return r.body.data.id}
test('INR quote edit, interstate GST, recurring billing, partial/full settlement, analytics and currency protection',async()=>{
 const cid=await customer('29','IndiaQA'),same=await customer('33','IndiaSame');
 let r=await call('post','/products',{name:'INR QA',code:'INR-QA',salesPrice:1000,currency:'INR'});assert.equal(r.status,201,JSON.stringify(r.body));const pid=r.body.data.id;
 r=await call('post','/plans',{name:'INR QA monthly',code:'INR-QA-M',productId:pid,price:1000,currency:'INR',billingFrequency:'MONTHLY'});assert.equal(r.status,201);const planId=r.body.data.id;
 await call('post','/official/taxes',{name:'QA configured GST',product_id:pid,currency:'INR',rate:18});
 const body={customerId:cid,planId,validUntil:'2027-12-31',items:[{productId:pid,description:'Seats',quantity:2,unitPrice:1000,discountPercent:10,taxRatePercent:18}]};
 r=await call('post','/quotes',body);assert.equal(r.status,201,JSON.stringify(r.body));const q=r.body.data;
 assert.equal(q.totalAmount,2124);assert.equal(q.gst.igst,324);assert.equal(q.gst.cgst,0);
 r=await call('put','/quotes/'+q.id,{...body,notes:'Saved edit'});assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.data.quoteNumber,q.quoteNumber);assert.equal(r.body.data.notes,'Saved edit');
 r=await call('post','/quotes',{...body,customerId:same});assert.equal(r.body.data.gst.cgst,162);assert.equal(r.body.data.gst.sgst,162);
 assert.equal((await call('post','/quotes',{...body,currency:'USD'})).status,400);
 for(const status of ['PENDING_APPROVAL','APPROVED','ACCEPTED'])assert.equal((await call('patch','/quotes/'+q.id+'/status',{status})).status,200);
 r=await call('post','/quotes/'+q.id+'/convert',{});assert.equal(r.status,200,JSON.stringify(r.body));const sid=r.body.data.subscriptionId;
 const targetDate=new Date(Date.now()+1000).toISOString();r=await call('post','/billing/run-cycles',{targetDate,subscriptionIds:[sid]});assert.equal(r.body.data.generatedCount,1);const iid=r.body.data.results[0].invoiceId;
 r=await call('get','/invoices/'+iid);assert.equal(r.body.data.totalAmount,2124);assert.equal(r.body.data.gst.igst,324);
 assert.equal((await call('post','/billing/run-cycles',{targetDate,subscriptionIds:[sid]})).body.data.generatedCount,0);
 await call('patch','/invoices/'+iid+'/status',{status:'OPEN'});
 assert.equal((await call('post','/payments',{customerId:cid,invoiceId:iid,amount:1000,paymentMethod:'UPI',transactionReference:'india-partial'})).status,201);
 r=await call('get','/invoices/'+iid);assert.equal(r.body.data.balanceDue,1124);assert.equal(r.body.data.status,'PARTIALLY_PAID');
 assert.equal((await call('post','/payments',{customerId:cid,invoiceId:iid,amount:1124,paymentMethod:'BANK_TRANSFER',transactionReference:'india-full'})).status,201);
 r=await call('get','/invoices/'+iid);assert.equal(r.body.data.balanceDue,0);assert.equal(r.body.data.status,'PAID');
 r=await call('get','/invoices/'+iid+'/html');assert.ok(r.text.includes('IGST'));assert.ok(r.text.includes('\u20b92,124.00'));assert.ok(r.text.includes('31/'));
 assert.equal((await call('put','/customers/'+cid,{currency:'USD'})).status,400);
 r=await call('get','/official/dashboard?currency=INR');assert.equal(r.body.data.currency,'INR');assert.ok(r.body.data.metrics.mrr>=1800);
 r=await call('get','/official/dashboard?currency=USD');assert.equal(r.body.data.currency,'USD');
});
