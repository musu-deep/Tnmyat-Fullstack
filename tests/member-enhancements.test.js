import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';

test('Professional member preferences honor privacy, overlap recommendations and owner reminders',async()=>{
 const DB=openDatabase(':memory:');
 const req=async(path,method='GET',body,cookie='')=>{
  const headers=new Headers({'Content-Type':'application/json'});
  if(cookie)headers.set('Cookie',cookie);
  const res=await api(new Request('https://local.test/api/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),{DB});
  return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
 };
 try{
  const owner=await req('register','POST',{name:'مختص تنموي',email:'expert-intake@example.org',password:'samplepass-123456'});
  const peer=await req('register','POST',{name:'باحث تنموي',email:'expert-peer@example.org',password:'samplepass-123456'});
  assert.equal(owner.status,201);assert.equal(peer.status,201);
  const payload={professional_role:'مستشار',organization:'جهة تنموية',country:'السعودية',city:'جدة',goal:'تطوير المشاريع',sectors:['التعليم'],skills:['إدارة المشاريع','التخطيط'],participation:['خبرة واستشارات'],profile_visibility:'members',notification_window:7,news_enabled:true,onboarding_complete:true};
  const result=await req('journey/preferences','PATCH',payload,owner.cookie);
  assert.equal(result.status,200,JSON.stringify(result.data));
  assert.deepEqual(result.data.preferences.skills,payload.skills);
  assert.deepEqual(result.data.preferences.participation,payload.participation);
  assert.equal(result.data.preferences.notification_window,7);
  const found=await req('journey/people','GET',undefined,peer.cookie);
  assert.equal(found.status,200);assert.ok(found.data.people.some(p=>p.id===owner.data.user.id));
  const privateResult=await req('journey/preferences','PATCH',{...payload,profile_visibility:'private'},owner.cookie);
  assert.equal(privateResult.status,200);
  const filtered=await req('journey/people','GET',undefined,peer.cookie);
  assert.ok(!filtered.data.people.some(p=>p.id===owner.data.user.id));
  const professional=await req('journey/professional?id='+owner.data.user.id,'GET',undefined,peer.cookie);
  assert.equal(professional.data.profile,null);
  const alerts=await req('journey/alerts','GET',undefined,owner.cookie);
  assert.equal(alerts.status,200);assert.equal(alerts.data.window_days,7);
 }finally{DB.close();}
});

test('Impact review is admin only, audited, and preserves explicit verification status',async()=>{
 const DB=openDatabase(':memory:');
 const req=async(path,method='GET',body,cookie='')=>{
  const headers=new Headers({'Content-Type':'application/json'});
  if(cookie)headers.set('Cookie',cookie);
  const res=await api(new Request('https://local.test/api/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),{DB});
  return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
 };
 try{
  const member=await req('register','POST',{name:'عضو تقارير',email:'impact-author@example.org',password:'samplepass-123456'});
  const admin=await req('register','POST',{name:'مراجع',email:'impact-reviewer@example.org',password:'samplepass-123456'});
  DB.prepare('UPDATE users SET role=? WHERE id=?').bind('admin',admin.data.user.id).run();
  const report=await req('journey/impact','POST',{title:'نتيجة مشروع',outcome:'تقديم تدريب مجتمعي لعدد من المشاركين ومتابعة نتائجه',beneficiaries:25,evidence_url:'https://example.org/report'},member.cookie);
  assert.equal(report.status,201,JSON.stringify(report.data));
  assert.equal((await req('journey/impact-review','GET',undefined,member.cookie)).status,403);
  assert.equal((await req('journey/impact-review/'+report.data.id,'PATCH',{decision:'reviewed',note:'اطلعت على مرفقات التدريب والمشاركين'},member.cookie)).status,403);
  const review=await req('journey/impact-review/'+report.data.id,'PATCH',{decision:'reviewed',note:'اطلعت على وثيقة الإنجاز ودليل المستفيدين الوارد'},admin.cookie);
  assert.equal(review.status,200,JSON.stringify(review.data));
  assert.equal(DB.prepare('SELECT verification FROM member_impact WHERE id=?').bind(report.data.id).first().verification,'reviewed');
  assert.equal(DB.prepare('SELECT COUNT(*) AS n FROM member_impact_reviews WHERE impact_id=?').bind(report.data.id).first().n,1);
 }finally{DB.close();}
});

test('Member workspace exposes editable professional attributes and review forms',()=>{
 const src=readFileSync(new URL('../public/journey.js',import.meta.url),'utf8');
 for(const term of ['name="skills_text"','name="profile_visibility"','name="notification_window"','journeyPeopleSearch','journeyReview-','my-alerts'])assert.ok(src.includes(term),term);
});
