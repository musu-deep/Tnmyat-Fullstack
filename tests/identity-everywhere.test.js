import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';

test('Member identity across wall, feed, directory, comments, groups and inbox', async () => {
 const DB=openDatabase(':memory:');
 async function call(path,method='GET',data,cookie) {
  const headers={'Content-Type':'application/json'};
  if(cookie)headers.Cookie=cookie;
  const res=await api(new Request('https://local.test/api/'+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)}),{DB});
  return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
 }
 try{
  const a=await call('register','POST',{name:'عضو الغلاف',email:'everywhere-a@example.org',password:'test-password-123'});
  const b=await call('register','POST',{name:'عضو آخر',email:'everywhere-b@example.org',password:'test-password-123'});
  assert.equal(a.status,201);assert.equal(b.status,201);
  const avatar='data:image/png;base64,'+readFileSync(new URL('../public/favicon.png',import.meta.url)).toString('base64');
  assert.equal((await call('me/profile','PATCH',{cover:avatar,avatar,cover_position:67},a.cookie)).status,200);
  const id=a.body.user.id;
  let response=await call('me','GET',undefined,a.cookie);
  assert.equal(response.body.user.cover_position,67);
  assert.match(response.body.user.avatar,/\/api\/media\/avatar\//);
  assert.match(response.body.user.cover,/\/api\/media\/cover\//);
  response=await call('posts','POST',{body:'منشور الغلاف',topic:'المجتمع'},a.cookie);
  assert.equal(response.status,201);
  const postId=response.body.post.id;
  assert.match(response.body.post.author_cover,/\/api\/media\/cover\//);
  assert.equal(response.body.post.author_cover_position,67);
  response=await call('posts');assert.equal(response.status,200);
  assert.ok(response.body.posts.some(p=>p.id===postId&&p.author_cover));
  await call('posts/'+postId+'/comments','POST',{body:'تعليق مهم'},a.cookie);
  response=await call('posts/'+postId);assert.ok(response.body.comments.some(c=>c.author_id===id && c.author_cover));
  response=await call('people?filter=all','GET',undefined,b.cookie);
  assert.ok(response.body.people.some(person=>person.id===id&&person.cover));
  response=await call('discover','GET',undefined,b.cookie);
  assert.ok(response.body.members.some(person=>person.id===id&&person.cover));
  response=await call('groups','POST',{name:'مجموعة النمو',description:'مجموعة للاختبار'},a.cookie);
  assert.equal(response.status,201);
  const groupId=response.body.id;
  response=await call('groups/'+groupId);
  assert.match(response.body.group.owner_cover,/\/api\/media\/cover\//);
  await call('groups/'+groupId+'/notes','POST',{body:'مشاركة تجربة'},a.cookie);
  response=await call('groups/'+groupId);
  assert.ok(response.body.notes.some(n=>n.author_cover));
  await call('messages/'+b.body.user.id,'POST',{body:'رسالة تجريبية'},a.cookie);
  response=await call('messages','GET',undefined,b.cookie);
  assert.ok(response.body.conversations.some(c=>c.peer.id===id&&c.peer.cover));
 }finally{DB.close();}
});
