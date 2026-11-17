import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
test('Staff shield is hidden by default and shown only for manager role or delegated permissions',()=>{
 const html=file('index.html'),app=file('app.js'),styles=file('staff.css'),staff=file('staff.js');
 assert.match(html,/id="staffNavEntry"[^>]*hidden/);
 assert.match(html,/id="staffMobileEntry"[^>]*hidden/);
 assert.match(app,/user\.role==='admin'\|\|\(Array\.isArray\(user\.permissions\)/);
 assert.match(app,/item\.hidden=!isStaff/);
 assert.match(app,/renderStaff\(token\)/);
 assert.match(styles,/#staffNavEntry\[hidden\],#staffMobileEntry\[hidden\]\{display:none!important\}/);
 assert.match(styles,/@media\(max-width:680px\)/);
 assert.match(staff,/staffAllowed\(item\.permission\)/);
 assert.doesNotThrow(()=>new Function(staff));
});
test('Staff role grants use explicit server-side permissions and member dropdown does not contain administration',()=>{
 const account=file('account.js'),journey=file('journey.js'),staff=file('staff.js');
 assert.doesNotMatch(account,/accountRow\('الإدارة'/);
 assert.doesNotMatch(journey.slice(journey.indexOf('const jNav=()=>'),journey.indexOf('function jShell(')),/label:'الإدارة'/);
 for(const permission of ['needs_review','opportunities_review','organizations_review','outcomes_review','content_moderation'])assert.ok(staff.includes(permission),permission);
});
