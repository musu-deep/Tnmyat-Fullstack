import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const journey=readFileSync(new URL('../public/journey.js',import.meta.url),'utf8');
const social=readFileSync(new URL('../public/social.js',import.meta.url),'utf8');
const account=readFileSync(new URL('../public/account.js',import.meta.url),'utf8');

test('Onboarding after registration is prioritized, recoverable, and not silently skipped',()=>{
 assert.match(app,/if\(isNew\)\{go\('\/onboarding'\)/);
 assert.match(app,/!preferences\.onboarding_complete/);
 assert.match(app,/history\.replaceState\(null,'','\/onboarding'\)/);
 assert.match(app,/if\(pendingSetup\)go\('\/onboarding'\)/);
 assert.match(journey,/if\(kind==='skip-onboarding'\)[\s\S]{0,250}onboarding_complete:true/);
});
test('Professional settings are reachable from account and profile editing',()=>{
 assert.match(account,/الإعدادات والتفضيلات/);
 assert.match(account,/href="\/onboarding"/);
 assert.match(social,/data-act="mysettings"/);
 assert.match(app,/case 'mysettings'/);
});
