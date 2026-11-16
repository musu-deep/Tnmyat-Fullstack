import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';
const make=async()=>{
 const db=openDatabase(':memory:');
 const call=async(path,method='GET',payload,cookie='')=>{
  const headers=new Headers({'Content-Type':'application/json'});
  if(cookie)headers.set('Cookie',cookie);
  const r=await api(new Request('https://tnmyat.test/api/'+path,{method,headers,body:payload===undefined?undefined:JSON.stringify(payload)}),{DB:db});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 };
 const register=async(email)=>{const r=await call('register','POST',{name:'عضو تنموي',email,password:'samplepass-123456'});assert.equal(r.status,201,JSON.stringify(r.data));return r;};
 return {db,call,register};
};
const opportunity={title:'مشاركة في تدريب المعلمين',description:'تقديم جلسة تدريبية أسبوعية لأعضاء فريق مبادرة تعليمية مجتمعية.',category:'التعليم',mode:'remote',arrangement:'volunteer',requirements:'خبرة في التدريب',hours_estimate:5,capacity:1,deadline:'2090-01-15'};
const project={title:'برنامج تدريب المعلمين',summary:'مشروع لتنمية قدرات المعلمين وتحسين التطبيق العملي في الصفوف خلال العام.',category:'التعليم',country:'السعودية',latitude:24.7,longitude:46.7,beneficiaries:20,budget:0,stage:'planned'};
test('Moderated opportunity requires review, accepts with capacity, and completes only after both confirmations',async()=>{
 const {db,call,register}=await make();
 try{
  const owner=await register('work-own@example.org'),candidate=await register('work-candidate@example.org'),other=await register('work-other@example.org'),admin=await register('work-admin@example.org');
  db.prepare("UPDATE users SET role='admin' WHERE id=?").bind(admin.data.user.id).run();
  const created=await call('work/opportunities','POST',opportunity,owner.cookie);
  assert.equal(created.status,201,JSON.stringify(created.data));
  assert.equal((await call('work/opportunities')).data.opportunities.length,0);
  assert.equal((await call('work/admin/queue','GET',undefined,candidate.cookie)).status,403);
  assert.equal((await call('work/admin/opportunities/'+created.data.id,'PATCH',{status:'published',note:'تمت مراجعة الجهة والشروط وإتاحة فرصة التسجيل'},admin.cookie)).status,200);
  assert.equal((await call('work/opportunities')).data.opportunities.length,1);
  const application=await call('work/opportunities/'+created.data.id+'/apply','POST',{note:'لدي خبرة في المجال'},candidate.cookie);
  assert.equal(application.status,201,JSON.stringify(application.data));
  assert.equal((await call('work/opportunities/'+created.data.id+'/applications','GET',undefined,other.cookie)).status,403);
  const accept=await call('work/opportunities/'+created.data.id+'/applications/'+candidate.data.user.id,'PATCH',{action:'accept'},owner.cookie);
  assert.equal(accept.status,200,JSON.stringify(accept.data));
  assert.equal((await call('work/opportunities/'+created.data.id+'/apply','POST',{},other.cookie)).status,409);
  assert.equal((await call('work/opportunities/'+created.data.id+'/applications/'+candidate.data.user.id,'PATCH',{action:'confirm'},other.cookie)).status,403);
  assert.equal((await call('work/opportunities/'+created.data.id+'/applications/'+candidate.data.user.id,'PATCH',{action:'confirm'},candidate.cookie)).status,200);
  const intermediate=db.prepare('SELECT status FROM opportunity_applications WHERE opportunity_id=?').bind(created.data.id).first();
  assert.equal(intermediate.status,'accepted');
  assert.equal((await call('work/opportunities/'+created.data.id+'/applications/'+candidate.data.user.id,'PATCH',{action:'confirm'},owner.cookie)).status,200);
  assert.equal(db.prepare('SELECT status FROM opportunity_applications WHERE opportunity_id=?').bind(created.data.id).first().status,'completed');
 }finally{db.close()}
});

test('Project organization verification, group owner consent and result review remain role-scoped',async()=>{
 const {db,call,register}=await make();
 try{
  const owner=await register('project-own@example.org'),groupOwner=await register('project-group@example.org'),other=await register('project-third@example.org'),admin=await register('project-admin@example.org');
  db.prepare("UPDATE users SET role='admin' WHERE id=?").bind(admin.data.user.id).run();
  const made=await call('hub/projects','POST',project,owner.cookie);
  assert.equal(made.status,201,JSON.stringify(made.data));
  const pid=made.data.id;
  const org=await call('work/organizations','POST',{name:'مؤسسة خدمات التنمية',country:'السعودية',website:'https://example.org'},owner.cookie);
  assert.equal(org.status,201,JSON.stringify(org.data));
  assert.equal((await call('work/projects/'+pid+'/organizations','POST',{organization_id:org.data.id},owner.cookie)).status,403);
  assert.equal((await call('work/admin/organizations/'+org.data.id,'PATCH',{status:'verified',note:'فحصت المستندات المتاحة وبيانات ممثل الجهة'},admin.cookie)).status,200);
  assert.equal((await call('work/projects/'+pid+'/organizations','POST',{organization_id:org.data.id},other.cookie)).status,403);
  assert.equal((await call('work/projects/'+pid+'/organizations','POST',{organization_id:org.data.id},owner.cookie)).status,200);
  db.prepare("INSERT INTO community_groups(name,description,owner_id) VALUES(?,?,?)").bind('مجموعة التدريب','الممارسات التربوية',groupOwner.data.user.id).run();
  const gid=Number(db.prepare('SELECT id FROM community_groups WHERE owner_id=?').bind(groupOwner.data.user.id).first().id);
  assert.equal((await call('work/projects/'+pid+'/groups','POST',{group_id:gid},owner.cookie)).status,200);
  assert.equal((await call('work/group-links/'+pid+'/'+gid,'PATCH',{status:'approved'},owner.cookie)).status,403);
  assert.equal((await call('work/group-links/'+pid+'/'+gid,'PATCH',{status:'approved'},groupOwner.cookie)).status,200);
  const outcome=await call('work/projects/'+pid+'/outcomes','POST',{metric:'المعلمون الذين أتموا التدريب',unit:'معلم',baseline:0,observed:12,measured_on:'2026-11-16',evidence_url:'https://example.org/proof',context:'عدد المشاركين المؤكدين من سجلات الحضور'},owner.cookie);
  assert.equal(outcome.status,201,JSON.stringify(outcome.data));
  assert.equal((await call('work/projects/'+pid+'/outcomes','POST',{metric:'مؤشر آخر',unit:'شخص',baseline:0,observed:4,measured_on:'2026-11-16'},other.cookie)).status,403);
  assert.equal((await call('work/admin/outcomes/'+outcome.data.id,'PATCH',{status:'reviewed',note:'تمت مراجعة ملف الحضور والرابط المرفق'},other.cookie)).status,403);
  assert.equal((await call('work/admin/outcomes/'+outcome.data.id,'PATCH',{status:'reviewed',note:'تمت مراجعة ملف الحضور والرابط المرفق'},admin.cookie)).status,200);
  assert.equal(db.prepare('SELECT verification FROM project_outcomes WHERE id=?').bind(outcome.data.id).first().verification,'reviewed');
  const links=await call('work/projects/'+pid+'/links','GET',undefined,owner.cookie);
  assert.equal(links.status,200);
  assert.equal(links.data.groups.length,1);assert.equal(links.data.organizations.length,1);
 }finally{db.close()}
});
