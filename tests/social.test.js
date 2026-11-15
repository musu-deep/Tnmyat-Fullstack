import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';

test('Pictures, presence, social graph, reposts and private conversations',async()=>{
  const DB=openDatabase(':memory:');
  async function call(path,method='GET',data,session){
    const headers={'Content-Type':'application/json'};
    if(session)headers.Cookie=session;
    const res=await api(new Request('https://local.test/api/'+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)}),{DB});
    return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
  }
  try {
    const reg=i=>call('register','POST',{name:'عضو '+i,email:'p'+i+'@example.org',password:'test-members-123'});
    const a=await reg(1),b=await reg(2),third=await reg(3);
    const aid=a.body.user.id,bid=b.body.user.id;
    const raw=readFileSync(new URL('../public/favicon.png',import.meta.url));
    const photo='data:image/png;base64,'+raw.toString('base64');
    const edit=await call('me/profile','PATCH',{bio:'مختص في التعليم',avatar:photo},a.cookie);
    assert.equal(edit.status,200);
    const avatar=edit.body.user.avatar;
    const image=await api(new Request('https://local.test'+avatar),{DB});
    assert.deepEqual(Buffer.from(await image.arrayBuffer()),raw);
    assert.equal((await call('heartbeat','POST',{},a.cookie)).status,200);
    assert.ok((await call('people?filter=online','GET',undefined,b.cookie)).body.people.some(p=>p.id===aid));
    const relation='people/'+bid+'/';
    await call(relation+'follow','PUT',{following:true},a.cookie);
    await call(relation+'follow','PUT',{following:true},a.cookie);
    assert.equal((await call('profiles/'+bid)).body.profile.followers_count,1);
    await call(relation+'friend','PUT',{action:'request'},a.cookie);
    assert.ok((await call(relation+'friend','PUT',{action:'accept'},a.cookie)).status>=400);
    assert.equal((await call('people/'+aid+'/friend','PUT',{action:'accept'},b.cookie)).status,200);
    assert.equal((await call('profiles/'+bid)).body.profile.friends_count,1);
    const post=await call('posts','POST',{body:'بوستر تنموي',image:photo,topic:'المجتمع'},a.cookie);
    assert.equal(post.status,201,JSON.stringify(post.body));
    const id=post.body.post.id;
    assert.equal((await call('posts/'+id+'/repost','PUT',{reposted:true},b.cookie)).status,200);
    assert.equal((await call('profiles/'+bid)).body.profile.reposts_count,1);
    assert.ok((await call('posts?user='+bid)).body.posts.some(p=>p.id===id));
    assert.equal((await call('messages/'+bid,'POST',{body:'رسالة تخص العضوين فقط'},a.cookie)).status,201);
    assert.equal((await call('messages','GET',undefined,b.cookie)).body.conversations[0].unread,1);
    assert.equal((await call('messages/'+aid,'GET',undefined,b.cookie)).body.messages[0].body,'رسالة تخص العضوين فقط');
    assert.equal((await call('messages/'+aid,'GET',undefined,third.cookie)).body.messages.length,0);
    assert.equal((await call('messages','GET',undefined,third.cookie)).body.conversations.length,0);
    assert.equal((await call('messages/'+bid)).status,401);
    assert.equal((await call('messages','GET',undefined,b.cookie)).body.conversations[0].unread,0);
  }finally{DB.close();}
});
