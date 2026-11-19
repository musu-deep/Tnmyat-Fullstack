import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {openDatabase} from '../src/database.js';

test('Market V3: protected vendor store, real product, favorites, review and nonpaying purchase request',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tn-market-v3-')),file=join(dir,'db.sqlite');
 const child=spawn(process.execPath,['src/server.js'],{env:{...process.env,DB_PATH:file,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','inherit']});
 try{
  let base='';
  for await(const line of createInterface({input:child.stdout})){const at=line.indexOf('http://');if(at>=0){base=line.slice(at).trim();break;}}
  assert.ok(base);
  const call=async(path,method='GET',body,cookie='',storeCookie='')=>{
   const headers={'Content-Type':'application/json',Origin:base};
   const all=[cookie,storeCookie].filter(Boolean).join('; ');
   if(all)headers.Cookie=all;
   const r=await fetch(base+'/api/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
   return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
  };
  const joinAs=async(name,email)=>{
   const r=await call('register','POST',{name,email,password:'Account-pass-12345'});
   assert.equal(r.status,201,JSON.stringify(r.body));
   return {cookie:r.cookie,id:r.body.user.id};
  };
  const seller=await joinAs('صاحب المتجر','seller-market-v3@example.org');
  const buyer=await joinAs('عضو مشتري','buyer-market-v3@example.org');
  const admin=await joinAs('إدارة السوق','admin-market-v3@example.org');
  const d=openDatabase(file);
  d.prepare("UPDATE users SET role='admin' WHERE id=?").bind(admin.id).run();d.close();
  assert.equal((await call('market/catalog')).status,200);
  assert.equal((await call('market/shop-onboard','POST',{name:'المتجر',slug:'store-x',kind:'producer',store_password:'Weak'},seller.cookie)).status,400);
  const created=await call('market/shop-onboard','POST',{name:'متجر المختبر التنموي',slug:'store-x',kind:'producer',description:'حلول الطاقة',store_password:'StorePassword2026'},seller.cookie);
  assert.equal(created.status,201,JSON.stringify(created.body));
  assert.equal(created.body.domain_provisioned,false);
  const sid=created.body.id;
  assert.equal((await call('market/shop/store-x')).status,404);
  assert.equal((await call('market/store-console/'+sid,'GET',undefined,seller.cookie)).status,401);
  assert.equal((await call('market/store-login','POST',{store_id:sid,store_password:'bad-password'},seller.cookie)).status,401);
  const login=await call('market/store-login','POST',{store_id:sid,store_password:'StorePassword2026'},seller.cookie);
  assert.equal(login.status,200);
  assert.ok(login.cookie?.startsWith('tn_store_session='));
  assert.equal((await call('market/store-console/'+sid,'GET',undefined,buyer.cookie,login.cookie)).status,404);
  const grant=await call('market/admin/stores/'+sid,'PATCH',{status:'approved'},admin.cookie);
  assert.equal(grant.status,200);
  assert.equal((await call('market/stores/'+sid+'/listings','POST',{title:'فحص تجاوز الحماية',type:'product'},seller.cookie)).status,403);
  assert.equal((await call('market/shop/store-x')).status,200);
  const item=await call('market/store-console/'+sid+'/items','POST',{
   title:'حزمة أدوات تعلّم',description:'مجموعة للتعلم والأنشطة',
   type:'product',category:'التعليم',price_minor:14500,stock_qty:12,
   marketing_text:'تجربة تعليمية عملية',specifications:'12 قطعة',
   image_url:'https://example.com/product.png'
  },seller.cookie,login.cookie);
  assert.equal(item.status,201,JSON.stringify(item.body));
  const itemId=item.body.id;
  const list=await call('market/catalog?q=تعلم');assert.equal(list.status,200);
  const details=await call('market/item/'+itemId);
  assert.equal(details.status,200,JSON.stringify(details.body));
  assert.equal(details.body.item.stock_qty,12);
  assert.equal((await call('market/favorites/'+itemId,'POST',{},buyer.cookie)).status,200);
  assert.equal((await call('market/favorites','GET',undefined,buyer.cookie)).body.listings.length,1);
  assert.equal((await call('market/reviews/'+itemId,'POST',{stars:5,comment:'نموذج مناسب'},seller.cookie)).status,403);
  assert.equal((await call('market/reviews/'+itemId,'POST',{stars:5,comment:'منتج موصوف جيداً'},buyer.cookie)).status,200);
  assert.equal((await call('market/item/'+itemId)).body.item.avg_stars,5);
  assert.equal((await call('market/order-request','POST',{listing_id:itemId,quantity:13},buyer.cookie)).status,400);
  const order=await call('market/order-request','POST',{listing_id:itemId,quantity:2,notes:'يرجى توضيح الشحن'},buyer.cookie);
  assert.equal(order.status,201,JSON.stringify(order.body));
  assert.equal(order.body.paid,false);
  assert.equal((await call('market/cart','POST',{listing_id:itemId,quantity:3},buyer.cookie)).status,200);
  assert.equal((await call('market/cart','GET',undefined,buyer.cookie)).body.items.length,1);
  assert.equal((await call('market/cart','GET',undefined,seller.cookie)).body.items.length,0);
  const checkout=await call('market/cart/checkout','POST',{notes:'طلب السلة التجريبي'},buyer.cookie);
  assert.equal(checkout.status,201,JSON.stringify(checkout.body));
  assert.equal(checkout.body.requests_created,1);
  assert.equal(checkout.body.charged,false);
  assert.equal((await call('market/cart','GET',undefined,buyer.cookie)).body.items.length,0);
  const requests=await call('market/store-console/'+sid+'/requests','GET',undefined,seller.cookie,login.cookie);
  assert.equal(requests.status,200);assert.equal(requests.body.requests.length,2);
  const shop=await call('market/shop/store-x');assert.equal(shop.body.listings.length,1);
  const demo=await readFile(new URL('../public/market-v3.js',import.meta.url),'utf8');
  assert.equal((demo.match(/id:'[^']+',title:/g)||[]).length,12,'twelve demonstrative models');
  assert.match(demo,/نموذج توضيحي غير قابل للشراء/);
  const check=openDatabase(file);
  assert.ok(check.prepare("SELECT name FROM sqlite_master WHERE name='market_listings'").first());
  assert.ok(check.prepare("SELECT name FROM sqlite_master WHERE name='market_member_impact_ratings'").first());
  check.close();
 }finally{
  if(child.exitCode===null&&!child.signalCode){const done=once(child,'exit');child.kill();await done;}
  await rm(dir,{recursive:true,force:true});
 }
});
