import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('Functional requirements phase one uses existing post and friendship workflows without pretending external services are live',async()=>{
 const [app,extras,html,css,wiki]=await Promise.all(['app.js','community-extras.js','index.html','community-extras.css','wiki.html'].map(f=>readFile(new URL('../public/'+f,import.meta.url),'utf8')));
 new vm.Script(app);new vm.Script(extras);
 assert.ok(html.includes('/community-extras.js'));
 assert.ok(html.includes('/community-extras.css'));
 assert.ok(html.indexOf('/community-extras.js')<html.indexOf('/app.js'),'extras must load first');
 assert.ok(app.includes('tnWallExtraMarkup()'));
 assert.ok(app.includes('tnFriendMarkup()'));
 assert.ok(app.includes('tnRefreshExtras()'));
 assert.ok(app.includes('tnExtraAction(action,el)'));
 assert.ok(app.includes('tn-compose-image'));
 assert.ok(app.includes('tn-compose-video'));
 assert.ok(app.includes('tn-live-info'));
 assert.ok(app.includes('بماذا تفكر؟'));
 assert.ok(extras.includes('/post/')||extras.includes("'/post/'"));
 assert.ok(extras.includes('TN_STORY_TAG'));
 assert.ok(extras.includes('86400000'));
 assert.ok(extras.includes("people?filter=requests"));
 assert.ok(extras.includes("action==='tn-accept-friend'?'accept':'remove'"));
 assert.ok(extras.includes('لم تُفعّل خدمة البث بعد'));
 assert.ok(extras.includes('المساعد التوليدي يحتاج ربط'));
 assert.ok(wiki.includes("get('q')"));
 assert.ok(css.includes('@media(max-width:680px)'));
});
