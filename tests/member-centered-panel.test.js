import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
test('Navigation glass matrices open as centered dialogs with a close control and backdrop',()=>{
 const s=read('journey.js'),css=read('journey.css');
 assert.match(s,/role="dialog" aria-modal="true"/);
 assert.match(s,/data-close-journey-nav/);
 assert.match(s,/journeyNavBackdrop/);
 assert.match(s,/event\.key==='Escape'/);
 assert.match(s,/event\.key==='Tab'/);
 assert.match(css,/top:50%!important/);
 assert.match(css,/left:50%!important/);
 assert.match(css,/translate\(-50%,-50%\)/);
 assert.match(css,/\.journeyNavBackdrop\[hidden\]/);
 assert.match(css,/@media\(max-width:590px\)/);
 assert.doesNotThrow(()=>new Function(s));
});
