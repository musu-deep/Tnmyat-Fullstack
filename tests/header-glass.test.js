import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/header-glass.css',import.meta.url),'utf8');
test('Frosted header is loaded after previous styles and keeps all main navigation controls',()=>{
 assert.ok(page.indexOf('/header-glass.css')>page.indexOf('/governance.css'));
 for(const selector of ['.topbar>.brand','.topbar>.headSearch','.topbar>.desktopNav','.topbar>#account'])assert.ok(css.includes(selector),selector);
 for(const target of ['/wall','/people','/groups','/map','/calendar','/messages'])assert.ok(page.includes('href="'+target+'"'),target);
 assert.match(css,/backdrop-filter:blur/);
});
test('Header navigation adapts without overlapping on tablet and mobile',()=>{
 for(const breakpoint of ['max-width:1160px','max-width:850px','max-width:680px','max-width:370px'])assert.ok(css.includes(breakpoint),breakpoint);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/\.topbar>\.desktopNav\{display:none\}/);
 assert.match(css,/grid-template-columns:90px minmax\(0,1fr\) auto/);
});
