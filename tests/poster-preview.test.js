import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Wall posters retain entire image and click through to full post while detail allows full image view',async()=>{
 const social=await readFile(new URL('../public/social.js',import.meta.url),'utf8');
 const css=await readFile(new URL('../public/feed-upgrade.css',import.meta.url),'utf8');
 assert.match(social,/postMedia\(p,detail\)/);
 assert.match(social,/function postMedia\(post,detail=false\)/);
 assert.match(social,/class="postImagePreview"/);
 assert.match(social,/class="postTextPreview"/);
 assert.match(social,/publishedMediaDetail/);
 assert.match(social,/href="'\+href\+'" aria-label="فتح المنشور/);
 assert.match(css,/\.feedCard \.publishedMedia img\{max-height:410px;object-fit:contain/);
 assert.match(css,/\.publishedMediaPreview \.postImagePreview img\{/);
 assert.match(css,/\.publishedMediaDetail img\{/);
 assert.doesNotMatch(css,/\.feedCard \.publishedMedia img\{max-height:410px;object-fit:cover/);
});
