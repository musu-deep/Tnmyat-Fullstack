import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';

test('Development hub: official yearly days, moderated project map, source-attributed news and admin-only publishing',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tnmyat-hub-'));
 const db=openDatabase(join(dir,'community.sqlite'));
 try{
  const env={DB:db};let firstCookie='';
  async function req(endpoint,method='GET',body,cookie=''){
   const headers=new Headers({'Content-Type':'application/json','Origin':'https://tnmyat.invalid'});
   if(cookie)headers.set('Cookie',cookie);
   const response=await api(new Request('https://tnmyat.invalid/api/'+endpoint,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),env);
   const data=await response.json();
   return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  const year=await req('hub/events?year=2028');
  assert.equal(year.status,200);
  assert.ok(year.data.events.some(e=>e.title==='اليوم العالمي للبيئة'&&e.event_date==='2028-06-05'));
  const bad=await req('hub/events?year=not-a-year');assert.equal(bad.status,400);
  const user=await req('register','POST',{name:'مشارك تنموي',email:'member-hub@example.org',password:'safe-password-hub-123'});
  assert.equal(user.status,201);firstCookie=user.cookie;
  const project={title:'مشروع مياه مجتمعي',summary:'مشروع تنموي لتوفير خدمات المياه للقرى المجاورة وتوثيق نتائجه على الخارطة.',category:'المياه',country:'السعودية',city:'جدة',entity_name:'مجموعة مجتمعية',latitude:21.55,longitude:39.17,beneficiaries:230,budget:12000,stage:'active',source_url:'https://example.org/project'};
  assert.equal((await req('hub/projects','POST',project)).status,401);
  assert.equal((await req('hub/projects','POST',{...project,latitude:120},firstCookie)).status,400);
  const pending=await req('hub/projects','POST',project,firstCookie);
  assert.equal(pending.status,201);assert.equal(pending.data.status,'pending');
  assert.equal((await req('hub/projects')).data.projects.length,0);
  assert.equal((await req('hub/projects/mine','GET',undefined,firstCookie)).data.projects[0].status,'pending');
  assert.equal((await req('hub/admin/queue','GET',undefined,firstCookie)).status,403);
  assert.equal((await req('hub/admin/news','POST',{headline:'خبر دون مرجع موثق',source_name:'المصدر',source_url:'https://example.org',published_at:'2026-11-15',lane:1},firstCookie)).status,403);
  db.prepare('UPDATE users SET role=? WHERE id=?').bind('admin',user.data.user.id).run();
  const queue=await req('hub/admin/queue','GET',undefined,firstCookie);assert.equal(queue.data.projects.length,1);
  const decision=await req('hub/admin/projects/'+pending.data.id,'PATCH',{status:'published',reason:'وثائق المشروع وموقعه استوفت شروط النشر.'},firstCookie);assert.equal(decision.status,200);
  const map=await req('hub/projects');assert.equal(map.data.projects.length,1);assert.equal(map.data.summary.beneficiaries,230);
  assert.equal((await req('hub/projects?category='+encodeURIComponent('التعليم'))).data.projects.length,0);
  const news=await req('hub/admin/news','POST',{headline:'تقرير جديد عن المبادرات المجتمعية وأثرها',source_name:'الجهة المنشورة',source_url:'https://example.org/news',published_at:'2026-11-15',category:'المجتمع',lane:2},firstCookie);
  assert.equal(news.status,201,JSON.stringify(news.data));
  assert.equal((await req('hub/news')).data.news[0].lane,2);
  assert.equal((await req('hub/admin/news','POST',{headline:'خبر دون رابط https صالح',source_name:'جهة',source_url:'javascript:alert(1)',published_at:'2026-11-15',lane:1},firstCookie)).status,400);
  const event=await req('hub/admin/events','POST',{title:'ملتقى التنمية المحلي',description:'فعالية محلية',category:'local_event',event_date:'2027-03-10',end_date:'2027-03-11',recurring:false,source_url:'https://example.org/event',country:'السعودية',location:'جدة'},firstCookie);
  assert.equal(event.status,201);
  assert.ok((await req('hub/events?year=2027')).data.events.some(e=>e.title==='ملتقى التنمية المحلي'));
  assert.ok(!(await req('hub/events?year=2028')).data.events.some(e=>e.title==='ملتقى التنمية المحلي'));
  assert.ok(db.prepare('SELECT count(*) AS n FROM development_audit WHERE target_type=?').bind('development_project').first().n>0);
 }finally{db.close();await rm(dir,{recursive:true,force:true});}
});
