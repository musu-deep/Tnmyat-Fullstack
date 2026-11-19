import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('Ticker headings move between news items in all three lanes, with no fixed side labels',async()=>{
 const js=await readFile(new URL('../public/hub.js',import.meta.url),'utf8');
 const css=await readFile(new URL('../public/hub.css',import.meta.url),'utf8');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(js,/function hubTickerSeparator\(title,url=''/);
 assert.match(js,/items\.map\(item=>render\(item\)\+separator\)\.join\(''\)/);
 assert.match(js,/hubTickerSequence\(personalNews,renderPersonal,'أخباري','\/my-news'\)/);
 assert.match(js,/const sequence=hubTickerSequence\(items,renderPublic,title\)/);
 assert.doesNotMatch(js,/class="hubTickerLabel"/);
 assert.match(css,/#hubTickers \.hubTickerSeparator\{/);
 assert.match(css,/#hubTickers \.hubTickerViewport\{flex:1 1 100%;width:100%/);
 assert.match(css,/#hubTickers \.hubTickersDocked \.hubTickerSeparator\{/);
 const section=js.slice(js.indexOf('function hubTickerMarkup('),js.indexOf('async function hubRefreshTickers('));
 assert.match(section,/sequence\+\(items\.length\?sequence:''\)/);
 assert.match(section,/sequence\+\(personalNews\.length\?sequence:''\)/);
});
