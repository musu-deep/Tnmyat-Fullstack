import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {openDatabase} from '../src/database.js';

async function start(file){
 const child=spawn(process.execPath,['src/server.js'],{env:{...process.env,DB_PATH:file,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','inherit']});
 for await(const line of createInterface({input:child.stdout})){
  const n=line.indexOf('http://');if(n!==-1)return {child,base:line.slice(n).trim()};
 }
 throw new Error('Could not start test server');
}
async function stop(child){if(child.exitCode!==null||child.signalCode)return;const done=once(child,'exit');child.kill();await done;}
test('Marketplace quotations, catalog and RFQ workflows enforce ownership and retain existing data',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tn-market-')),file=join(dir,'test.sqlite');
 let server;
 try{
  server=await start(file);
  async function call(path,method='GET',data,cookie){
   const r=await fetch(server.base+'/api/'+path,{method,headers:{'Content-Type':'application/json',Origin:server.base,...(cookie?{Cookie:cookie}:{})},
    body:data===undefined?undefined:JSON.stringify(data)});
   return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
  }
  async function joinAs(email,name){
   const r=await call('register','POST',{name,email,password:'Test-only-12345'});
   assert.equal(r.status,200,JSON.stringify(r.body));
   assert.ok(r.cookie);
   return r.cookie;
  }
  const seller=await joinAs('market-seller@example.org','البائع التجريبي');
  const buyer=await joinAs('market-buyer@example.org','المشتري التجريبي');
  const stranger=await joinAs('market-stranger@example.org','العضو الثالث');
  const admin=await joinAs('market-admin@example.org','مسؤول السوق');
  const db=openDatabase(file);
  db.prepare("UPDATE users SET role='admin' WHERE email='market-admin@example.org'").run();
  db.close();
  const request=await call('market/stores','POST',{name:'مصنع تنميات',description:'مصنع منتجات صناعية',kind:'manufacturer'},seller);
  assert.equal(request.status,201,JSON.stringify(request.body));
  const pending=(await call('market/admin/stores','GET',undefined,admin)).body.stores;
  const store=pending.find(s=>s.name==='مصنع تنميات');
  assert.ok(store);
  assert.equal((await call('market/stores/'+store.id+'/listings','POST',{title:'منتج قبل الاعتماد',type:'product'},seller)).status,403);
  assert.equal((await call('market/admin/stores/'+store.id,'PATCH',{status:'approved'},admin)).status,200);
  assert.equal((await call('market/stores/'+store.id+'/listings','POST',
   {title:'لوح نموذجي للصناعة',description:'مواصفات تفصيلية',type:'product',price_minor:250000},seller)).status,201);
  const listings=(await call('market/my-listings','GET',undefined,seller)).body.listings;
  assert.equal(listings.length,1);
  const listingId=listings[0].id;
  assert.equal((await call('market/listings/'+listingId,'PATCH',
   {category:'الصناعة',stock_qty:10,min_order_qty:2,sku:'S-01',image_url:'https://example.com/item.png'},stranger)).status,403);
  assert.equal((await call('market/listings/'+listingId,'PATCH',
   {category:'الصناعة',stock_qty:10,min_order_qty:2,sku:'S-01',image_url:'https://example.com/item.png'},seller)).status,200);
  const publicList=(await call('market/listings')).body.listings;
  assert.equal(publicList[0].category,'الصناعة');
  assert.equal((await call('market/inquiries','POST',{listing_id:listingId,quantity:1},buyer)).status,400);
  assert.equal((await call('market/inquiries','POST',{listing_id:listingId,quantity:3,message:'أرغب بتسعير الكمية'},buyer)).status,201);
  const incoming=(await call('market/inquiries','GET',undefined,seller)).body.inquiries;
  assert.equal(incoming.length,1);
  const inquiryId=incoming[0].id;
  assert.equal((await call('market/inquiries/'+inquiryId+'/quote','POST',{amount_minor:700000},stranger)).status,403);
  assert.equal((await call('market/inquiries/'+inquiryId+'/quote','POST',{amount_minor:700000,notes:'التوريد خلال أسبوع'},seller)).status,200);
  assert.equal((await call('market/inquiries/'+inquiryId+'/decision','PATCH',{status:'accepted'},buyer)).status,200);
  assert.equal((await call('market/rfqs','POST',{title:'توريد مواد لمشروع',description:'مطلوب عروض توريد مفصلة مع الضمانات',category:'الصناعة'},buyer)).status,201);
  const rfqs=(await call('market/rfqs')).body.rfqs;
  assert.equal(rfqs.length,1);
  assert.equal((await call('market/rfqs/'+rfqs[0].id+'/bids','POST',
   {store_id:store.id,amount_minor:900000,notes:'عرض شامل'},seller)).status,201);
  assert.equal((await call('market/rfqs/'+rfqs[0].id+'/bids','POST',
   {store_id:store.id,amount_minor:900000},seller)).status,409);
  const received=(await call('market/rfq-bids?mode=received','GET',undefined,buyer)).body.bids;
  assert.equal(received.length,1);
  assert.equal((await call('market/rfq-bids/'+received[0].id+'/select','PATCH',{},stranger)).status,403);
  assert.equal((await call('market/rfq-bids/'+received[0].id+'/select','PATCH',{},buyer)).status,200);
  assert.equal((await call('market/rfqs')).body.rfqs.length,0);
  assert.equal((await call('market/dashboard','GET',undefined,seller)).body.stats.received_inquiries,1);
  const check=openDatabase(file);
  assert.ok(check.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='member_impact_reviews'").first());
  assert.ok(check.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='market_inquiries'").first());
  check.close();
 }finally{if(server)await stop(server.child);await rm(dir,{recursive:true,force:true});}
});
