// Dedicated, owner-authorized Sandbox fixtures. No cloud configuration changes.
import { createClient } from '@supabase/supabase-js';
import { randomUUID, createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const env=Object.fromEntries(readFileSync('C:/Users/Andrei/Desktop/proiect/.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z0-9_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim().replace(/^(['"])(.*)\1$/,'$2')];}));
const project='bdyocajhhylvasfhmnal';
const origin='https://proiect-site-git-task-4af756-andreioprea26x-gmailcoms-projects.vercel.app';
const path='C:/Users/Andrei/Desktop/proiect/test-results/handmade-9-3e-stripe-manifest.json';
if(env.NEXT_PUBLIC_SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong Development project');
const claims=JSON.parse(Buffer.from(env.SUPABASE_SERVICE_ROLE_KEY.split('.')[1],'base64url').toString());
if(claims.ref!==project||claims.role!=='service_role')throw Error('Wrong privileged key');
if(env.EMAIL_DELIVERY_MODE!=='redirect'||env.EMAIL_TEST_RECIPIENT!=='andreioprea26x@gmail.com')throw Error('Unsafe delivery mode');
const service=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const checked=async(request)=>{const r=await request;if(r.error)throw Error(`Database ${r.error.code}: ${r.error.message}`);return r.data;};
let m=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):null;
const save=()=>writeFileSync(path,JSON.stringify(m,null,2));
const hash=(x)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
async function baseline(){
 const products=await checked(service.from('products').select('id,slug,base_price,publication_status,updated_at').order('id'));
 const inventory=await checked(service.from('inventory').select('id,product_id,variant_id,quantity,updated_at').order('id'));
 return {products:hash(products.filter(p=>p.id!==m?.productId)),inventory:hash(inventory.filter(i=>i.product_id!==m?.productId))};
}
async function assertOwned(){
 if(m?.project!==project||m.origin!==origin||!/^hm93stripe-[a-f0-9]{12}$/.test(m.runId))throw Error('Invalid manifest');
 const p=await checked(service.from('products').select('id,slug').eq('id',m.productId).single());
 if(p.slug!==m.slug)throw Error('Wrong fixture product');
}
export async function seed(){
 if(m)throw Error('Manifest exists: never reseed');
 const runId=`hm93stripe-${randomUUID().replaceAll('-','').slice(0,12)}`;
 m={project,origin,runId,createdAt:new Date().toISOString(),productId:randomUUID(),shippingId:randomUUID(),slug:runId,orders:[],checks:[]};
 m.baseline=await baseline();save();
 await checked(service.from('products').insert({id:m.productId,slug:m.slug,name:runId,description:'Produs fictiv pentru regresia Stripe Sandbox autorizată.',base_price:100,product_type:'standard',publication_status:'published',availability_status:'in_stock',is_customizable:false,lead_time_days:2}));
 await checked(service.from('inventory').insert({product_id:m.productId,quantity:5}));
 await checked(service.from('shipping_methods').insert({id:m.shippingId,code:runId,name:`Curier fictiv ${runId}`,price_minor:1990,is_active:true,display_order:999}));
 m.seeded=true;save();return {runId,productId:m.productId,shippingId:m.shippingId,slug:m.slug};
}
export async function inspect(){
 await assertOwned();
 const items=await checked(service.from('order_items').select('order_id,quantity').eq('product_id',m.productId));
 const ids=[...new Set(items.map(i=>i.order_id))];
 const rows=async(table,columns,field='order_id')=>ids.length?checked(service.from(table).select(columns).in(field,ids)):[];
 const orders=await rows('orders','id,public_number,user_id,status,payment_status,payment_method,total_minor','id');
 const payments=await rows('payments','id,order_id,status,provider,amount_minor,provider_payment_id,provider_checkout_session_id');
 const reservations=await rows('stock_reservations','id,order_id,payment_id,quantity,status,expires_at');
 const inventory=await checked(service.from('inventory').select('id,quantity').eq('product_id',m.productId).single());
 const movements=await checked(service.from('inventory_movements').select('id,quantity_delta,quantity_before,quantity_after,reason,context').eq('inventory_id',inventory.id));
 const notifications=await rows('notification_logs','id,order_id,notification_type,status,attempt_count,provider_message_id,last_error');
 const refunds=payments.length?await checked(service.from('payment_refunds').select('id,payment_id,status,amount_minor,provider_refund_id').in('payment_id',payments.map(p=>p.id))):[];
 const events=await rows('stripe_webhook_events','*');
 const safeEvents=events.map(e=>Object.fromEntries(Object.entries(e).filter(([k])=>!['payload','raw_payload','metadata'].includes(k))));
 const current=await baseline();
 const result={orders,payments,reservations,inventory,movements,notifications,refunds,events:safeEvents,originalProductsUnchanged:current.products===m.baseline.products,originalInventoryUnchanged:current.inventory===m.baseline.inventory};
 m.orders=orders;m.lastInspection=result;save();return result;
}
export async function sessions(stripe){
 const info=await inspect();
 const result=[];
 for(const p of info.payments){
  if(!p.provider_checkout_session_id?.startsWith('cs_test_'))throw Error('Not a test session');
  const s=await stripe.checkout.sessions.retrieve(p.provider_checkout_session_id);
  if(s.livemode||s.metadata.order_id!==p.order_id||s.metadata.payment_id!==p.id)throw Error('Session ownership mismatch');
  result.push({id:s.id,orderId:p.order_id,status:s.status,paymentStatus:s.payment_status,amount:s.amount_total,currency:s.currency,livemode:s.livemode,paymentIntent:s.payment_intent});
 }
 m.sessions=result;save();return result;
}
export async function expire(stripe,sessionId){
 const known=await sessions(stripe);
 const s=known.find(s=>s.id===sessionId);
 if(!s||s.status!=='open')throw Error('Only own open test session can expire');
 m.expiryRequested={id:sessionId,at:new Date().toISOString()};save();
 const result=await stripe.checkout.sessions.expire(sessionId);
 return {id:result.id,status:result.status,livemode:result.livemode};
}
export async function cleanup(){
 const info=await inspect();
 if(info.reservations.some(r=>r.status==='active')||info.payments.some(p=>p.status==='pending'))throw Error('Unresolved payment/reservation');
 await checked(service.from('products').update({publication_status:'archived'}).eq('id',m.productId).eq('slug',m.slug));
 await checked(service.from('shipping_methods').update({is_active:false}).eq('id',m.shippingId).eq('code',m.runId));
 m.cleanup={at:new Date().toISOString(),productArchived:true,shippingDisabled:true,auditRetained:true};save();return m.cleanup;
}
export function manifest(){return {runId:m.runId,productId:m.productId,shippingId:m.shippingId,slug:m.slug};}
export async function finalize(stripe){
 const info=await inspect();const providerSessions=await sessions(stripe);
 const paid=info.orders.find(o=>o.public_number==='CMD-2026-00001402');
 const cancelled=info.orders.find(o=>o.public_number==='CMD-2026-00001403');
 if(!paid||!cancelled)throw Error('Missing expected fixture orders');
 const ownPayment=info.payments.find(p=>p.order_id===paid.id);
 const pi=await stripe.paymentIntents.retrieve(ownPayment.provider_payment_id,{expand:['latest_charge']});
 const latest=pi.latest_charge;
 const checks={sandboxOnly:!pi.livemode&&providerSessions.every(s=>!s.livemode),exactlyTwoOrders:info.orders.length===2,exactlyTwoPaymentRecords:info.payments.length===2,oneSuccessfulPaymentIntent:pi.status==='succeeded'&&pi.amount_received===11990,fullRefundOnce:info.refunds.length===1&&info.refunds[0].status==='succeeded'&&latest.amount_refunded===11990&&latest.refunded===true,paidOrderRefunded:paid.status==='refunded'&&paid.payment_status==='refunded',cancelledOrderSafe:cancelled.status==='cancelled'&&info.payments.find(p=>p.order_id===cancelled.id)?.status==='expired',noActiveReservations:info.reservations.every(r=>r.status!=='active'),singleInventoryDecrement:info.movements.length===1&&info.movements[0].quantity_delta===-1&&info.inventory.quantity===4,notificationsOnce:info.notifications.length===3&&info.notifications.every(n=>n.status==='sent'&&n.attempt_count===1),fourUniqueWebhookEvents:info.events.length===4&&new Set(info.events.map(e=>e.event_id)).size===4,originalProductsUnchanged:info.originalProductsUnchanged,originalInventoryUnchanged:info.originalInventoryUnchanged};
 m.finalChecks=checks;save();if(Object.values(checks).some(v=>!v))throw Error('Final integrity check failed; inspect manifest');return checks;
}
