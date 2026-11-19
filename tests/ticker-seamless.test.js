import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('News strips stay compact and repeat content seamlessly without blank animation intervals',async()=>{
 const js=await readFile(new URL('../public/hub.js',import.meta.url),'utf8');
 const css=await readFile(new URL('../public/hub.css',import.meta.url),'utf8');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(js,/function hubSizeTickerTracks\(root\)/);
 assert.match(js,/first\.scrollWidth<width\+48/);
 assert.match(js,/second\.innerHTML=first\.innerHTML/);
 assert.match(js,/hubSizeTickerTracks\(node\);hubUpdateDock\(\)/);
 assert.match(js,/if\(anchor\)hubSizeTickerTracks\(anchor\)/);
 assert.match(js,/class="hubTickerSet"/);
 assert.match(css,/@keyframes tnNewsSeamless\{from\{transform:translateX\(0\)\}to\{transform:translateX\(50%\)\}\}/);
 assert.match(css,/animation:tnNewsSeamless var\(--tn-news-duration,30s\) linear infinite!important/);
 assert.match(css,/height:31px;min-height:31px!important;max-height:31px/);
 assert.match(css,/\.hubTickerTrack\[data-empty="true"\] \{?/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
