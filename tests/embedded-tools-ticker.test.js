import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const load=name=>readFile(new URL('../public/'+name,import.meta.url),'utf8');

test('Community tools stay contextual, while tickers begin in left rail and dock beneath header',async()=>{
 const [app,hub,hubCss,services,servicesCss,extras,home,groups,social,market]=await Promise.all(
  ['app.js','hub.js','hub.css','platform-services.js','platform-services.css','community-extras.js','index.html','groups.js','social.js','market-impact.js'].map(load));
 for(const [name,source] of [['app',app],['hub',hub],['services',services],['extras',extras],['groups',groups],['social',social],['market',market]]){
  assert.doesNotThrow(()=>new vm.Script(source),name+' must parse');
 }
 assert.ok(app.includes('<section class="tnTickerSidePanel"'),'news must be housed in a sidebar footer card');
 assert.ok(app.indexOf('id="hubTickers"')>app.indexOf('id="discovery"'),'news must follow all sidebar discovery sections');
 assert.ok(hubCss.includes('#hubTickers .hubTicker-1{background:linear-gradient(110deg,#142f4a'),'first ticker uses navy branding');
 assert.ok(hubCss.includes('#hubTickers .hubTicker-2{background:linear-gradient(110deg,#1d405d'),'second ticker uses blue branding');
 assert.ok(hubCss.includes('#hubTickers .hubTicker-3{background:linear-gradient(110deg,#254a68'),'third ticker uses blue branding');
 assert.ok(!app.includes('id="wallIdentity" class="wallBannerSlot" aria-label="غلاف وهوية العضو"></div><div id="hubTickers"'),'ticker must not span above grid');
 assert.ok(hub.includes("setProperty('--tn-ticker-top',headerBottom+'px')"),'dock top derives from header');
 assert.ok(hubCss.includes('top:var(--tn-ticker-top,72px)!important'));
 assert.ok(hubCss.includes('bottom:auto!important'));
 assert.ok(hubCss.includes('display:flex!important;flex-direction:row!important'));
 assert.ok(!home.includes('href="/services"'),'standalone Services link should be absent');
 assert.ok(home.includes('data-service="ai"'),'assistant is embedded in navigation');
 assert.ok(services.includes("async function tnOpenTool("));
 assert.ok(services.includes('tnAiColumns'),'AI has full conversation layout');
 assert.ok(servicesCss.includes('.tnAiHistory')&&servicesCss.includes('.tnAiConversation'));
 assert.ok(app.includes('data-service="live"')&&app.includes('data-service="calls"'));
 assert.ok(social.includes('data-service="privacy"')&&social.includes('data-peer='));
 assert.ok(groups.includes('data-service="live"'));
 assert.ok(market.includes('data-service="payments"'));
 assert.ok(extras.includes('tn-view-reel')&&extras.includes('tnShortsViewer'));
 assert.ok(extras.includes('tnStoryRail'));
});
