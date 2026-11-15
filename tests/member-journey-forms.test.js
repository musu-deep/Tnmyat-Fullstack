import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';

test('Personal actions: add and delete privately sourced news links; reject other member deletes',async()=>{
 const db=openDatabase(':memory:');
 const req=async(route,method='GET',body,cookie='')=>{
  const headers=new Headers({'Content-Type':'application/json','Origin':'https://tnmyat.invalid'});
  if(cookie)headers.set('Cookie',cookie);
  const response=await api(new Request('https://tnmyat.invalid/api/'+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),{DB:db});
  return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
 };
 try{
  const a=await req('register','POST',{name:'أول',email:'news-1@example.org',password:'member-password-123'});
  const b=await req('register','POST',{name:'ثان',email:'news-2@example.org',password:'member-password-123'});
  assert.equal(a.status,201);assert.equal(b.status,201);
  assert.equal((await req('journey/news-links')).status,401);
  const invalid=await req('journey/news-links','POST',{headline:'مرجع مسجل',source_url:'javascript:alert(1)',category:'التعليم'},a.cookie);
  assert.equal(invalid.status,400);
  const created=await req('journey/news-links','POST',{headline:'خبر عن التعليم والتطوير المؤسسي',source_url:'https://example.org/education',category:'التعليم',note:'للمراجعة لاحقا'},a.cookie);
  assert.equal(created.status,201,JSON.stringify(created.body));
  assert.equal((await req('journey/news-links','GET',undefined,a.cookie)).body.links.length,1);
  assert.equal((await req('journey/news-links','GET',undefined,b.cookie)).body.links.length,0);
  assert.equal((await req('journey/news-links/'+created.body.id,'DELETE',undefined,b.cookie)).status,404);
  assert.equal((await req('journey/news-links/'+created.body.id,'DELETE',undefined,a.cookie)).status,200);
  assert.equal((await req('journey/news-links','GET',undefined,a.cookie)).body.links.length,0);
 }finally{db.close();}
});

test('Member forms retain submit controls and map/projects/news offer direct input actions',()=>{
 const src=readFileSync(new URL('../public/journey.js',import.meta.url),'utf8');
 for(const label of ['إضافة إلى تقويمي','إضافة الهدف','حفظ تقرير الإنجاز','إضافة المهمة','حفظ في أخباري']){
  assert.match(src,new RegExp('type="submit"[^>]*>'+label));
 }
 assert.match(src,/data-hub="submit-project"/);
 assert.match(src,/journeyNewsLinkForm/);
 assert.match(src,/save-project-from-map/);
});
