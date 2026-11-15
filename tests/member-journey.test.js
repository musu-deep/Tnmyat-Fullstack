import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';

test('Member journey: preferences, private calendars, impact, map saves and scoped collaboration',async()=>{
 const db=openDatabase(':memory:');
 async function req(route,method='GET',body,cookie=''){
  const headers={'Content-Type':'application/json','Origin':'https://tnmyat.invalid'};
  if(cookie)headers.Cookie=cookie;
  const response=await api(new Request('https://tnmyat.invalid/api/'+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),{DB:db});
  return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
 }
 try{
  const a=await req('register','POST',{name:'صاحب مشروع',email:'journey-owner@example.org',password:'passphrase-journey-123'});
  const b=await req('register','POST',{name:'متعاون',email:'journey-member@example.org',password:'passphrase-journey-123'});
  const c=await req('register','POST',{name:'مدير',email:'journey-admin@example.org',password:'passphrase-journey-123'});
  assert.equal(a.status,201);assert.equal(b.status,201);assert.equal(c.status,201);
  const owner=a.cookie,member=b.cookie,admin=c.cookie;
  assert.equal((await req('journey/preferences')).status,401);
  const saved=await req('journey/preferences','PATCH',{professional_role:'باحث',organization:'مؤسسة',country:'السودان',city:'الخرطوم',goal:'توسيع مشاريع المياه',sectors:['المياه','التعليم'],news_enabled:true,onboarding_complete:true},owner);
  assert.equal(saved.status,200);assert.deepEqual(saved.body.preferences.sectors,['المياه','التعليم']);
  assert.equal((await req('journey/preferences','PATCH',{sectors:['قطاع وهمي']},owner)).status,400);
  assert.deepEqual((await req('journey/preferences','GET',undefined,member)).body.preferences.sectors,[]);

  const day=await req('journey/calendar','POST',{title:'اجتماع شراكة',event_date:'2027-02-20',note:'مناقشة برنامج'},owner);
  assert.equal(day.status,201,JSON.stringify(day.body));
  assert.equal((await req('journey/calendar','GET',undefined,member)).body.items.length,0);
  assert.equal((await req('journey/calendar/'+day.body.id,'DELETE',undefined,member)).status,404);

  const goal=await req('journey/goals','POST',{title:'تنفيذ مشروع مياه',description:'أهداف قابلة للقياس'},owner);
  assert.equal(goal.status,201);
  const impact=await req('journey/impact','POST',{title:'توفير مياه',outcome:'استفادت مجموعة من الأسر من خدمات المياه',beneficiaries:20,evidence_url:'https://example.org/evidence',goal_id:goal.body.id},owner);
  assert.equal(impact.status,201);assert.equal(impact.body.verification,'self_reported');
  assert.equal((await req('journey/impact','GET',undefined,member)).body.reports.length,0);

  const project={title:'مبادرة المياه',summary:'مبادرة ميدانية مخصصة لتحسين الوصول إلى المياه النظيفة في المجتمعات المحلية.',category:'المياه',country:'السودان',latitude:15.5,longitude:32.6,beneficiaries:120,stage:'active'};
  const submit=await req('hub/projects','POST',project,owner);assert.equal(submit.status,201);
  assert.equal((await req('journey/map/'+submit.body.id,'PUT',{saved:true},member)).status,404);
  db.prepare('UPDATE users SET role=? WHERE id=?').bind('admin',c.body.user.id).run();
  assert.equal((await req('hub/admin/projects/'+submit.body.id,'PATCH',{status:'published',reason:'مشروع موثق مستوفٍ للبيانات'},admin)).status,200);
  assert.equal((await req('journey/map/'+submit.body.id,'PUT',{saved:true},member)).status,200);
  assert.equal((await req('journey/map','GET',undefined,member)).body.projects.length,1);
  assert.equal((await req('journey/map','GET',undefined,owner)).body.projects.length,0);

  assert.equal((await req('journey/projects/'+submit.body.id+'/work','GET',undefined,member)).status,403);
  assert.equal((await req('journey/projects/'+submit.body.id+'/join','POST',{},member)).status,200);
  assert.equal((await req('journey/projects/'+submit.body.id+'/members/'+b.body.user.id,'PATCH',{status:'approved'},owner)).status,200);
  const work=await req('journey/projects/'+submit.body.id+'/work','GET',undefined,member);
  assert.equal(work.status,200);assert.equal(work.body.owner,false);
  assert.equal((await req('journey/projects/'+submit.body.id+'/tasks','POST',{title:'مهمة غير مصرح بها'},member)).status,403);
  const task=await req('journey/projects/'+submit.body.id+'/tasks','POST',{title:'تقرير أولي',assigned_to:b.body.user.id},owner);
  assert.equal(task.status,201);
  assert.equal((await req('journey/tasks/'+task.body.id,'PATCH',{status:'done'},member)).status,200);
  assert.equal((await req('journey/tasks/'+task.body.id,'PATCH',{status:'open'},admin)).status,403);
 }finally{db.close();}
});
