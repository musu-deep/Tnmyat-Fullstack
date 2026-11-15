import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/database.js';
import { api } from '../src/api.js';

test('Group membership, discussion and scoped moderation', async () => {
  const DB=openDatabase(':memory:');
  async function call(path,method='GET',body,session){
    const headers={'Content-Type':'application/json'};
    if(session)headers.Cookie=session;
    const response=await api(new Request('https://local.test/api/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),{DB});
    return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  try {
    const account = i=>call('register','POST',{email:'group'+i+'@example.org',name:'عضو '+i,password:'local-test-12345'});
    const a=await account(1),b=await account(2),c=await account(3);
    const created=await call('groups','POST',{name:'مجتمع المعرفة',description:'نقاش عام للمعرفة.'},a.cookie);
    assert.equal(created.status,201);
    const path='groups/'+created.body.id;
    assert.equal((await call(path)).body.group.member_count,1);
    assert.equal((await call(path+'/notes','POST',{body:'مشاركة'},b.cookie)).status,403);
    assert.equal((await call(path+'/join','POST',{},b.cookie)).status,200);
    await call(path+'/join','POST',{},b.cookie);
    assert.equal((await call(path)).body.group.member_count,2);
    await call(path+'/notes','POST',{body:'نقاش تجريبي'},a.cookie);
    const details=(await call(path)).body;
    assert.equal(details.notes[0].body,'نقاش تجريبي');
    assert.equal(details.members.length,0);
    const target=path+'/members/'+b.body.user.id;
    assert.equal((await call(target,'PUT',{status:'moderator'},c.cookie)).status,403);
    assert.equal((await call(target,'PUT',{status:'moderator'},a.cookie)).status,200);
    await call(path+'/notes/'+details.notes[0].id,'DELETE',{},b.cookie);
    assert.equal((await call(path)).body.notes.length,0);
    await call(target,'PUT',{status:'blocked'},a.cookie);
    assert.equal((await call(path+'/join','POST',{},b.cookie)).status,403);
    await call(path+'/leave','POST',{},b.cookie);
    assert.equal((await call(path+'/notes','POST',{body:'مشاركة'},b.cookie)).status,403);
    assert.equal((await call(path)).body.group.member_count,1);
  }finally{DB.close();}
});
