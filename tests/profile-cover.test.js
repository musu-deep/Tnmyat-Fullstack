import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';

test('Member cover ownership, image serving, positioning and real activity metrics', async () => {
 const DB=openDatabase(':memory:');
 async function call(path, method='GET', data, cookie) {
  const headers={'Content-Type':'application/json'};
  if(cookie)headers.Cookie=cookie;
  const res=await api(new Request('https://local.test/api/'+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)}),{DB});
  const type=res.headers.get('content-type')||'';
  return {status:res.status,body:type.includes('application/json')?await res.json():new Uint8Array(await res.arrayBuffer()),cookie:res.headers.get('set-cookie')?.split(';')[0]};
 }
 try {
  const a=await call('register','POST',{name:'عضو أول',email:'cover-a@example.org',password:'test-password-123'});
  const b=await call('register','POST',{name:'عضو ثان',email:'cover-b@example.org',password:'test-password-123'});
  assert.equal(a.status,201); assert.equal(b.status,201);
  const id=a.body.user.id;
  const bytes=readFileSync(new URL('../public/favicon.png',import.meta.url));
  const img='data:image/png;base64,'+bytes.toString('base64');
  assert.equal((await call('me/profile','PATCH',{cover:img,cover_position:75,avatar:img},a.cookie)).status,200);
  let profile=(await call('profiles/'+id)).body.profile;
  assert.equal(profile.cover_position,75);
  assert.ok(profile.cover.includes('/api/media/cover/'+id));
  const image=await call('media/cover/'+id);
  assert.equal(image.status,200);assert.deepEqual(Buffer.from(image.body),bytes);
  assert.equal((await call('me/profile','PATCH',{cover_position:-1},a.cookie)).status,400);
  assert.equal((await call('me/profile','PATCH',{cover:'data:text/html;base64,PGgxPg=='},a.cookie)).status,400);
  const post=await call('posts','POST',{body:'موضوع لاختبار الغلاف',topic:'المجتمع'},a.cookie);
  assert.equal(post.status,201);
  const comment=await call('posts/'+post.body.post.id+'/comments','POST',{body:'تعليق عضو ثان'},b.cookie);
  assert.equal(comment.status,200);
  await call('posts/'+post.body.post.id+'/like','PUT',{liked:true},b.cookie);
  await call('people/'+id+'/follow','PUT',{following:true},b.cookie);
  profile=(await call('profiles/'+id)).body.profile;
  assert.equal(profile.posts_count,1);assert.equal(profile.received_likes_count,1);assert.equal(profile.followers_count,1);
  assert.equal(profile.comments_count,0);
  assert.equal((await call('me/profile','PATCH',{cover:null,cover_position:50},b.cookie)).status,200);
  assert.ok((await call('profiles/'+id)).body.profile.cover);
  assert.equal((await call('me/profile','PATCH',{cover:null},a.cookie)).status,200);
  assert.equal((await call('profiles/'+id)).body.profile.cover,null);
  assert.equal((await call('media/cover/'+id)).status,404);
  assert.equal((await call('me/profile','PATCH',{cover:img})).status,401);
 } finally { DB.close(); }
});
