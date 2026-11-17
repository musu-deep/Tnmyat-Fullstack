import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';

function setup(){
 const db=openDatabase(':memory:');
 const call=async(path,method='GET',body,cookie='')=>{
  const headers=new Headers({'Content-Type':'application/json'});
  if(cookie)headers.set('Cookie',cookie);
  const response=await api(new Request('https://tnmyat.test/api/'+path,{
   method,headers,body:body===undefined?undefined:JSON.stringify(body)
  }),{DB:db});
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
 };
 const create=async(email)=>{
  const r=await call('register','POST',{name:'عضو مجتمع',email,password:'Correct#2026'});
  assert.equal(r.status,201,JSON.stringify(r.data));return r;
 };
 return {db,call,create};
}

test('Staff navigation capabilities are absent by default, granted by admin only, and revoked immediately',async()=>{
 const {db,call,create}=setup();
 try{
  const admin=await create('staff-owner@example.org');
  const reviewer=await create('staff-reviewer@example.org');
  const outsider=await create('staff-outsider@example.org');
  db.prepare("UPDATE users SET role='admin' WHERE id=?").bind(admin.data.user.id).run();
  const id=reviewer.data.user.id;
  assert.deepEqual((await call('me','GET',undefined,reviewer.cookie)).data.user.permissions,[]);
  assert.equal((await call('staff/users?q=staff','GET',undefined,reviewer.cookie)).status,403);
  assert.equal((await call('staff/users/'+id+'/permissions','PATCH',{permissions:['needs_review']},outsider.cookie)).status,403);
  assert.equal((await call('staff/users/'+id+'/permissions','PATCH',{permissions:['needs_review','opportunities_review','needs_review']},admin.cookie)).status,400);
  assert.equal((await call('staff/users/'+id+'/permissions','PATCH',{permissions:['needs_review']},admin.cookie)).status,200);
  assert.deepEqual((await call('me','GET',undefined,reviewer.cookie)).data.user.permissions,['needs_review']);
  assert.equal((await call('needs/admin/queue','GET',undefined,reviewer.cookie)).status,200);
  assert.equal((await call('work/admin/queue','GET',undefined,reviewer.cookie)).status,403);
  assert.equal((await call('admin/users','GET',undefined,reviewer.cookie)).status,403);
  assert.equal((await call('staff/users/'+id+'/permissions','PATCH',{permissions:[]},admin.cookie)).status,200);
  assert.equal((await call('needs/admin/queue','GET',undefined,reviewer.cookie)).status,403);
  assert.deepEqual((await call('me','GET',undefined,reviewer.cookie)).data.user.permissions,[]);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM moderation_actions WHERE action='staff_permissions' AND target_id=?").bind(id).first().n,2);
 }finally{db.close();}
});

test('Supervisor sees only assigned review domains and cannot approve out-of-scope items',async()=>{
 const {db,call,create}=setup();
 try{
  const admin=await create('staff-admin2@example.org');
  const supervisor=await create('staff-supervisor2@example.org');
  const owner=await create('staff-owner2@example.org');
  db.prepare("UPDATE users SET role='admin' WHERE id=?").bind(admin.data.user.id).run();
  await call('staff/users/'+supervisor.data.user.id+'/permissions','PATCH',{permissions:['opportunities_review']},admin.cookie);
  const opportunity=await call('work/opportunities','POST',{title:'فرصة تدريبية',description:'فرصة لتدريب فرق مجتمعية ومساعدة المعلمين في ورش تعليمية.',category:'التعليم',mode:'remote',arrangement:'volunteer'},owner.cookie);
  assert.equal(opportunity.status,201,JSON.stringify(opportunity.data));
  const org=await call('work/organizations','POST',{name:'مؤسسة التدريب التنموية',country:'السعودية'},owner.cookie);
  assert.equal(org.status,201,JSON.stringify(org.data));
  const queue=await call('work/admin/queue','GET',undefined,supervisor.cookie);
  assert.equal(queue.status,200);
  assert.equal(queue.data.opportunities.length,1);
  assert.deepEqual(queue.data.organizations,[]);
  assert.deepEqual(queue.data.outcomes,[]);
  assert.equal((await call('work/admin/organizations/'+org.data.id,'PATCH',{status:'verified',note:'تمت المراجعة والتحقق من معلومات الجهة'},supervisor.cookie)).status,403);
  assert.equal((await call('work/admin/opportunities/'+opportunity.data.id,'PATCH',{status:'published',note:'تمت مراجعة الفرصة والتأكد من مناسبتها للنشر'},supervisor.cookie)).status,200);
  assert.equal((await call('work/metrics','GET',undefined,supervisor.cookie)).status,200);
  assert.equal((await call('staff/users/'+owner.data.user.id+'/permissions','PATCH',{permissions:['needs_review']},supervisor.cookie)).status,403);
 }finally{db.close();}
});


test('Content moderator can review community posts, groups and reports but cannot manage members or appeals',async()=>{
 const {db,call,create}=setup();
 try{
  const admin=await create('content-admin@example.org');
  const moderator=await create('content-moderator@example.org');
  const member=await create('content-member@example.org');
  db.prepare("UPDATE users SET role='admin' WHERE id=?").bind(admin.data.user.id).run();
  const grant=await call('staff/users/'+moderator.data.user.id+'/permissions','PATCH',{permissions:['content_moderation']},admin.cookie);
  assert.equal(grant.status,200,JSON.stringify(grant.data));
  assert.equal((await call('admin/posts','GET',undefined,moderator.cookie)).status,200);
  assert.equal((await call('admin/groups','GET',undefined,moderator.cookie)).status,200);
  assert.equal((await call('admin/reports','GET',undefined,moderator.cookie)).status,200);
  assert.equal((await call('admin/users','GET',undefined,moderator.cookie)).status,403);
  assert.equal((await call('admin/appeals','GET',undefined,moderator.cookie)).status,403);
  assert.equal((await call('admin/audit','GET',undefined,moderator.cookie)).status,403);
  assert.equal((await call('admin/posts','GET',undefined,member.cookie)).status,403);
  assert.equal((await call('staff/users?q=content','GET',undefined,moderator.cookie)).status,403);
  assert.equal((await call('staff/users/'+moderator.data.user.id+'/permissions','PATCH',{permissions:[]},admin.cookie)).status,200);
  assert.equal((await call('admin/posts','GET',undefined,moderator.cookie)).status,403);
 }finally{db.close();}
});


test('Director can overlap, consolidate and revoke permissions for all supervisors while retaining access',async()=>{
 const {db,call,create}=setup();
 try{
  const admin=await create('allocation-admin@example.org');
  const first=await create('allocation-first@example.org');
  const second=await create('allocation-second@example.org');
  const third=await create('allocation-third@example.org');
  db.prepare("UPDATE users SET role='admin' WHERE id=?").bind(admin.data.user.id).run();
  const ids=[first.data.user.id,second.data.user.id,third.data.user.id];
  const path='staff/assignments';
  const reason='إعادة تنظيم الإشراف وتوزيع المسؤوليات وفق حاجة المجتمع';
  assert.equal((await call(path,'PATCH',{mode:'clear_all',reason},first.cookie)).status,403);
  assert.equal((await call(path,'PATCH',{mode:'replace_scope',permission:'needs_review',user_ids:[ids[0],ids[1]],reason},admin.cookie)).status,200);
  assert.equal((await call(path,'PATCH',{mode:'replace_scope',permission:'opportunities_review',user_ids:[ids[1],ids[2]],reason},admin.cookie)).status,200);
  let overview=await call('staff/overview','GET',undefined,admin.cookie);
  assert.equal(overview.status,200);
  assert.equal(overview.data.scopes.needs_review.length,2);
  assert.equal(overview.data.scopes.opportunities_review.length,2);
  assert.deepEqual((await call('staff/me','GET',undefined,second.cookie)).data.permissions,['needs_review','opportunities_review']);
  assert.equal((await call(path,'PATCH',{mode:'replace_scope',permission:'needs_review',user_ids:[],reason},admin.cookie)).status,200);
  assert.equal((await call('needs/admin/queue','GET',undefined,first.cookie)).status,403);
  assert.equal((await call('needs/admin/queue','GET',undefined,admin.cookie)).status,200);
  const consolidate=await call(path,'PATCH',{mode:'consolidate',target_user_id:ids[0],reason},admin.cookie);
  assert.equal(consolidate.status,200,JSON.stringify(consolidate.data));
  assert.equal((await call('staff/me','GET',undefined,first.cookie)).data.permissions.length,5);
  assert.deepEqual((await call('staff/me','GET',undefined,second.cookie)).data.permissions,[]);
  assert.deepEqual((await call('staff/me','GET',undefined,third.cookie)).data.permissions,[]);
  const clear=await call(path,'PATCH',{mode:'clear_all',reason},admin.cookie);
  assert.equal(clear.status,200);
  overview=await call('staff/overview','GET',undefined,admin.cookie);
  for(const users of Object.values(overview.data.scopes))assert.equal(users.length,0);
  assert.equal((await call('admin/overview','GET',undefined,admin.cookie)).status,200);
  assert.equal((await call('staff/overview','GET',undefined,second.cookie)).status,403);
  assert.equal((await call('staff/me','GET',undefined,first.cookie)).data.permissions.length,0);
  const audit=db.prepare("SELECT COUNT(*) AS n FROM moderation_actions WHERE action LIKE 'staff_assignment_%'").first();
  assert.equal(audit.n,5);
 }finally{db.close();}
});

test('Assignment changes reject duplicate, inactive, administrative and unverified recipients without modifying records',async()=>{
 const {db,call,create}=setup();
 try{
  const admin=await create('allocation-guard-admin@example.org');
  const target=await create('allocation-guard-user@example.org');
  const inactive=await create('allocation-guard-inactive@example.org');
  db.prepare("UPDATE users SET role='admin' WHERE id=?").bind(admin.data.user.id).run();
  db.prepare("UPDATE users SET account_status='suspended' WHERE id=?").bind(inactive.data.user.id).run();
  const reason='إجراء إداري مبرر لاعتماد صلاحيات الإشراف';
  const apiPath='staff/assignments';
  assert.equal((await call(apiPath,'PATCH',{mode:'replace_scope',permission:'needs_review',user_ids:[target.data.user.id,target.data.user.id],reason},admin.cookie)).status,400);
  assert.equal((await call(apiPath,'PATCH',{mode:'replace_scope',permission:'needs_review',user_ids:[admin.data.user.id],reason},admin.cookie)).status,403);
  assert.equal((await call(apiPath,'PATCH',{mode:'consolidate',target_user_id:inactive.data.user.id,reason},admin.cookie)).status,403);
  assert.equal((await call(apiPath,'PATCH',{mode:'replace_scope',permission:'made_up',user_ids:[target.data.user.id],reason},admin.cookie)).status,400);
  assert.equal((await call(apiPath,'PATCH',{mode:'clear_all',reason:'قصير'},admin.cookie)).status,400);
  assert.deepEqual((await call('staff/me','GET',undefined,target.cookie)).data.permissions,[]);
  assert.equal((await call('staff/overview','GET',undefined,admin.cookie)).data.scopes.needs_review.length,0);
 }finally{db.close();}
});


test('Director may delegate assignment administration without giving general supervisor the director role',async()=>{
 const {db,call,create}=setup();
 try{
  const director=await create('delegate-director@example.org');
  const general=await create('delegate-general@example.org');
  const peer=await create('delegate-peer@example.org');
  const member=await create('delegate-member@example.org');
  db.prepare("UPDATE users SET role='admin' WHERE id=?").bind(director.data.user.id).run();
  const reason='تخويل رسمي لإدارة توزيع مهام المشرفين في المجتمع';
  assert.equal((await call('staff/managers/'+general.data.user.id,'PATCH',{enabled:true,reason},general.cookie)).status,403);
  assert.equal((await call('staff/managers/'+general.data.user.id,'PATCH',{enabled:true,reason},director.cookie)).status,200);
  const generalPermissions=(await call('me','GET',undefined,general.cookie)).data.user.permissions;
  assert.deepEqual(generalPermissions,['staff_manage']);
  assert.equal((await call('admin/users','GET',undefined,general.cookie)).status,403);
  assert.equal((await call('staff/users?q=delegate','GET',undefined,general.cookie)).status,200);
  assert.equal((await call('staff/users/'+member.data.user.id+'/permissions','PATCH',{permissions:['needs_review','content_moderation']},general.cookie)).status,200);
  assert.equal((await call('needs/admin/queue','GET',undefined,member.cookie)).status,200);
  assert.equal((await call('admin/posts','GET',undefined,member.cookie)).status,200);
  assert.equal((await call('staff/managers/'+peer.data.user.id,'PATCH',{enabled:true,reason},general.cookie)).status,403);
  assert.equal((await call('staff/managers/'+peer.data.user.id,'PATCH',{enabled:true,reason},director.cookie)).status,200);
  assert.equal((await call('staff/users/'+peer.data.user.id+'/permissions','PATCH',{permissions:['needs_review']},general.cookie)).status,403);
  assert.equal((await call('staff/users/'+peer.data.user.id+'/permissions','PATCH',{permissions:['needs_review']},director.cookie)).status,200);
  assert.equal((await call('staff/assignments','PATCH',{mode:'clear_all',reason},general.cookie)).status,403);
  assert.equal((await call('staff/managers/'+general.data.user.id,'PATCH',{enabled:false,reason},director.cookie)).status,200);
  assert.equal((await call('staff/users/'+member.data.user.id+'/permissions','PATCH',{permissions:[]},general.cookie)).status,403);
  assert.deepEqual((await call('me','GET',undefined,general.cookie)).data.user.permissions,[]);
  assert.equal((await call('staff/users/'+member.data.user.id+'/permissions','PATCH',{permissions:[]},director.cookie)).status,200);
 }finally{db.close();}
});
