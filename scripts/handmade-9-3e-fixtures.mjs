// Explicitly scoped Development regression. No migrations, provider payments,
// global settings, broad cleanup, or deployment operations.
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
nextEnv.loadEnvConfig(process.cwd());
const ref = 'bdyocajhhylvasfhmnal';
const origin = 'https://proiect-site-git-task-4af756-andreioprea26x-gmailcoms-projects.vercel.app';
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== `https://${ref}.supabase.co`) throw Error('Wrong Development target');
const claims = JSON.parse(Buffer.from(process.env.SUPABASE_SERVICE_ROLE_KEY.split('.')[1], 'base64url').toString());
if (claims.ref !== ref || claims.role !== 'service_role') throw Error('Wrong privileged key');
if (process.env.EMAIL_DELIVERY_MODE !== 'redirect' || process.env.EMAIL_TEST_RECIPIENT !== 'andreioprea26x@gmail.com') throw Error('Unsafe email configuration');
const makeClient = (key) => createClient(`https://${ref}.supabase.co`, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const service = makeClient(process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = makeClient(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const path = 'test-results/handmade-9-3e-manifest.json';
const action = process.argv[2];
const hash = (x) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const checked = async (request) => { const r = await request; if (r.error) throw Error(`Supabase ${r.error.code || 'error'}: ${r.error.message}`); return r.data; };
const save = () => writeFileSync(path, JSON.stringify(m, null, 2));
let m;
async function existingBaseline() {
  const rows = await checked(service.from('products').select('id,slug,base_price,publication_status,updated_at').order('id'));
  const ids = m ? Object.values(m.products).map(p => p.id) : [];
  const old = rows.filter(p => !ids.includes(p.id));
  const inventory = await checked(service.from('inventory').select('id,product_id,variant_id,quantity,updated_at').order('id'));
  return { products: hash(old), inventory: hash(inventory.filter(i => !ids.includes(i.product_id))) };
}
if (action === 'seed') {
  if (existsSync(path)) throw Error('Manifest already exists; inspect it, do not reseed');
  mkdirSync('test-results', { recursive: true });
  const runId = `hm93e-${randomUUID().replaceAll('-', '').slice(0,12)}`;
  m = { project: ref, origin, runId, createdAt: new Date().toISOString(), products: {}, shippingId: randomUUID(), variants: [randomUUID(), randomUUID()], customizationId: randomUUID(), orders: [], checks: [], created: [] };
  for (const [kind, price] of [['standard',100], ['unique',150], ['made_to_order',200]]) m.products[kind] = { id: randomUUID(), slug: `${runId}-${kind.replaceAll('_','-')}`, price };
  m.baseline = await existingBaseline(); save();
  const products = Object.entries(m.products).map(([kind,p]) => ({ id:p.id, slug:p.slug, name:`${runId} ${kind}`, description:'Date fictive dedicate regresiei autorizate. Nu reprezintă produse de vânzare.', base_price:p.price, product_type:kind, publication_status:'published', availability_status:kind === 'standard'?'in_stock':kind, is_customizable:kind==='made_to_order', lead_time_days:2 }));
  await checked(service.from('products').insert(products)); m.created.push('products'); save();
  await checked(service.from('inventory').insert([{product_id:m.products.standard.id,quantity:4},{product_id:m.products.unique.id,quantity:1}])); m.created.push('inventory'); save();
  await checked(service.from('shipping_methods').insert({id:m.shippingId,code:m.runId,name:`Curier test ${m.runId}`,price_minor:1990,is_active:true,display_order:999})); m.created.push('shipping'); save();
  await checked(service.from('product_variants').insert(m.variants.map((id,i)=>({id,product_id:m.products.made_to_order.id,title:i?'Mare':'Mic',attributes:{marime:i?'M':'S'},price_override:i?220:210,is_active:true,display_order:i})))); m.created.push('variants'); save();
  await checked(service.from('customization_options').insert({id:m.customizationId,product_id:m.products.made_to_order.id,name:'Mesaj test',option_type:'text',additional_cost:15,is_required:true,configuration:{min_length:2,max_length:24},is_active:true})); m.created.push('customization'); save();
  console.log(JSON.stringify({seeded:true,runId,products:m.products,shippingId:m.shippingId}));
} else {
  if (!existsSync(path)) throw Error('Manifest missing');
  m=JSON.parse(readFileSync(path,'utf8'));
  if(m.project!==ref||m.origin!==origin||!/^hm93e-[a-f0-9]{12}$/.test(m.runId))throw Error('Invalid manifest');
  const ids=Object.values(m.products).map(p=>p.id);
  const owned=await checked(service.from('products').select('id,slug').in('id',ids));
  if(owned.length!==3||owned.some(p=>!p.slug.startsWith(m.runId+'-')))throw Error('Fixture ownership check failed');
  const items=await checked(service.from('order_items').select('order_id,product_id,quantity,line_subtotal_minor').in('product_id',ids));
  const orderIds=[...new Set(items.map(i=>i.order_id))];
  const orders=orderIds.length?await checked(service.from('orders').select('id,public_number,user_id,status,payment_status,payment_method,total_minor,idempotency_key').in('id',orderIds)):[];
  m.orders=orders;save();
  if(action==='inspect') {
    const payments=orderIds.length?await checked(service.from('payments').select('id,order_id,status,provider,amount_minor').in('order_id',orderIds)):[];
    const inventory=await checked(service.from('inventory').select('id,product_id,quantity').in('product_id',ids));
    const movements=inventory.length?await checked(service.from('inventory_movements').select('id,inventory_id,quantity_delta,quantity_before,quantity_after,reason,context').in('inventory_id',inventory.map(i=>i.id))):[];
    const baseline=await existingBaseline();
    const notifications=orderIds.length?await checked(service.from('notification_logs').select('id,order_id,notification_type,status,attempt_count,provider_message_id,last_error').in('order_id',orderIds)):[];
    const shipments=orderIds.length?await checked(service.from('shipments').select('id,order_id,carrier,tracking_number,tracking_url,shipped_at').in('order_id',orderIds)):[];
    const history=orderIds.length?await checked(service.from('order_status_history').select('id,order_id,from_status,to_status,request_id').in('order_id',orderIds)):[];
    const result={orders,payments,inventory,movements,notifications,shipments,history,originalProductsUnchanged:baseline.products===m.baseline.products,originalInventoryUnchanged:baseline.inventory===m.baseline.inventory};
    m.lastInspection=result;save();console.log(JSON.stringify(result));
  } else if(action==='api-regression') {
    if(m.attempts?.uniqueKeys)throw Error('API regression already started; inspect before retry');
    const guest=orders.find(o=>o.user_id===null && o.total_minor===11990);
    if(!guest)throw Error('Guest fixture order missing');
    const saved=await checked(service.from('orders').select('request_fingerprint').eq('id',guest.id).single());
    const fp=saved.request_fingerprint;
    const {lines,userId,...checkout}=fp;
    if(userId!==null||lines.some(l=>!ids.includes(l.productId)))throw Error('Replay outside fixture');
    const before=await checked(service.from('inventory').select('quantity').eq('product_id',m.products.standard.id).single());
    const replay=await checked(anon.rpc('place_cod_order',{p_idempotency_key:guest.idempotency_key,p_lines:lines,p_checkout:checkout}));
    const conflict=await checked(anon.rpc('place_cod_order',{p_idempotency_key:guest.idempotency_key,p_lines:lines,p_checkout:{...checkout,phone:'0700000001'}}));
    const insufficientKey=randomUUID();m.attempts={...(m.attempts||{}),insufficientKey};save();
    const insufficient=await checked(anon.rpc('place_cod_order',{p_idempotency_key:insufficientKey,p_lines:lines.map(l=>({...l,quantity:999})),p_checkout:checkout}));
    const uniqueKeys=[randomUUID(),randomUUID()];m.attempts.uniqueKeys=uniqueKeys;save();
    const uniqueLines=[{key:'unique-'+m.runId,productId:m.products.unique.id,variantId:null,quantity:1,customizations:[]}];
    const unique=await Promise.all(uniqueKeys.map(key=>checked(anon.rpc('place_cod_order',{p_idempotency_key:key,p_lines:uniqueLines,p_checkout:checkout}))));
    const after=await checked(service.from('inventory').select('quantity').eq('product_id',m.products.standard.id).single());
    const customer=makeClient(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    const login=await customer.auth.signInWithPassword({email:process.env.E2E_TEST_EMAIL,password:process.env.E2E_TEST_PASSWORD});
    if(login.error||login.data.user.id!=='68aff56d-5793-4ab3-90ec-27ed62588b83')throw Error('Unexpected customer fixture');
    const guestRead=await checked(customer.from('orders').select('id').eq('id',guest.id));
    const own=orders.find(o=>o.user_id===login.data.user.id);
    const ownRead=own?await checked(customer.from('orders').select('id').eq('id',own.id)):[];
    const reviews=await checked(customer.rpc('can_review_product',{p_product_id:m.products.made_to_order.id}));
    const favorite=await checked(service.from('favorites').select('product_id').eq('user_id',login.data.user.id).eq('product_id',m.products.made_to_order.id));
    const security={replaySameOrder:replay.success===true&&replay.idempotentReplay===true&&replay.orderId===guest.id,conflictRejected:conflict.code==='idempotency_conflict',insufficientRejected:insufficient.success===false,standardStockUnchanged:before.quantity===after.quantity,uniqueExactlyOneSuccess:unique.filter(r=>r.success===true).length===1,uniqueResults:unique.map(r=>({success:r.success,code:r.code,orderId:r.orderId})),customerCannotReadGuest:guestRead.length===0,customerCanReadOwn:ownRead.length===1,favoriteStored:favorite.length===1,reviewEligibility:reviews};
    await customer.auth.signOut({scope:'local'});
    m.checks.push(security);save();console.log(JSON.stringify(security));
    if(!security.replaySameOrder||!security.conflictRejected||!security.insufficientRejected||!security.standardStockUnchanged||!security.uniqueExactlyOneSuccess||!security.customerCannotReadGuest||!security.customerCanReadOwn||!security.favoriteStored)process.exitCode=1;
  } else if(action==='admin-regression') {
    if(m.adminOperations)throw Error('Admin regression already started; inspect before retry');
    const admin=makeClient(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    const customer=makeClient(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    const a=await admin.auth.signInWithPassword({email:process.env.E2E_ADMIN_EMAIL,password:process.env.E2E_ADMIN_PASSWORD});
    const c=await customer.auth.signInWithPassword({email:process.env.E2E_TEST_EMAIL,password:process.env.E2E_TEST_PASSWORD});
    if(a.error||a.data.user?.id!=='c8d87245-24f4-4237-b8a5-aac1b7b01be5'||c.error||c.data.user?.id!=='68aff56d-5793-4ab3-90ec-27ed62588b83')throw Error('Dedicated fixture login failed');
    const own=orders.find(o=>o.user_id===c.data.user.id);
    const uniqueItems=items.filter(i=>i.product_id===m.products.unique.id);
    const unique=orders.find(o=>uniqueItems.some(i=>i.order_id===o.id));
    if(!own||!unique)throw Error('Dedicated orders missing');
    m.adminOperations=[];m.adminRequests=Object.fromEntries(['progress','ready','configure','ship','collect','cancel'].map(k=>[k,randomUUID()]));save();
    const run=async(name,args)=>{
      if(args.p_order_id&&!orderIds.includes(args.p_order_id))throw Error('Order outside manifest');
      const r=await checked(admin.rpc(name,args));m.adminOperations.push({name,success:r.success,code:r.code,idempotentReplay:r.idempotentReplay});save();if(!r.success)throw Error(`Admin ${name} rejected ${r.code}`);return r;
    };
    const deny=await checked(customer.rpc('cancel_admin_order',{p_order_id:unique.id,p_request_id:randomUUID(),p_note:'Unauthorized fixture probe'}));
    if(deny.success||deny.code!=='unauthorized')throw Error('Customer acquired admin rights');
    await run('transition_admin_order_status',{p_order_id:own.id,p_to_status:'in_progress',p_request_id:m.adminRequests.progress,p_note:'Regresie fictiva HM93E'});
    await run('transition_admin_order_status',{p_order_id:own.id,p_to_status:'ready',p_request_id:m.adminRequests.ready,p_note:'Regresie fictiva HM93E'});
    await run('configure_admin_shipment',{p_order_id:own.id,p_carrier:'Curier fictiv HM93E',p_tracking_number:`HM93E-${m.runId}-002`,p_tracking_url:`https://example.invalid/${m.runId}-002`,p_request_id:m.adminRequests.configure});
    const shipArgs={p_order_id:own.id,p_request_id:m.adminRequests.ship,p_note:'Expediere fictiva, fara curier real'};
    await run('mark_admin_order_shipped',shipArgs);
    const shipReplay=await run('mark_admin_order_shipped',shipArgs);
    const collectArgs={p_order_id:own.id,p_request_id:m.adminRequests.collect};
    await run('collect_admin_cod_payment',collectArgs);
    const collectReplay=await run('collect_admin_cod_payment',collectArgs);
    const cancelArgs={p_order_id:unique.id,p_request_id:m.adminRequests.cancel,p_note:'Cleanup controlat al unicatului fictiv'};
    await run('cancel_admin_order',cancelArgs);
    const cancelReplay=await run('cancel_admin_order',cancelArgs);
    const eligible=await checked(customer.rpc('can_review_product',{p_product_id:m.products.made_to_order.id}));
    if(!eligible)throw Error('Paid/shipped customer not eligible for review');
    const review=await checked(customer.rpc('submit_verified_review',{p_product_id:m.products.made_to_order.id,p_rating:5,p_review_text:`Recenzie fictiva dedicata regresiei ${m.runId}.`}));
    if(!review.success)throw Error('Verified fixture review failed');m.reviewId=review.reviewId;save();
    const before=await checked(anon.rpc('get_approved_product_reviews',{p_product_id:m.products.made_to_order.id}));
    await run('moderate_product_review',{p_review_id:m.reviewId,p_status:'approved'});
    const approved=await checked(anon.rpc('get_approved_product_reviews',{p_product_id:m.products.made_to_order.id}));
    const duplicate=await checked(customer.rpc('submit_verified_review',{p_product_id:m.products.made_to_order.id,p_rating:4,p_review_text:`Duplicate fixture ${m.runId}`}));
    const collectionEvents=await checked(service.from('cod_collection_events').select('id').eq('order_id',own.id));
    const restored=await checked(service.from('inventory').select('quantity').eq('product_id',m.products.unique.id).single());
    const result={customerAdminDenied:true,shipReplay:shipReplay.idempotentReplay===true,collectionReplay:collectReplay.idempotentReplay===true,cancellationReplay:cancelReplay.idempotentReplay===true,collectionEventCount:collectionEvents.length,uniqueStockRestoredExactlyOnce:restored.quantity===1,reviewHiddenBeforeApproval:!before.some(r=>r.id===m.reviewId),approvedVerifiedReview:approved.some(r=>r.id===m.reviewId&&r.verified_purchase),duplicateReviewRejected:duplicate.code==='duplicate_review',reviewId:m.reviewId};
    m.adminResult=result;save();console.log(JSON.stringify(result));
    await admin.auth.signOut({scope:'local'});await customer.auth.signOut({scope:'local'});
    if(!result.shipReplay||!result.collectionReplay||!result.cancellationReplay||result.collectionEventCount!==1||!result.uniqueStockRestoredExactlyOnce||!result.approvedVerifiedReview||!result.duplicateReviewRejected)process.exitCode=1;
  } else if(action==='reset-admin-fixture') {
    if(m.adminFixturePasswordReset)throw Error('Dedicated password already reset; no automatic repeat');
    const id='c8d87245-24f4-4237-b8a5-aac1b7b01be5';
    const r=await service.auth.admin.getUserById(id);
    if(r.error||r.data.user.email!==process.env.E2E_ADMIN_EMAIL||!/test|e2e/i.test(r.data.user.email)||r.data.user.email==='andreioprea26x@gmail.com')throw Error('Not the dedicated admin fixture');
    const roles=await checked(service.from('user_roles').select('role').eq('user_id',id));
    if(!roles.some(r=>r.role==='admin'))throw Error('Existing fixture admin role missing');
    const password=randomBytes(24).toString('base64url')+'-Aa9!';
    const update=await service.auth.admin.updateUserById(id,{password});
    if(update.error)throw Error('Dedicated admin fixture password update failed');
    const local=readFileSync('.env.local','utf8');
    if(!/^E2E_ADMIN_PASSWORD=.*$/m.test(local))throw Error('Local password entry missing');
    writeFileSync('.env.local',local.replace(/^E2E_ADMIN_PASSWORD=.*$/m,`E2E_ADMIN_PASSWORD="${password}"`));
    m.adminFixturePasswordReset={userId:id,at:new Date().toISOString(),rolesUnchanged:true,storedOnlyInIgnoredLocalEnv:true};save();
    console.log(JSON.stringify(m.adminFixturePasswordReset));
  } else if(action==='engagement-inspect') {
    m.engagement={};
    for(const [table,prefix] of [['newsletter_subscribers','newsletter'],['contact_requests','contact'],['custom_order_requests','custom']]) {
      const rows=await checked(service.from(table).select('id,created_at').eq('email',`${prefix}-${m.runId}@example.invalid`));
      if(rows.some(r=>new Date(r.created_at)<new Date(m.createdAt)))throw Error('Preexisting engagement row');
      m.engagement[table]=rows.map(r=>r.id);
    }
    save();console.log(JSON.stringify(m.engagement));
  } else if(action==='cleanup') {
    // Retain all order/payment/audit/inventory history. Only archive this run's products.
    await checked(service.from('products').update({publication_status:'archived'}).in('id',ids));
    await checked(service.from('shipping_methods').update({is_active:false}).eq('id',m.shippingId).eq('code',m.runId));
    await checked(service.from('favorites').delete().eq('user_id','68aff56d-5793-4ab3-90ec-27ed62588b83').eq('product_id',m.products.made_to_order.id));
    for(const [table,prefix] of [['newsletter_subscribers','newsletter'],['contact_requests','contact'],['custom_order_requests','custom']]) {
      for(const id of m.engagement?.[table]||[])await checked(service.from(table).delete().eq('id',id).eq('email',`${prefix}-${m.runId}@example.invalid`));
    }
    const remaining=await checked(service.from('products').select('id,publication_status').in('id',ids));
    const shipping=await checked(service.from('shipping_methods').select('is_active').eq('id',m.shippingId).single());
    m.cleanup={at:new Date().toISOString(),archived:remaining.every(p=>p.publication_status==='archived'),shippingDisabled:!shipping.is_active,historyRetained:true};save();console.log(JSON.stringify(m.cleanup));
  } else if(action==='anonymous-security') {
    const results=[];
    for(const table of ['profiles','user_roles','orders','payments','inventory','newsletter_subscribers']) {
      const r=await anon.from(table).select('*').limit(0);results.push({table,denied:r.error?.code==='42501',code:r.error?.code||null});
    }
    const uid=await anon.rpc('next_order_public_number');results.push({function:'next_order_public_number',denied:['42501','PGRST202'].includes(uid.error?.code),code:uid.error?.code||null});
    m.checks.push({anonymousSecurity:results});save();console.log(JSON.stringify(results));
  } else throw Error('Unsupported action');
}
