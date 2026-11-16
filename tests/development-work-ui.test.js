import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('All new client screens parse, have form submission actions and reachable navigation',()=>{
 const app=source('public/app.js'),html=source('public/index.html'),work=source('public/development-work.js'),needs=source('public/community-needs.js');
 assert.doesNotThrow(()=>new Function(work));
 assert.doesNotThrow(()=>new Function(needs));
 for(const tag of ['development-work.js','community-needs.js'])assert.ok(html.includes(tag));
 for(const route of ['renderDevelopmentWork(token)','renderNeeds(token)','workAction(el)','needsAction(el)','workForm(form,data)','needsForm(form,data)'])assert.ok(app.includes(route),route);
 for(const form of ['workOpportunityForm','workOrganizationForm','workLinkOrganizationForm','workLinkGroupForm','workOutcomeForm','needsForm','partnershipForm'])assert.ok((work+needs).includes(form),form);
 for(const url of ['/needs','/my-needs','/opportunities','/my-opportunities','/group-partnerships','/project-results','/work-admin','/needs-admin'])assert.ok((work+needs).includes(url),url);
});
