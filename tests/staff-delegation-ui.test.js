import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('Staff delegation UI offers overlapping grants, select-all, scope clear and exclusive consolidation',()=>{
 const js=source('staff.js'),app=source('app.js'),css=source('staff.css');
 for(const act of ['staff-select-all','staff-select-none','staff-exclusive','staff-scope-clear','staff-clear-all','staff-manager-flag'])assert.ok(js.includes(act),act);
 for(const marker of ['staff/overview','staff/assignments','staff/managers/','staff/users/'])assert.ok(js.includes(marker),marker);
 assert.ok(app.includes('staffDelegationAction(action,el)'));
 assert.match(js,/permissions\.includes\('staff_manage'\)/);
 assert.match(js,/user\.role!=='admin'/);
 assert.match(css,/#staffScopeOverview/);
 assert.doesNotThrow(()=>new Function(js));
});
