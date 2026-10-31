import nodemailer from 'nodemailer';
import { randomBytes, createHash } from 'node:crypto';
import { getDb } from '../../database/db';
import { generateId } from '../../utils/dateUtils';
import { HttpError } from '../../middlewares/errorHandler';
export async function sendMail(recipient:string,subject:string,body:string) {
 const db=getDb(),id=generateId('mail');
 db.prepare('INSERT INTO mail_outbox(id,recipient,subject,body,created_at) VALUES(?,?,?,?,?)').run(id,recipient,subject,body,new Date().toISOString());
 const endpoint=process.env.MAIL_WEBHOOK_URL;
 if(process.env.SMTP_HOST){
  try{const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',...(process.env.SMTP_USER?{auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}}:{}),connectionTimeout:10000});await transport.sendMail({from:process.env.MAIL_FROM||'Brightloop <billing@example.com>',to:recipient,subject,text:body});db.prepare("UPDATE mail_outbox SET status='SENT' WHERE id=?").run(id);return {queued:true,delivered:true}}
  catch{db.prepare("UPDATE mail_outbox SET status='FAILED' WHERE id=?").run(id);throw new HttpError(503,'SMTP delivery failed; please retry later','MAIL_UNAVAILABLE')}
 }
 if(endpoint) {
  try {const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.MAIL_WEBHOOK_TOKEN||''}`},body:JSON.stringify({to:recipient,subject,text:body}),signal:AbortSignal.timeout(10000)});if(!r.ok) throw new Error('Mail provider rejected message');db.prepare("UPDATE mail_outbox SET status='SENT' WHERE id=?").run(id)}
  catch {db.prepare("UPDATE mail_outbox SET status='FAILED' WHERE id=?").run(id);throw new HttpError(503,'Email delivery failed; please retry later','MAIL_UNAVAILABLE')}
 }
 return {queued:true,delivered:!!endpoint};
}
export async function requestReset(email:string) {
 const db=getDb();const u:any=db.prepare('SELECT id,email FROM users WHERE lower(email)=?').get(email.toLowerCase());
 if(u) {const token=randomBytes(32).toString('hex');db.prepare('UPDATE password_resets SET used=1 WHERE user_id=?').run(u.id);db.prepare('INSERT INTO password_resets VALUES(?,?,?,0)').run(createHash('sha256').update(token).digest('hex'),u.id,new Date(Date.now()+1800000).toISOString());await sendMail(u.email,'Reset your Brightloop password',`${process.env.APP_URL||'http://localhost:5173'}/?reset=${token}`)}
 return {message:'If the account exists, recovery instructions have been queued. Delivery requires the configured email service.'};
}
