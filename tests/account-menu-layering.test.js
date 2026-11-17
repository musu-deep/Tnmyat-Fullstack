import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
test('Account menu renames submissions as member development space while retaining established route',()=>{
 const js=read('account.js');
 assert.match(js,/accountRow\('مساحتي التنموية','◈','mint','href="\/my-submissions"'\)/);
 assert.doesNotMatch(js,/accountRow\('متابعة طلباتي'/);
 assert.doesNotThrow(()=>new Function(js));
});
test('Account panel opens in elevated fixed layer with visual separation from workspace toolbar',()=>{
 const css=read('account.css');
 assert.match(css,/header:has\(#accountPanel:not\(\[hidden\]\)\)\{z-index:110\}/);
 assert.match(css,/header \.topbar:has\(#accountPanel:not\(\[hidden\]\)\)::before/);
 assert.match(css,/#account \.accountPanel\{\s*position:fixed/);
 assert.match(css,/max-height:calc\(100dvh - 98px\)/);
 assert.match(css,/@media\(max-width:680px\)/);
});
