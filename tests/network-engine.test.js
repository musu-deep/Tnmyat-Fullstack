import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';

async function setup(){
 const DB=openDatabase(':memory:');
 const call=async(path,method='GET',body,cookie='')=>{
  const headers=new Headers({'Content-Type':'application/json'});
  if(cookie)headers.set('Cookie',cookie);
  const res=await api(new Request('https://local.test/api/'+path,{
   method,headers,body:body===undefined?undefined:JSON.stringify(body)
  }),{DB});
  return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
 };
 const register=async(email)=>{
  const r=await call('register','POST',{name:'عضو تجربة',email,password:'samplepass-123456'});
  assert.equal(r.status,201,JSON.stringify(r.data));return r;
 };
 const preferences=async(cookie,sector,visible='members')=>{
  const result=await call('journey/preferences','PATCH',{
   professional_role:'خبير',organization:'مؤسسة',country:'السعودية',city:'الرياض',
   sectors:[sector],skills:['إدارة المشاريع'],participation:['تطوع'],goal:'التعاون في مشروع تجريبي',
   profile_visibility:visible,notification_window:14,news_enabled:true,onboarding_complete:true
  },cookie);assert.equal(result.status,200,JSON.stringify(result.data));
 };
 return {DB,call,register,preferences};
}

test('Discovery is opt-in, matches public profile interests, explains reasons and protects private profiles',async()=>{
 const {DB,call,register,preferences}=await setup();
 try{
  const a=await register('network-a@example.org'),b=await register('network-b@example.org');
  await preferences(a.cookie,'التعليم');await preferences(b.cookie,'التعليم');
  const focusPatch=async(cookie)=>{
   const current=(await call('journey/preferences','GET',undefined,cookie)).data.preferences;
   const saved=await call('journey/preferences','PATCH',{...current,focus_topics:['القراءة المبكرة']},cookie);
   assert.equal(saved.status,200,JSON.stringify(saved.data));
  };
  await focusPatch(a.cookie);await focusPatch(b.cookie);
  assert.deepEqual((await call('network/matches','GET',undefined,a.cookie)).data.people,[]);
  assert.equal((await call('network/settings','PATCH',{enabled:true},a.cookie)).status,200);
  assert.equal((await call('network/settings','PATCH',{enabled:true},b.cookie)).status,200);
  const matching=await call('network/matches','GET',undefined,a.cookie);
  assert.equal(matching.status,200,JSON.stringify(matching.data));
  const person=matching.data.people.find(p=>p.id===b.data.user.id);
  assert.ok(person);assert.match(person.reason,/القراءة المبكرة/);
  await preferences(b.cookie,'التعليم','private');
  assert.ok(!(await call('network/matches','GET',undefined,a.cookie)).data.people.some(p=>p.id===b.data.user.id));
  assert.equal((await call('network/relations','POST',{recipient_id:b.data.user.id,purpose:'تطوير أنشطة تعليمية مشتركة'},a.cookie)).status,403);
 }finally{DB.close()}
});

test('Relationship life cycle requires recipient approval, records work and labels outcomes as self-reported',async()=>{
 const {DB,call,register,preferences}=await setup();
 try{
  const a=await register('network-owner@example.org'),b=await register('network-recipient@example.org'),outsider=await register('network-outsider@example.org');
  await preferences(a.cookie,'التعليم');await preferences(b.cookie,'التعليم');
  await call('network/settings','PATCH',{enabled:true},a.cookie);
  await call('network/settings','PATCH',{enabled:true},b.cookie);
  const invitation=await call('network/relations','POST',{recipient_id:b.data.user.id,purpose:'إعداد مواد تعليمية ودليل أنشطة'},a.cookie);
  assert.equal(invitation.status,201,JSON.stringify(invitation.data));
  const id=invitation.data.id;
  assert.equal((await call('network/relations/'+id,'PATCH',{action:'accept'},a.cookie)).status,403);
  assert.equal((await call('network/relations/'+id,'PATCH',{action:'plan',next_step:'إعداد الدليل'},a.cookie)).status,400);
  assert.equal((await call('network/relations/'+id,'PATCH',{action:'accept'},outsider.cookie)).status,404);
  assert.equal((await call('network/relations/'+id,'PATCH',{action:'accept'},b.cookie)).status,200);
  assert.equal((await call('network/relations/'+id,'PATCH',{action:'plan',next_step:'إعداد مورد تجريبي قابل للاستخدام'},a.cookie)).status,200);
  const result=await call('network/relations/'+id,'PATCH',{action:'result',outcome:'أعددنا الدليل التعليمي وسلمناه للمراجعة، دون إثبات تحسن التعلم بعد'},b.cookie);
  assert.equal(result.status,200,JSON.stringify(result.data));
  assert.equal(result.data.status,'completed');
  const get=await call('network/relations','GET',undefined,a.cookie);
  assert.equal(get.data.relations.find(x=>x.id===id).status,'completed');
  assert.equal((await call('network/admin/overview','GET',undefined,a.cookie)).status,403);
  assert.equal(DB.prepare('SELECT COUNT(*) AS n FROM network_relation_events WHERE relation_id=?').bind(id).first().n,4);
  const audit=await call('network/relations/'+id+'/history','GET',undefined,a.cookie);
  assert.equal(audit.status,200);assert.equal(audit.data.history.length,4);
  assert.equal((await call('network/relations/'+id+'/history','GET',undefined,outsider.cookie)).status,404);

 }finally{DB.close()}
});
