import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';

test('Composer generates genuine option values rather than literal +key+ placeholders',()=>{
 const code=readFileSync(new URL('../public/social.js',import.meta.url),'utf8');
 assert.ok(code.includes('<option value="\'+key+\'" '),'Expected a concatenated option value');
 assert.ok(!code.includes('value=+key+'));
 const kindNames={post:'منشور',article:'مقال',initiative:'مبادرة',question:'سؤال',announcement:'إعلان'};
 const options=Object.entries(kindNames).map(([key,label])=>'<option value="'+key+'" '+(key==='post'?'selected':'')+'>'+label+'</option>').join('');
 for(const kind of Object.keys(kindNames))assert.ok(options.includes('value="'+kind+'"'),kind);
});

test('Publication accepts every supported composer post kind',async()=>{
 const DB=openDatabase(':memory:');
 try{
  const request=async(path,method='GET',body,cookie)=>{
   const headers={'Content-Type':'application/json'};if(cookie)headers.Cookie=cookie;
   const r=await api(new Request('https://tnmyat.test/api/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),{DB});
   return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
  };
  const created=await request('register','POST',{name:'باحث',email:'post-types@example.org',password:'Secure!890'});
  assert.equal(created.status,201,JSON.stringify(created.data));
  for(const kind of ['post','article','initiative','question','announcement']){
   const r=await request('posts','POST',{body:'منشور اختباري من نوع '+kind,post_kind:kind,topic:'المجتمع'},created.cookie);
   assert.equal(r.status,201,JSON.stringify(r.data));
   assert.equal(r.data.post.post_kind,kind);
  }
 }finally{DB.close()}
});
