import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('Tnmyat Encyclopedia stays independent and publishes six extended foundational essays',async()=>{
 const page=await readFile(new URL('../public/wiki.html',import.meta.url),'utf8');
 const worker=await readFile(new URL('../src/worker.js',import.meta.url),'utf8');
 const home=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(page,/<h1>موسوعة تنميات<\/h1>/);
 assert.doesNotMatch(page,/موسوعة تنميات الذكية|TNMYAT AI ENCYCLOPEDIA/);
 assert.match(worker,/url\.pathname === '\/wiki'/);
 assert.match(worker,/url\.pathname = '\/wiki\.html'/);
 assert.match(home,/href="\/wiki"/);
 assert.match(app,/href="\/wiki"/);
 const js=page.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(js,'encyclopedia inline script exists');
 new vm.Script(js);
 const chunk=js.match(/const items=(\[[\s\S]*?\]);\s*const \$=/)?.[1];
 assert.ok(chunk,'articles are present');
 const articles=JSON.parse(chunk);
 assert.equal(articles.length,6);
 for(const x of articles){
  assert.ok(x.paragraphs.length>=6,x.id+' needs substantive paragraphs');
  assert.ok(x.paragraphs.join('').length>=1200,x.id+' needs analytical depth');
  assert.ok(x.refs.length>=1,x.id+' has further reading');
  assert.ok(x.related.length>=1,x.id+' has internal links');
 }
});
