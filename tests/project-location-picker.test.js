import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=readFileSync(new URL('../public/hub.js',import.meta.url),'utf8');
const extract=(start,end)=>{
 const a=src.indexOf(start),b=src.indexOf(end,a);
 assert.ok(a>=0&&b>a,'project form exists');
 return src.slice(a,b);
};
test('Member project form is usable without manually entering coordinates',()=>{
 const form=extract('function hubProjectForm(){','function hubSetProjectPin(');
 assert.match(form,/name="country"/);
 assert.match(form,/name="city"/);
 assert.match(form,/name="latitude" value=""/);
 assert.match(form,/name="longitude" value=""/);
 assert.doesNotMatch(form,/خط العرض|خط الطول/);
 assert.match(form,/data-hub="find-project-place"/);
 assert.match(form,/id="hubProjectPickerMap"/);
 assert.match(form,/<details class="hubProjectOptional">/);
 assert.match(form,/إرسال المشروع للمراجعة/);
});
test('Location search needs explicit user action and supports map selection',()=>{
 assert.match(src,/if\(which==='find-project-place'\)/);
 assert.match(src,/if\(which==='select-project-place'\)/);
 assert.match(src,/hubProjectPicker\.on\('click'/);
 assert.match(src,/hubProjectPin=L\.marker/);
 assert.match(src,/https:\/\/nominatim\.openstreetmap\.org\/search/);
 assert.match(src,/if\(!Number\.isFinite\(latitude\)\|\|!Number\.isFinite\(longitude\)\)throw Error/);
});
