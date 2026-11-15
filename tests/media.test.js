import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';

test('Post editing, legacy photos, several attachments, ranges and isolation',async()=>{
  const DB=openDatabase(':memory:');
  async function req(path,method='GET',body,cookie,extra={}){
    const headers={'Content-Type':'application/json',...extra};
    if(cookie)headers.Cookie=cookie;
    return api(new Request('https://local.test'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),{DB});
  }
  const member=async i=>(await req('/api/register','POST',{email:'media'+i+'@example.org',name:'عضو '+i,password:'local-secret-123'})).headers.get('set-cookie').split(';')[0];
  const png=readFileSync(new URL('../public/favicon.png',import.meta.url));
  const picture='data:image/png;base64,'+png.toString('base64');
  try{
    const own=await member(1),other=await member(2);
    const create=await req('/api/posts','POST',{body:'صورة أولى',image:picture},own);
    const {post}=await create.json();const url='/api/posts/'+post.id;
    assert.equal(post.attachments[0].id,'legacy');
    assert.equal((await req(url,'PATCH',{version:1,keep:[]},other)).status,403);
    const bytes=Buffer.alloc(2*1024*1024+100,123);bytes.write('ID3');
    const audio={name:'مداخلة.mp3',data:'data:audio/mpeg;base64,'+bytes.toString('base64')};
    const pdf={name:'ملخص.pdf',data:'data:application/pdf;base64,'+Buffer.from('%PDF-1.7\n%%EOF').toString('base64')};
    const edit=await req(url,'PATCH',{body:'صوت وملف',version:1,keep:[],attachments:[audio,pdf]},own);
    assert.equal(edit.status,200);
    const v2=(await edit.json()).post;
    assert.equal(v2.version,2);assert.equal(v2.image,null);assert.equal(v2.attachments.length,2);
    const mp3=v2.attachments[0],doc=v2.attachments[1];
    assert.equal(mp3.name,audio.name);assert.equal(mp3.size,bytes.length);
    const part=await req(mp3.url,'GET',undefined,undefined,{Range:'bytes=190000-201000'});
    assert.equal(part.status,206);
    assert.equal(part.headers.get('content-range'),'bytes 190000-201000/'+bytes.length);
    assert.deepEqual(Buffer.from(await part.arrayBuffer()),bytes.subarray(190000,201001));
    assert.deepEqual(Buffer.from(await (await req(mp3.url)).arrayBuffer()),bytes);
    assert.equal((await req(mp3.url,'HEAD')).headers.get('content-length'),String(bytes.length));
    assert.equal((await req(mp3.url,'GET',undefined,undefined,{Range:'bytes=999999999-'})).status,416);
    assert.match((await req(doc.url)).headers.get('content-disposition'),/^attachment/);
    assert.equal((await req(url,'PATCH',{body:'نسخة قديمة',version:1,keep:[]},own)).status,409);
    assert.equal((await req(url,'PATCH',{body:'',version:2,keep:[]},own)).status,400);
    assert.equal((await req(url,'PATCH',{version:2,attachments:[{name:'x.pdf',data:picture.replace('image/png','application/pdf')}]},own)).status,400);
    const competing=await Promise.all(['جديد','تعديل متزامن'].map(body=>req(url,'PATCH',{version:2,body,keep:[doc.id],attachments:[{name:'توضيح.png',data:picture}]},own)));
    assert.deepEqual(competing.map(r=>r.status).sort(),[200,409]);
    const edited=(await (await req(url)).json()).post;
    assert.equal(edited.attachments.length,2);assert.equal(edited.version,3);
    assert.equal(edited.image,edited.attachments[1].url);
    assert.equal((await req(mp3.url)).status,404);
    assert.equal((await req('/api/media/post/'+post.id)).status,404);
    assert.equal((await req(url,'DELETE',{},own)).status,200);
    assert.equal((await req(doc.url)).status,404);
    assert.equal(DB.prepare('SELECT count(*) AS n FROM file_parts').first().n,0);
  }finally{DB.close();}
});
