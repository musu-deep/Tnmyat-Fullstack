import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openDatabase} from '../src/database.js';
import {api} from '../src/api.js';

function setup(){
 const DB=openDatabase(':memory:');
 const call=async(path,method='GET',body,cookie)=>{
  const headers=new Headers({'Content-Type':'application/json'});
  if(cookie)headers.set('Cookie',cookie);
  const res=await api(new Request('https://tnmyat.test/api/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),{DB});
  return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
 };
 const create=(email)=>call('register','POST',{email,name:'عضو تنميات',password:'OldPass#123'});
 return {DB,call,create};
}

test('Temporary password recovery is admin only, does not open a session and forces password change',async()=>{
 const {DB,call,create}=setup();
 try{
  const director=await create('temp-director@example.org'),member=await create('temp-member@example.org'),outsider=await create('temp-outsider@example.org');
  assert.equal(member.status,201);
  DB.prepare("UPDATE users SET role='admin' WHERE id=?").bind(director.data.user.id).run();
  const body={email:'temp-member@example.org',reason:'تم التحقق من هوية العضو وإصدار كلمة مرور مؤقتة'};
  assert.equal((await call('admin/password-recovery/temporary','POST',body,outsider.cookie)).status,403);
  const issued=await call('admin/password-recovery/temporary','POST',body,director.cookie);
  assert.equal(issued.status,200,JSON.stringify(issued.data));
  assert.match(issued.data.temporary_password,/^TN-[0-9a-f]{32}$/);
  assert.equal(issued.data.expires_minutes,30);
  const stored=DB.prepare('SELECT password_hash,salt FROM temporary_passwords WHERE user_id=?').bind(member.data.user.id).first();
  assert.ok(stored);assert.ok(!JSON.stringify(stored).includes(issued.data.temporary_password));
  assert.equal((await call('login','POST',{email:body.email,password:'not-correct'})).status,401);
  const temporaryLogin=await call('login','POST',{email:body.email,password:issued.data.temporary_password});
  assert.equal(temporaryLogin.status,200);
  assert.equal(temporaryLogin.data.password_change_required,true);
  assert.match(temporaryLogin.data.change_token,/^[0-9a-f]{64}$/);
  assert.equal(temporaryLogin.cookie,undefined);
  assert.equal((await call('me','GET',undefined,temporaryLogin.cookie)).data.user,null);
  assert.equal((await call('password-recovery/temporary-complete','POST',{token:temporaryLogin.data.change_token,password:'Changed#123',confirm_password:'wrong'})).status,400);
  const completed=await call('password-recovery/temporary-complete','POST',{token:temporaryLogin.data.change_token,password:'Changed#123',confirm_password:'Changed#123'});
  assert.equal(completed.status,200,JSON.stringify(completed.data));
  assert.equal((await call('password-recovery/temporary-complete','POST',{token:temporaryLogin.data.change_token,password:'Again#123',confirm_password:'Again#123'})).status,400);
  assert.equal((await call('login','POST',{email:body.email,password:issued.data.temporary_password})).status,401);
  assert.equal((await call('login','POST',{email:body.email,password:'OldPass#123'})).status,401);
  assert.equal((await call('login','POST',{email:body.email,password:'Changed#123'})).status,200);
  assert.equal((await call('me','GET',undefined,member.cookie)).data.user,null);
  assert.equal(DB.prepare('SELECT COUNT(*) AS n FROM temporary_passwords').first().n,0);
  assert.equal(DB.prepare('SELECT COUNT(*) AS n FROM temporary_password_challenges').first().n,0);
  assert.equal(DB.prepare("SELECT COUNT(*) AS n FROM moderation_actions WHERE action IN ('temporary_password_issued','temporary_password_completed')").first().n,2);
 }finally{DB.close();}
});

test('Expired and replaced temporary credentials are rejected; locked accounts and peers remain protected',async()=>{
 const {DB,call,create}=setup();
 try{
  const director=await create('temp-admin-guard@example.org');
  const member=await create('temp-member-guard@example.org');
  const otherAdmin=await create('temp-peer-admin@example.org');
  DB.prepare("UPDATE users SET role='admin' WHERE id IN (?,?)").bind(director.data.user.id,otherAdmin.data.user.id).run();
  const reason='تم التأكد من طلب استعادة الحساب عبر إدارة تنميات';
  assert.equal((await call('admin/password-recovery/temporary','POST',{email:'temp-peer-admin@example.org',reason},director.cookie)).status,403);
  assert.equal((await call('admin/password-recovery/temporary','POST',{email:'absent@example.org',reason},director.cookie)).status,404);
  const first=await call('admin/password-recovery/temporary','POST',{email:'temp-member-guard@example.org',reason},director.cookie);
  const second=await call('admin/password-recovery/temporary','POST',{email:'temp-member-guard@example.org',reason},director.cookie);
  assert.equal(first.status,200);assert.equal(second.status,200);
  assert.notEqual(first.data.temporary_password,second.data.temporary_password);
  assert.equal((await call('login','POST',{email:'temp-member-guard@example.org',password:first.data.temporary_password})).status,401);
  const start=await call('login','POST',{email:'temp-member-guard@example.org',password:second.data.temporary_password});
  assert.equal(start.data.password_change_required,true);
  DB.prepare('UPDATE temporary_password_challenges SET expires_at=unixepoch()-1 WHERE user_id=?').bind(member.data.user.id).run();
  assert.equal((await call('password-recovery/temporary-complete','POST',{token:start.data.change_token,password:'NewPassword#7',confirm_password:'NewPassword#7'})).status,400);
  DB.prepare('UPDATE temporary_passwords SET expires_at=unixepoch()-1 WHERE user_id=?').bind(member.data.user.id).run();
  assert.equal((await call('login','POST',{email:'temp-member-guard@example.org',password:second.data.temporary_password})).status,401);
  assert.equal((await call('login','POST',{email:'temp-member-guard@example.org',password:'OldPass#123'})).status,200);
  DB.prepare("UPDATE users SET account_status='suspended' WHERE id=?").bind(member.data.user.id).run();
  assert.equal((await call('admin/password-recovery/temporary','POST',{email:'temp-member-guard@example.org',reason},director.cookie)).status,403);
 }finally{DB.close();}
});

test('A recovery link invalidates issued temporary credentials; temporary issuance invalidates prior link',async()=>{
 const {DB,call,create}=setup();
 try{
  const director=await create('temp-cross-admin@example.org'),member=await create('temp-cross-member@example.org');
  DB.prepare("UPDATE users SET role='admin' WHERE id=?").bind(director.data.user.id).run();
  const body={email:'temp-cross-member@example.org',reason:'استعادة حساب العضو بعد التحقق من هويته'};
  const first=await call('admin/password-recovery/temporary','POST',body,director.cookie);
  const link=await call('admin/password-recovery','POST',body,director.cookie);
  assert.equal(first.status,200);assert.equal(link.status,200);
  assert.equal((await call('login','POST',{email:body.email,password:first.data.temporary_password})).status,401);
  const second=await call('admin/password-recovery/temporary','POST',body,director.cookie);
  assert.equal(second.status,200);
  const token=new URL(link.data.reset_url).searchParams.get('token');
  assert.equal((await call('password-recovery/complete','POST',{token,password:'NewPassword#8',confirm_password:'NewPassword#8'})).status,400);
  assert.equal(DB.prepare('SELECT COUNT(*) AS n FROM temporary_passwords WHERE user_id=?').bind(member.data.user.id).first().n,1);
 }finally{DB.close();}
});

test('Temporary recovery UI offers dual admin methods and forced password change',()=>{
 const staff=readFileSync(new URL('../public/staff.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(staff,/value="temporary"/);assert.match(staff,/value="link"/);
 assert.match(staff,/admin\/password-recovery\/temporary/);
 assert.match(app,/password_change_required/);
 assert.match(app,/temporaryPasswordChangeForm/);
 assert.match(app,/password-recovery\/temporary-complete/);
 assert.match(app,/new FormData\(form,e\.submitter\)/);
 assert.doesNotThrow(()=>new Function(app));
 assert.doesNotThrow(()=>new Function(staff));
});
