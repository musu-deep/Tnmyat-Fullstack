// One-command, fail-closed production deployment with mandatory off-repository D1 export.
// Usage: npm run deploy:safe
import { readFileSync, mkdirSync, statSync, openSync, readSync, closeSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
process.chdir(root);
const fail=(message)=>{ console.error('\nBLOCKED: '+message);process.exit(1); };
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8').replace(/^\s*\/\/.*$/gm,''));
const entries=config.d1_databases||[];
const binding=entries.find(x=>x.binding==='DB');
if(!binding || binding.database_name!=='tnmyat-db')fail('Expected production DB binding DB -> tnmyat-db not found.');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if(!uuid.test(binding.database_id||'')||/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(binding.database_id))fail('Missing actual production D1 database_id. Refusing to export, migrate, or deploy.');
if(!process.stdin.isTTY)fail('Interactive terminal required for approval; never deploy unattended.');
const npx=process.platform==='win32'?'npx.cmd':'npx';
function run(title,bin,args){
 console.log('\n'+title);
 const result=spawnSync(bin,args,{cwd:root,stdio:'inherit',shell:process.platform==='win32'});
 if(result.error || result.status!==0)fail(title+' failed. No subsequent operations will run.');
}
run('Running existing project tests','npm', ['test']);
run('Inspecting remote database',npx,['wrangler@4','d1','info',binding.database_name]);
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backupDir=resolve(root,'..','tnmyat-backups');
mkdirSync(backupDir,{recursive:true});
const backup=resolve(backupDir,'tnmyat-db-'+stamp+'.sql');
if(existsSync(backup))fail('Backup filename already exists.');
run('Exporting the current remote production database',npx,['wrangler@4','d1','export',binding.database_name,'--remote','--output',backup]);
let size=0;
try{size=statSync(backup).size;}catch{fail('Backup file not found after export.');}
if(size<100)fail('Backup file is suspiciously small; no migrations were applied.');
const fd=openSync(backup,'r');
const buf=Buffer.alloc(Math.min(size,65536));
try{readSync(fd,buf,0,buf.length,0);}finally{closeSync(fd);}
const head=buf.toString('utf8');
if(!/CREATE TABLE|CREATE VIRTUAL TABLE|INSERT INTO/i.test(head))fail('SQL backup does not appear to contain database records.');
const hash=createHash('sha256').update(readFileSync(backup)).digest('hex');
const receipt=backup+'.sha256';
writeFileSync(receipt,hash+'  '+basename(backup)+'\n',{flag:'wx',mode:0o600});
console.log('\nBACKUP SAVED: '+backup+'\nSIZE: '+size+' bytes\nSHA256: '+hash);
console.log('Original D1 database ID: '+binding.database_id);
const rl=createInterface({input:stdin,output:stdout});
const approval=(await rl.question('\nType DEPLOY to proceed with D1 migrations and Worker deployment: ')).trim();
rl.close();
if(approval!=='DEPLOY')fail('Approval declined. Backup has been preserved, and production was not changed.');
run('Applying additive D1 migrations', 'npm',['run','db:remote']);
run('Deploying the Worker', 'npm',['run','deploy']);
console.log('\nDEPLOY FINISHED. Backup remains available at '+backup);
