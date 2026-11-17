import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('Recovery invitation appears only after more than three bad credential responses',()=>{
 assert.match(app,/ex\.status===401 && noteFailedLogin\(data\.email\)/);
 assert.match(app,/if\(hint\)hint\.hidden=false/);
 assert.match(app,/id="loginRecoveryHint" hidden/);
 assert.match(app,/input\.name==='email'/);
 assert.match(app,/resetFailedLogin\(\)/);
 const start=app.indexOf("let failedLoginEmail=");
 const end=app.indexOf("function auth(mode)",start);
 assert.ok(start>=0&&end>start);
 const context=vm.createContext({});
 vm.runInContext(app.slice(start,end)+"\nthis.record=noteFailedLogin;this.clear=resetFailedLogin",context);
 assert.deepEqual([1,2,3,4,5].map(()=>context.record('MEMBER@example.org')),[false,false,false,true,true]);
 context.clear();
 assert.equal(context.record('member@example.org'),false);
 assert.equal(context.record('other@example.org'),false);
});

test('Revealing recovery does not reveal whether an account exists and retains existing support route',()=>{
 assert.match(app,/data-act="forgot-password"/);
 assert.match(app,/mailto:info@tnmyat\.com/);
 assert.doesNotMatch(app,/ex\.status===403 && noteFailedLogin/);
 assert.doesNotMatch(app,/ex\.status===429 && noteFailedLogin/);
});
