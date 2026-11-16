import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';

async function fixture(){
 const DB=openDatabase(':memory:');
 const req=async(path,method='GET',body,cookie='')=>{
  const headers=new Headers({'Content-Type':'application/json'});
  if(cookie)headers.set('Cookie',cookie);
  const res=await api(new Request('https://tnmyat.test/api/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),{DB});
  return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
 };
 const person=async(email)=>{const r=await req('register','POST',{name:'عضو تنموي',email,password:'samplepass-123456'});assert.equal(r.status,201,JSON.stringify(r.data));return r;};
 return {DB,req,person};
}
test('Needs require moderation and can be linked to opportunities only by the owner',async()=>{
 const {DB,req,person}=await fixture();
 try{
  const creator=await person('needs-creator@example.org'),other=await person('needs-outsider@example.org'),admin=await person('needs-admin@example.org');
  DB.prepare("UPDATE users SET role='admin' WHERE id=?").bind(admin.data.user.id).run();
  const record=await req('needs/create','POST',{title:'نحتاج مدربين متخصصين',description:'نبحث عن متطوعين لإعداد وتنفيذ ورش تدريب للمجتمع المحلي لمدة شهر.',category:'التعليم',urgency:'high',country:'السعودية',required_skills:'خبرة تدريبية'},creator.cookie);
  assert.equal(record.status,201,JSON.stringify(record.data));
  assert.equal((await req('needs/list')).data.needs.length,0);
  assert.equal((await req('needs/admin/queue','GET',undefined,other.cookie)).status,403);
  assert.equal((await req('needs/admin/'+record.data.id,'PATCH',{status:'published',note:'احتياج حقيقي بعد مراجعة بيانات الجهة والموضوع'},admin.cookie)).status,200);
  assert.equal((await req('needs/list')).data.needs.length,1);
  const opportunity={title:'تطوع لإعداد ورشة مجتمعية',description:'تنفيذ ورشة تدريبية منظمة للمشاركين مع متابعة وتقييم أداء المتدربين.',category:'التعليم',mode:'remote',arrangement:'volunteer',capacity:3,need_id:record.data.id};
  assert.equal((await req('work/opportunities','POST',opportunity,other.cookie)).status,403);
  const linked=await req('work/opportunities','POST',opportunity,creator.cookie);
  assert.equal(linked.status,201,JSON.stringify(linked.data));
  assert.equal(DB.prepare('SELECT need_id FROM development_opportunities WHERE id=?').bind(linked.data.id).first().need_id,record.data.id);
  assert.equal((await req('needs/'+record.data.id+'/close','PATCH',{},other.cookie)).status,404);
  assert.equal((await req('needs/'+record.data.id+'/close','PATCH',{},creator.cookie)).status,200);
  assert.equal((await req('needs/list')).data.needs.length,0);
 }finally{DB.close()}
});
test('Cooperation across groups needs invitation and recipient-owner approval',async()=>{
 const {DB,req,person}=await fixture();
 try{
  const a=await person('partnership-a@example.org'),b=await person('partnership-b@example.org'),c=await person('partnership-third@example.org');
  DB.prepare('INSERT INTO community_groups(name,description,owner_id) VALUES(?,?,?)').bind('مجتمع أول','تعاون تعليمي',a.data.user.id).run();
  DB.prepare('INSERT INTO community_groups(name,description,owner_id) VALUES(?,?,?)').bind('مجتمع ثان','تبادل موارد تدريبية',b.data.user.id).run();
  const [x,y]=[a,b].map(o=>DB.prepare('SELECT id FROM community_groups WHERE owner_id=?').bind(o.data.user.id).first().id);
  const invite=await req('partnerships/create','POST',{from_group_id:x,to_group_id:y,purpose:'تنفيذ ورشة تعليمية مشتركة وتبادل المدربين'},a.cookie);
  assert.equal(invite.status,201,JSON.stringify(invite.data));
  assert.equal((await req('partnerships/'+invite.data.id,'PATCH',{status:'approved'},a.cookie)).status,403);
  assert.equal((await req('partnerships/'+invite.data.id,'PATCH',{status:'approved'},c.cookie)).status,403);
  assert.equal((await req('partnerships/'+invite.data.id,'PATCH',{status:'approved'},b.cookie)).status,200);
  assert.equal((await req('partnerships/create','POST',{from_group_id:y,to_group_id:x,purpose:'تعاون جديد بين نفس المجموعتين'},b.cookie)).status,409);
  assert.equal((await req('partnerships/'+invite.data.id,'PATCH',{status:'closed'},a.cookie)).status,200);
  const recorded=DB.prepare('SELECT status FROM community_partnerships WHERE id=?').bind(invite.data.id).first();
  assert.equal(recorded.status,'closed');
 }finally{DB.close()}
});
