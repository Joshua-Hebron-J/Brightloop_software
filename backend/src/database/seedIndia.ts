import {getDb} from './db';
import {ProductsService} from '../modules/products/products.service';
import {PlansService} from '../modules/plans/plans.service';
import {CustomersService} from '../modules/customers/customers.service';
import {InvoicesService} from '../modules/invoices/invoices.service';
import {PaymentsService} from '../modules/payments/payments.service';
export function seedIndia(passwordHash:string){
 const db=getDb(),now=new Date().toISOString();
 let p:any=db.prepare("SELECT id FROM products WHERE code='BS-CLOUD'").get();
 if(!p)p=ProductsService.createProduct({name:'Brightloop Cloud',code:'BS-CLOUD',currency:'INR',salesPrice:999,costPrice:200,productType:'Software',category:'SaaS Platform',description:'Fictional India-first recurring billing platform',variants:[{name:'Team add-on',sku:'BS-TEAM',unitPrice:499,priceExtra:560}]});
 const plans=[['BS-START','Starter',999],['BS-GROW','Growth',2499],['BS-BIZ','Business',4999]] as const;
 for(const[code,name,price]of plans)if(!db.prepare('SELECT id FROM subscription_plans WHERE code=?').get(code))PlansService.createPlan({name,code,price,currency:'INR',billingFrequency:'MONTHLY',features:['Recurring billing','GST breakdown','Payment tracking'],...({productId:p.id,minimumQuantity:1,allowPause:true,allowClose:true,allowRenew:true} as any)});
 const customers=[['Chennai Tech Solutions Pvt Ltd','chennai@demo.example','Chennai','33','600001'],['Bengaluru Digital Works','bengaluru@demo.example','Bengaluru','29','560001'],['Mumbai Cloud Services','mumbai@demo.example','Mumbai','27','400001'],['Hyderabad Business Systems','hyderabad@demo.example','Hyderabad','36','500001']];
 for(const[name,email,city,state,pin]of customers)if(!db.prepare('SELECT id FROM customers WHERE email=?').get(email))CustomersService.createCustomer({type:'ORGANIZATION',companyName:name,firstName:'Demo',lastName:'Contact',email,phone:'',currency:'INR',taxId:'DEMO-UNREGISTERED',billingAddress:{line1:'Fictional Demo Office, Test Street',city,state,postalCode:pin,country:'IN'},paymentTermsDays:30});
 const c:any=db.prepare('SELECT id FROM customers WHERE email=?').get(customers[0][1]);
 for(const[email,role,first]of [['admin@billsync.test','ADMIN','Admin'],['billing@billsync.test','BILLING_MANAGER','Billing'],['sales@billsync.test','SALES_REP','Sales'],['viewer@billsync.test','VIEWER','Viewer'],['customer@billsync.test','CUSTOMER','Customer']])db.prepare('INSERT OR IGNORE INTO users(id,email,password_hash,first_name,last_name,role,is_active,created_at,updated_at,customer_id) VALUES(?,?,?,?,?,?,1,?,?,?)').run('billsync_'+role,email,passwordHash,first,'Demo',role,now,now,role==='CUSTOMER'?c.id:null);
 if(!db.prepare("SELECT id FROM tax_rules WHERE id='billsync_standard_gst'").get())db.prepare("INSERT INTO tax_rules(id,name,rate,product_id,currency) VALUES('billsync_standard_gst','Demo software GST (configured 18%)',18,?,'INR')").run(p.id);
 for(let m=1;m<=6;m++){const stamp=new Date();stamp.setUTCDate(10);stamp.setUTCMonth(stamp.getUTCMonth()-m);const date=stamp.toISOString(),ref='billsync-demo-'+date.slice(0,7);if(db.prepare('SELECT id FROM payments WHERE transaction_reference=?').get(ref))continue;
 const inv=InvoicesService.createInvoice({customerId:c.id,currency:'INR',issueDate:date,notes:'Fictional Brightloop seed invoice',items:[{description:'Demo platform subscription',quantity:1,unitPrice:999+m*100,taxRatePercent:18}]});InvoicesService.updateInvoiceStatus(inv.id,'OPEN');PaymentsService.recordPayment('billsync_ADMIN',{customerId:c.id,invoiceId:inv.id,amount:inv.totalAmount,currency:'INR',paymentDate:date,paymentMethod:'BANK_TRANSFER',transactionReference:ref,notes:'Fictional seed receipt; no money transferred'});
 }
}
