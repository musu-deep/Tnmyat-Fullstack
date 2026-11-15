import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {openDatabase} from '../src/database.js';

test('Social feed: kinds, hashtags, saves, following, recommendations and pin protection',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tn-feed-')),dbFile=join(dir,'db.sqlite');
 const child=spawn(process.execPath,['src/server.js'],{env:{...process.env,DB_PATH:dbFile,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','inherit']});
 let base;
 try{
  for await(const line of createInterface({input:child.stdout})){if(line.includes('http://')){base=line.slice(line.indexOf('http://'));break;}}
  assert.ok(base);
  async function call(path,method='GET',body,cookie){const headers={Origin:base,'Content-Type':'application/json'};if(cookie)headers.Cookie=cookie;
    const r=await fetch(base+'/api/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  const a=await call('register','POST',{name:'عضو المبادرات',email:'test1@tnmyat.invalid',password:'safe-password-123'});
  const b=await call('register','POST',{name:'عضو المتابعة',email:'test2@tnmyat.invalid',password:'safe-password-456'});
  assert.equal(a.status,201);assert.equal(b.status,201);
  const result=await call('posts','POST',{title:'مبادرة التعليم',body:'نعمل على #مبادرات_مدرسية ونشارك النتائج.',topic:'التعليم',post_kind:'initiative'},a.cookie);
  assert.equal(result.status,201,JSON.stringify(result.data));
  const id=result.data.post.id;
  assert.equal(result.data.post.post_kind,'initiative');
  assert.equal((await call('posts?kind=initiative&tag='+encodeURIComponent('مبادرات_مدرسية'))).data.posts[0].id,id);
  assert.equal((await call('posts?kind=question')).data.posts.some(p=>p.id===id),false);
  assert.equal((await call('posts/'+id+'/bookmark','PUT',{saved:true})).status,401);
  assert.equal((await call('posts/'+id+'/bookmark','PUT',{saved:true},b.cookie)).status,200);
  assert.equal((await call('posts?view=saved','GET',undefined,b.cookie)).data.posts[0].id,id);
  assert.equal((await call('posts?view=saved')).status,401);
  assert.equal((await call('posts/'+id+'/pin','PUT',{pinned:true},b.cookie)).status,403);
  const db=openDatabase(dbFile);db.prepare("UPDATE users SET role='admin' WHERE id=?").bind(a.data.user.id).run();db.close();
  assert.equal((await call('posts/'+id+'/pin','PUT',{pinned:true},a.cookie)).status,200);
  const feed=(await call('posts','GET',undefined,a.cookie)).data.posts;
  assert.equal(feed.find(p=>p.id===id).pinned,true);
  assert.equal((await call('posts?view=following','GET',undefined,b.cookie)).data.posts.some(p=>p.id===id),false);
  assert.equal((await call('people/'+a.data.user.id+'/follow','PUT',{following:true},b.cookie)).status,200);
  assert.equal((await call('posts?view=following','GET',undefined,b.cookie)).data.posts.some(p=>p.id===id),true);
  const trends=await call('trends');
  assert.equal(trends.status,200);
  assert.ok(trends.data.tags.some(t=>t.tag==='#مبادرات_مدرسية'));
  assert.equal((await call('discover')).status,200);
  assert.equal((await call('posts?view=trending')).status,200);
  assert.equal((await call('posts/'+id+'/bookmark','PUT',{saved:false},b.cookie)).status,200);
  assert.equal((await call('posts?view=saved','GET',undefined,b.cookie)).data.posts.length,0);
 }finally{
  if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited;}
  await rm(dir,{recursive:true,force:true});
 }
});
