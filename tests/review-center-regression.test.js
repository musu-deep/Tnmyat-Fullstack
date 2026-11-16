import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';
const setup=()=>{
 const db=openDatabase(':memory:');
 const call=async(path,method='GET',body,cookie='')=>{
  const headers=new Headers({'Content-Type':'application/json'});
  if(cookie)headers.set('Cookie',cookie);
  const r=await api(new Request('https://tnmyat.test/api/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),{DB:db});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 };
 return {db,call};
};
test('Registration permits strong 8-character mixed passwords and existing login still works',async()=>{
 const {db,call}=setup();
 try{
  const weak=await call('register','POST',{name:'تجربة',email:'weak@example.org',password:'abcdefg'});
  assert.equal(weak.status,400);
  const created=await call('register','POST',{name:'تجربة',email:'secure-short@example.org',password:'Abc!1234'});
  assert.equal(created.status,201,JSON.stringify(created.data));
  assert.equal((await call('login','POST',{email:'secure-short@example.org',password:'Abc!1234'})).status,200);
 }finally{db.close()}
});
test('Admin consolidated queue lists pending projects, needs, opportunities and organizations; member sees their status',async()=>{
 const {db,call}=setup();
 try{
  const a=await call('register','POST',{name:'مقدم طلبات',email:'submitter-review@example.org',password:'Abc!1234'});
  const b=await call('register','POST',{name:'مشرف',email:'reviewer-review@example.org',password:'Abc!1234'});
  db.prepare("UPDATE users SET role='admin' WHERE id=?").bind(b.data.user.id).run();
  const need=await call('needs/create','POST',{title:'حاجة تدريبية مستمرة',description:'نحتاج إلى تنظيم ورش تخصصية لتدريب مجموعات المعلمين في المدارس المختلفة.',category:'التعليم',urgency:'normal'},a.cookie);
  assert.equal(need.status,201,JSON.stringify(need.data));
  const org=await call('work/organizations','POST',{name:'مؤسسة تعليمية نموذجية',country:'السعودية'},a.cookie);
  assert.equal(org.status,201,JSON.stringify(org.data));
  const opp=await call('work/opportunities','POST',{title:'إعداد مناهج تفاعلية',description:'فرصة تطوع لإعداد محتوى تعليمي وبرامج تدريب متنوعة بالتعاون مع مختصين.',category:'التعليم',mode:'remote',arrangement:'volunteer'},a.cookie);
  assert.equal(opp.status,201,JSON.stringify(opp.data));
  const mine=await call('review-center/mine','GET',undefined,a.cookie);
  assert.equal(mine.status,200,JSON.stringify(mine.data));
  assert.ok(mine.data.items.some(x=>x.kind==='need'&&x.status==='pending'));
  assert.ok(mine.data.items.some(x=>x.kind==='opportunity'&&x.status==='pending'));
  assert.equal((await call('review-center/queue','GET',undefined,a.cookie)).status,403);
  const queue=await call('review-center/queue','GET',undefined,b.cookie);
  assert.equal(queue.status,200,JSON.stringify(queue.data));
  assert.ok(queue.data.items.some(x=>x.kind==='need'&&x.id===need.data.id));
  assert.ok(queue.data.items.some(x=>x.kind==='opportunity'&&x.id===opp.data.id));
  assert.ok(queue.data.items.some(x=>x.kind==='organization'&&x.id===org.data.id));
  assert.equal((await call('needs/admin/'+need.data.id,'PATCH',{status:'published',note:'تمت مراجعة الاحتياج وأصبح جاهزاً للنشر'},b.cookie)).status,200);
  const updated=await call('review-center/mine','GET',undefined,a.cookie);
  assert.ok(updated.data.items.some(x=>x.kind==='need'&&x.status==='published'));
 }finally{db.close()}
});
