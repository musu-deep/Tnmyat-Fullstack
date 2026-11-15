import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {openDatabase} from '../src/database.js';

async function launch(file){
 const child=spawn(process.execPath,['src/server.js'],{env:{...process.env,DB_PATH:file,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','inherit']});
 for await(const line of createInterface({input:child.stdout}))if(line.includes('http://'))return {child,base:line.slice(line.indexOf('http://'))};
 throw Error('Server failed');
}
test('Governance: server-side roles, immutable admin protections, hidden content, logged decisions and appeal access',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tnmyat-gov-')),file=join(dir,'db.sqlite');
 const {child,base}=await launch(file);
 async function call(path,method='GET',data,cookie){
  const headers={'Content-Type':'application/json',Origin:base};if(cookie)headers.Cookie=cookie;
  const r=await fetch(base+'/api/'+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});
  return {status:r.status,json:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
 try{
  const admin=await call('register','POST',{name:'مدير تجريبي',email:'araakdevelopment@gmail.com',password:'A-safe-pass-100'});
  const other=await call('register','POST',{name:'عضو آخر',email:'member@demo.test',password:'A-safe-pass-200'});
  assert.equal(admin.status,201);assert.equal(other.status,201);
  assert.equal((await call('admin/overview','GET',undefined,other.cookie)).status,403);
  const db=openDatabase(file);db.prepare("UPDATE users SET role='admin' WHERE email=?").bind('araakdevelopment@gmail.com').run();db.close();
  assert.equal((await call('admin/overview','GET',undefined,admin.cookie)).status,200);
  const post=await call('posts','POST',{title:'موضوع رقابي',body:'نص اختبار الإشراف وإخفاء المحتوى.',topic:'التعليم'},other.cookie);
  const id=post.json.post.id;
  assert.equal((await call('admin/posts/'+id,'PATCH',{status:'hidden',reason:'مخالفة قواعد النشر التجريبية'},other.cookie)).status,403);
  assert.equal((await call('admin/posts/'+id,'PATCH',{status:'hidden',reason:'مخالفة قواعد النشر التجريبية'},admin.cookie)).status,200);
  assert.equal((await call('posts/'+id)).status,404);
  assert.equal((await call('posts/'+id,'GET',undefined,admin.cookie)).status,200);
  const audit=(await call('admin/audit','GET',undefined,admin.cookie)).json.actions;
  assert.ok(audit.some(a=>a.target_id===id&&a.target_type==='post'&&a.action==='hidden'));
  assert.equal((await call('appeals','POST',{action_id:audit[0].id,statement:'أطلب مراجعة هذا القرار لأنني أختلف معه.'},other.cookie)).status,201);
  assert.equal((await call('admin/users/'+admin.json.user.id,'PATCH',{status:'banned',reason:'اختبار تقييد مسؤول'},admin.cookie)).status,403);
  assert.equal((await call('admin/users/'+other.json.user.id,'PATCH',{status:'suspended',days:3,reason:'مخالفة واضحة لسياسة المجتمع'},admin.cookie)).status,200);
  assert.equal((await call('login','POST',{email:'member@demo.test',password:'A-safe-pass-200'})).status,403);
  assert.equal((await call('admin/users/'+other.json.user.id,'PATCH',{status:'active',reason:'بعد انتهاء المعالجة وإعادة التقييم'},admin.cookie)).status,200);
  assert.equal((await call('login','POST',{email:'member@demo.test',password:'A-safe-pass-200'})).status,200);
 } finally {
  // Windows keeps the SQLite file locked until the child server fully exits.
  if (child.exitCode === null && child.signalCode === null) {
   const exited = once(child, 'exit');
   child.kill();
   await exited;
  }
  await rm(dir, {recursive:true,force:true});
 }
});
