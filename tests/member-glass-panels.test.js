import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
test('Workspace categories render individual accessible glass cards without losing destinations',()=>{
 const js=read('journey.js');
 const nav=js.slice(js.indexOf('const jNav=()=>'),js.indexOf('function jShell(',js.indexOf('const jNav=()=>')));
 assert.match(nav,/journeyNavTiles/);
 assert.match(nav,/journeyNavTile/);
 assert.match(nav,/journeyNavPanelIntro/);
 for(const key of ['/network','/group-partnerships','/opportunities','/my-opportunities','/needs','/my-alerts','/my-calendar','/my-map','/my-news','/my-impact','/project-results','/onboarding','/my-needs'])
  assert.ok(nav.includes(key),key);
 assert.match(nav,/if\(user\?\.role==='admin'\)/);
 assert.doesNotThrow(()=>new Function(js));
});
test('Glass panels fit the viewport and support keyboard, outside-click and screen sizes',()=>{
 const js=read('journey.js'),css=read('journey.css');
 assert.match(js,/syncJourneyNav/);
 assert.match(js,/journeyNavBackdrop/);
 assert.match(js,/journeyNavClose/);
 assert.match(js,/requestAnimationFrame/);
 assert.match(js,/closeJourneyNav/);
 assert.match(js,/event\.key==='Escape'/);
 assert.match(css,/backdrop-filter:blur\(20px\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:590px\)/);
 assert.match(css,/@media\(max-width:365px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
