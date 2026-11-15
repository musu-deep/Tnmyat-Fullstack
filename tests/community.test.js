import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {openDatabase} from '../src/database.js';

async function start(dbPath) {
  const child = spawn(process.execPath, ['src/server.js'], {env:{...process.env, DB_PATH:dbPath,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','inherit']});
  const lines = createInterface({input:child.stdout});
  for await (const line of lines) {
    if (line.includes('http://')) return {child,base:line.slice(line.indexOf('http://'))};
  }
  throw Error('Server failed to start');
}
async function stop(child) {
  const done = once(child,'exit');
  child.kill();
  await done;
}

test('Public reading, accounts, posting, interaction, moderation and persistence', async () => {
  const dir = await mkdtemp(join(tmpdir(),'tnmyat-'));
  const file = join(dir,'test.sqlite');
  let server = await start(file);
  async function call(path, method='GET', data, cookie) {
    const headers = {'Content-Type':'application/json',Origin:server.base};
    if (cookie) headers.Cookie=cookie;
    const res=await fetch(server.base+'/api/'+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});
    return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
  }
  const member = {name:'عضو تجريبي',email:'member@example.org',password:'Test-only-12345'};
  try {
    assert.equal((await fetch(server.base+'/')).status,200);
    for (const path of ['/app.js','/style.css','/mark.svg','/reports']) {
      const asset = await fetch(server.base+path);
      assert.equal(asset.status,200,path);
      assert.ok((await asset.text()).length > 0);
    }
    const feed=await call('posts');
    assert.equal(feed.status,200);
    assert.ok(feed.body.posts.length >= 3);
    assert.equal((await call('me')).body.user,null);
    assert.ok((await call('posts','POST',{})).status>=400);
    const author=await call('register','POST',member);
    assert.ok(author.cookie,JSON.stringify(author.body));
    assert.equal((await call('me','GET',undefined,author.cookie)).body.user.name,member.name);
    const record=await call('posts','POST',{title:'مشروع تجريبي للقراءة',body:'تجربة نشر ومتابعة أثر المبادرة.',topic:'التعليم'},author.cookie);
    assert.ok(record.body.post?.id,JSON.stringify(record.body));
    const id=record.body.post.id;
    assert.equal((await fetch(server.base+'/post/'+id)).status,200);
    const other=await call('register','POST',{...member,email:'reviewer@example.org'});
    assert.ok(other.cookie);
    assert.ok((await call('posts/'+id,'DELETE',{},other.cookie)).status>=400);
    for(let i=0;i<2;i++) assert.ok((await call('posts/'+id+'/like','PUT',{liked:true},other.cookie)).status<300);
    assert.ok((await call('posts/'+id+'/comments','POST',{body:'تعليق تجريبي'},other.cookie)).status<300);
    const details=(await call('posts/'+id)).body;
    assert.equal(details.post.likes,1);
    assert.equal(details.comments[0].body,'تعليق تجريبي');
    assert.ok((await call('posts/'+id+'/report','POST',{},other.cookie)).status<300);
    assert.ok((await call('reports','GET',undefined,other.cookie)).status>=400);
    const db=openDatabase(file);
    db.prepare("UPDATE users SET role='admin' WHERE email=?").bind('reviewer@example.org').run();
    db.close();
    const reports=await call('reports','GET',undefined,other.cookie);
    assert.equal(reports.body.reports[0].post_id,id);
    assert.ok((await call('reports/'+reports.body.reports[0].id,'DELETE',{},other.cookie)).status<300);
    assert.equal((await call('reports','GET',undefined,other.cookie)).body.reports.length,0);
    assert.equal((await call('posts?topic='+encodeURIComponent('التعليم')+'&q='+encodeURIComponent('مشروع تجريبي'))).body.posts[0].id,id);
    assert.ok((await call('logout','POST',{},author.cookie)).status<300);
    assert.equal((await call('me','GET',undefined,author.cookie)).body.user,null);
    await stop(server.child);
    server=await start(file);
    const login=await call('login','POST',{email:member.email,password:member.password});
    assert.ok(login.cookie);
    assert.equal((await call('posts/'+id)).body.post.id,id);
    assert.ok((await call('posts/'+id,'DELETE',{},login.cookie)).status<300);
    assert.equal((await call('posts/'+id)).status,404);
  } finally {
    if(server.child.exitCode===null && !server.child.signalCode) await stop(server.child);
    await rm(dir,{recursive:true,force:true});
  }
});
