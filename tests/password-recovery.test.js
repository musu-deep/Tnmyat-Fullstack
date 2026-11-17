import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';

test('Director can issue one-use password reset; old password and sessions are invalidated',async()=>{
 const db=openDatabase(':memory:');
 try{
  async function request(path,method='GET',body,cookie){
   const headers=new Headers({'Content-Type':'application/json'});
   if(cookie)headers.set('Cookie',cookie);
   const r=await api(new Request('https://tnmyat.test/api/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),{DB:db});
   return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
  }
  const director=await request('register','POST',{name:'مدير عام',email:'recovery-admin@example.org',password:'Strong#321'});
  const member=await request('register','POST',{name:'عضو تجريبي',email:'recovery-member@example.org',password:'First#123'});
  assert.equal(director.status,201);assert.equal(member.status,201);
  db.prepare("UPDATE users SET role='admin' WHERE id=?").bind(director.data.user.id).run();
  const payload={email:'recovery-member@example.org',reason:'طلب موثق لاستعادة دخول العضو بعد التحقق من هويته'};
  assert.equal((await request('admin/password-recovery','POST',payload,member.cookie)).status,403);
  const issued=await request('admin/password-recovery','POST',payload,director.cookie);
  assert.equal(issued.status,200,JSON.stringify(issued.data));
  const token=new URL(issued.data.reset_url).searchParams.get('token');
  assert.match(token,/^[0-9a-f]{64}$/);
  assert.equal(issued.data.expires_minutes,30);
  const saved=db.prepare('SELECT token_hash FROM password_reset_tokens WHERE user_id=?').bind(member.data.user.id).first();
  assert.ok(saved);assert.notEqual(saved.token_hash,token);
  assert.equal((await request('password-recovery/complete','POST',{token,password:'weak',confirm_password:'weak'})).status,400);
  assert.equal((await request('password-recovery/complete','POST',{token,password:'Another#123',confirm_password:'Mismatch#123'})).status,400);
  const reset=await request('password-recovery/complete','POST',{token,password:'Another#123',confirm_password:'Another#123'});
  assert.equal(reset.status,200,JSON.stringify(reset.data));
  assert.equal((await request('password-recovery/complete','POST',{token,password:'Again#123',confirm_password:'Again#123'})).status,400);
  assert.equal((await request('login','POST',{email:'recovery-member@example.org',password:'First#123'})).status,401);
  assert.equal((await request('login','POST',{email:'recovery-member@example.org',password:'Another#123'})).status,200);
  assert.equal((await request('me','GET',undefined,member.cookie)).data.user,null);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM password_reset_tokens').first().n,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM moderation_actions WHERE action IN ('password_recovery_issued','password_recovery_completed')").first().n,2);
 }finally{db.close();}
});

test('Reset links cannot be issued for nonexistent or inactive accounts',async()=>{
 const db=openDatabase(':memory:');
 try{
  async function request(path,body,cookie){
   const headers=new Headers({'Content-Type':'application/json'});
   if(cookie)headers.set('Cookie',cookie);
   const r=await api(new Request('https://tnmyat.test/api/'+path,{method:'POST',headers,body:JSON.stringify(body)}),{DB:db});
   return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
  }
  const a=await request('register',{name:'مدير',email:'recover-guard-admin@example.org',password:'Strong#123'});
  const b=await request('register',{name:'عضو',email:'recover-guard-member@example.org',password:'Strong#123'});
  db.prepare("UPDATE users SET role='admin' WHERE id=?").bind(a.data.user.id).run();
  const reason='سبب مشروع ومفصل لإصدار رابط استعادة الحساب';
  assert.equal((await request('admin/password-recovery',{email:'nobody@example.org',reason},a.cookie)).status,404);
  db.prepare("UPDATE users SET account_status='suspended' WHERE id=?").bind(b.data.user.id).run();
  assert.equal((await request('admin/password-recovery',{email:'recover-guard-member@example.org',reason},a.cookie)).status,403);
 }finally{db.close();}
});
