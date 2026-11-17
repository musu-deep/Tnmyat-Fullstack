import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const contentOf=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('Member workspace keeps access to all existing areas with four primary links and grouped services',()=>{
 const s=contentOf('journey.js');
 const nav=s.slice(s.indexOf('const jNav=()=>'),s.indexOf('function jShell(',s.indexOf('const jNav=()=>')));
 for(const label of ['العلاقات والتعاون','ملفي وخدماتي'])assert.ok(nav.includes(label),label);
 for(const route of ['/my-space','/my-people','/my-projects','/my-submissions','/network','/needs','/opportunities','/group-partnerships','/my-opportunities','/project-results','/my-alerts','/my-calendar','/my-map','/my-news','/my-impact','/onboarding'])assert.ok(nav.includes(route),route);
 assert.ok(nav.includes('aria-current="page"'));
 assert.ok(nav.includes('<details class="journeyNavGroup"'));
 assert.doesNotThrow(()=>new Function(s));
});
test('Long project modal is two-column on larger screens, scroll bounded and mobile responsive',()=>{
 const s=contentOf('journey.css');
 assert.match(s,/dialog:has\(#hubProjectForm\)/);
 assert.match(s,/#hubProjectForm\s*\{display:grid;grid-template-columns:minmax\(0,1\.05fr\)/);
 assert.match(s,/#hubProjectForm>\.hubPlacePicker\{grid-column:2/);
 assert.match(s,/max-height:88dvh/);
 assert.match(s,/@media\(max-width:750px\)/);
});
