import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {openDatabase} from '../src/database.js';

test('Service cores store owned data, protect privacy and never simulate AI, media or payment settlement',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tn-services-')),file=join(dir,'db.sqlite');
 const child=spawn(process.execPath,['src/server.js'],{env:{...process.env,DB_PATH:file,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','inherit']});
 try{
  let base='';
  for await(const line of createInterface({input:child.stdout})){const at=line.indexOf('http://');if(at>=0){base=line.slice(at).trim();break;}}
  assert.ok(base);
  const call=async(path,method='GET',body,cookie)=>{
   const r=await fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json',Origin:base,...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
   return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
  };
  const register=async(name,email)=>{
   const r=await call('register','POST',{name,email,password:'Test-only-12345'});
   assert.equal(r.status,201,JSON.stringify(r.body));return {cookie:r.cookie,id:r.body.user.id};
  };
  const a=await register('العضو أ','service-a@example.org'),b=await register('العضو ب','service-b@example.org');
  const status=await call('platform/capabilities');
  assert.equal(status.status,200);
  assert.ok(status.body.capabilities.every(x=>x.mode==='disconnected'));
  assert.equal((await call('platform/ai/threads','POST',{title:'حوار بحثي'})).status,401);
  const t=await call('platform/ai/threads','POST',{title:'الحوكمة'},a.cookie);
  assert.equal(t.status,201);
  assert.equal((await call('platform/ai/threads/'+t.body.id,'GET',undefined,b.cookie)).status,404);
  const ai=await call('platform/ai/threads/'+t.body.id+'/messages','POST',{body:'حلل مفهوم الحوكمة'},a.cookie);
  assert.equal(ai.status,202);assert.equal(ai.body.generated,false);
  const msgs=await call('platform/ai/threads/'+t.body.id,'GET',undefined,a.cookie);
  assert.equal(msgs.body.messages.length,1);
  assert.equal(msgs.body.messages[0].role,'user');
  const live=await call('platform/live','POST',{title:'ندوة مجتمع تنميات'},a.cookie);
  assert.equal(live.status,201);assert.equal(live.body.state,'draft');
  assert.equal((await call('platform/live','GET')).body.sessions.length,0);
  assert.equal((await call('platform/live/'+live.body.id,'PATCH',{state:'live'},a.cookie)).status,409);
  assert.equal((await call('platform/live/'+live.body.id,'PATCH',{state:'cancelled'},a.cookie)).status,200);
  assert.equal((await call('platform/calls','POST',{callee_id:b.id,kind:'video'},a.cookie)).status,403);
  assert.equal((await call('people/'+b.id+'/friend','PUT',{action:'request'},a.cookie)).status,200);
  assert.equal((await call('people/'+a.id+'/friend','PUT',{action:'accept'},b.cookie)).status,200);
  const invitation=await call('platform/calls','POST',{callee_id:b.id,kind:'video'},a.cookie);
  assert.equal(invitation.status,201);
  assert.equal((await call('platform/calls/'+invitation.body.id,'PATCH',{status:'accepted'},a.cookie)).status,403);
  assert.equal((await call('platform/calls/'+invitation.body.id,'PATCH',{status:'accepted'},b.cookie)).status,200);
  assert.equal((await call('platform/calls/'+invitation.body.id+'/signals','GET',undefined,undefined)).status,401);
  assert.equal((await call('platform/calls/'+invitation.body.id+'/signals','POST',{signal_kind:'offer',payload:'{"sdp":"test"}'},a.cookie)).status,201);
  assert.equal((await call('platform/calls/'+invitation.body.id+'/signals','GET',undefined,b.cookie)).body.signals.length,1);
  const privacy=await call('platform/privacy','PUT',{bio_scope:'only_me',birthday_scope:'only_me',events_scope:'only_me',professional_scope:'only_me',date_of_birth:'1990-01-01',private_events:['مناسبة شخصية']},a.cookie);
  assert.equal(privacy.status,200);
  assert.equal((await call('me/profile','PATCH',{bio:'نبذة لا تظهر للآخرين'},a.cookie)).status,200);
  const visible=await call('profiles/'+a.id,'GET',undefined,b.cookie);
  assert.equal(visible.body.profile.bio,'');
  assert.equal((await call('profiles/'+a.id,'GET',undefined,a.cookie)).body.profile.bio,'نبذة لا تظهر للآخرين');
  const people=await call('people','GET',undefined,b.cookie);
  assert.ok(people.body.people.some(x=>x.id===a.id&&x.bio===''));
  const discover=await call('discover','GET',undefined,b.cookie);
  assert.ok(discover.body.members.every(x=>x.id!==a.id||x.bio===''));
  const pr=await call('platform/privacy','GET',undefined,b.cookie);
  assert.equal(pr.body.privacy.date_of_birth,null);
  const p=await call('platform/payments/orders','POST',{seller_id:b.id,subtotal_minor:12300,description:'طلب تجريبي'},a.cookie);
  assert.equal(p.status,201);assert.equal(p.body.charged,false);assert.equal(p.body.status,'draft');
  assert.equal(p.body.commission_minor,0);
  assert.equal((await call('platform/payments/orders','GET',undefined,b.cookie)).body.orders.length,1);
  assert.equal((await call('platform/reels','POST',{title:'مقطع تجريبي',media_key:'/api/files/00000000-0000-0000-0000-000000000000'},a.cookie)).status,403);
  assert.equal((await call('platform/payments/policy','GET',undefined,a.cookie)).status,403);
  const adminDb=openDatabase(file);
  adminDb.prepare("UPDATE users SET role='admin' WHERE id=?").bind(b.id).run();
  adminDb.close();
  assert.equal((await call('platform/payments/policy','PUT',{commission_basis_points:300,fixed_commission_minor:25},b.cookie)).status,200);
  const price=await call('platform/payments/orders','POST',{seller_id:b.id,subtotal_minor:12300,description:'الطلب الثاني'},a.cookie);
  assert.equal(price.status,201);
  assert.equal(price.body.commission_minor,394);

 }finally{
  if(child.exitCode===null&&!child.signalCode){const done=once(child,'exit');child.kill();await done;}
  await rm(dir,{recursive:true,force:true});
 }
});
