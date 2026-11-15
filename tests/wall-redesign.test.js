import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const social=readFileSync(new URL('../public/social.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/profile-cover.css',import.meta.url),'utf8');

test('Wall banner is full width and sidebar does not repeat cover',()=>{
 assert.match(app, /main\.innerHTML='<div id="wallIdentity" class="wallBannerSlot"/);
 assert.match(css,/\.wallBannerSlot \.wallIdentityStats\{position:absolute/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/\.memberPassCompact \.identityCover\{display:none/);
 const mini=social.match(/function profileMini\(p,latest\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(mini);
 assert.doesNotMatch(mini,/memberPassCoverImage|coverStyle\(p\)/);
 assert.match(mini,/sideMemberMetrics/);
});

test('Navigation is solid initially and becomes glass only after scrolling',()=>{
 assert.match(app,/const y=window\.scrollY\|\|0/);
 assert.match(app,/enabled && y>55/);
 assert.match(css,/body\.wallCoverView\.wallNavScrolled:not\(\.wallNavBeyond\) > header/);
 assert.match(css,/body\.wallCoverView > header\{[\s\S]*?background:#152b43!important/);
});

test('Activity ranks are deterministic, informational only, and do not grant rights',()=>{
 const source=social.slice(social.indexOf('function memberRank(p) {'),social.indexOf('function wallIdentityHero(p){'));
 const rank=runInNewContext(source+'\nmemberRank;',{});
 const first=rank({posts_count:0,comments_count:0,received_likes_count:0,followers_count:0});
 assert.equal(first.stars,1);
 assert.equal(first.name,'عضو جديد');
 assert.equal(rank({posts_count:4}).stars,2);
 assert.equal(rank({posts_count:80}).stars,5);
 assert.doesNotMatch(source,/role\s*=|admin\s*=/);
});
