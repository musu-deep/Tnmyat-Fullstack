import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {openDatabase} from '../src/database.js';

test('Impact is a reviewed member-rank criterion, not a standalone directory page or permission', async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tn-impact-')),file=join(dir,'test.sqlite');
 const child=spawn(process.execPath,['src/server.js'],{env:{...process.env,DB_PATH:file,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','inherit']});
 let base='';
 try{
  for await(const line of createInterface({input:child.stdout})){if(line.includes('http://')){base=line.slice(line.indexOf('http://')).trim();break;}}
  assert.ok(base);
  const call=async(path,method='GET',body,cookie)=>{
   const res=await fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json',Origin:base,...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
   return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
  };
  const a=await call('register','POST',{name:'عضو أثر',email:'impact-member@example.org',password:'Test-Impact-123'});
  const b=await call('register','POST',{name:'مدير اختبار',email:'impact-director@example.org',password:'Test-Impact-123'});
  assert.equal(a.status,201);assert.equal(b.status,201);
  const db=openDatabase(file);
  db.prepare("UPDATE users SET role='admin' WHERE email=?").bind('impact-director@example.org').run();db.close();
  const uid=a.body.user.id;
  const before=await call('profiles/'+uid);
  assert.equal(before.body.profile.impact_score,null);
  assert.equal((await call('impact/members/'+uid,'PUT',{score:86,evidence:'تقييم معتمد بوثائق نتائج العمل ومخرجاته'},a.cookie)).status,403);
  const review=await call('impact/members/'+uid,'PUT',{score:86,evidence:'تقييم معتمد بوثائق نتائج العمل ومخرجاته'},b.cookie);
  assert.equal(review.status,200);
  const profile=await call('profiles/'+uid);
  assert.equal(profile.body.profile.impact_score,86);
  assert.equal(profile.body.profile.impact_category,'أثر رائد');
  const people=await call('people');
  assert.ok(people.body.people.some(p=>p.id===uid&&p.impact_score===86));
  const member=await call('me','GET',undefined,a.cookie);
  assert.notEqual(member.body.user.role,'admin');
  const html=await (await fetch(base+'/')).text();
  assert.ok(!html.includes('href="/impact-members"'));
  const social=await (await fetch(base+'/social.js')).text();
  assert.ok(social.includes('verifiedImpact*2'));
  assert.ok(social.includes('impactDistinction'));
  const staff=await (await fetch(base+'/staff.js')).text();
  assert.ok(staff.includes('staffImpactRankForm'));
 }finally{
  if(child.exitCode===null&&!child.signalCode){const exited=once(child,'exit');child.kill();await exited;}
  await rm(dir,{recursive:true,force:true});
 }
});
