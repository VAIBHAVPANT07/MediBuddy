import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd(); const stateDir=resolve(root,'.local'); mkdirSync(stateDir,{recursive:true}); const pidFile=resolve(stateDir,'dev.pids');
if(existsSync(pidFile)){const pids=readFileSync(pidFile,'utf8').trim().split(/\s+/).map(Number);if(pids.some(pid=>{try{process.kill(pid,0);return true}catch{return false}})){console.error('Services appear to be running. Stop with `pnpm dev:stop` first.');process.exit(1)}}
const children=[];function start(command,args,options={}){const child=spawn(command,args,{cwd:root,stdio:'inherit',...options});children.push(child);return child}
function shutdown(){for(const child of children)if(child&&!child.killed)child.kill('SIGTERM');try{unlinkSync(pidFile)}catch{}}
process.on('SIGINT',()=>{shutdown();process.exit(0)});process.on('SIGTERM',()=>{shutdown();process.exit(0)});
const waitExit=(child,label)=>new Promise((ok,fail)=>child.once('exit',code=>code===0?ok():fail(new Error(`${label} failed (${code})`))));
try{
 const pgData='/private/tmp/medibuddy-pgdata';let dbUrl;
 if(existsSync(pgData)){try{const probe=await fetch('http://127.0.0.1:55432',{signal:AbortSignal.timeout(300)});void probe}catch{};const check=spawnSync('/opt/homebrew/opt/postgresql@17/bin/pg_ctl',['-D',pgData,'status'],{stdio:'ignore'});if(check.status!==0){const pg=start('/opt/homebrew/opt/postgresql@17/bin/pg_ctl',['-D',pgData,'-l','/private/tmp/medibuddy-postgres.log','-o','-h 127.0.0.1 -p 55432','start']);await waitExit(pg,'PostgreSQL')}dbUrl='postgres://medibuddy@127.0.0.1:55432/medibuddy'}
 else{const db=start('docker',['compose','up','-d','db']);await waitExit(db,'Docker Compose database');dbUrl='postgres://medibuddy:local-development-only@127.0.0.1:5432/medibuddy'}
 const apiPort=process.env.API_PORT||'3002'; const frontendPort=process.env.FRONTEND_PORT||'5175';
 const env={...process.env,DATABASE_URL:process.env.DATABASE_URL||dbUrl,API_PORT:apiPort};
 for(const [args,label] of [[['backend/dist/migrate.js'],'Database migrations'],[['backend/dist/importSynthea.js'],'Synthea import'],[['backend/dist/seedDemo.js'],'Demo setup']]){const c=start('node',args,{env});await waitExit(c,label)}
 const api=start('node',['backend/dist/server.js'],{env}); await new Promise(r=>setTimeout(r,800));
 const vite=start('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',frontendPort,'--strictPort'],{env});
 writeFileSync(pidFile,children.filter(c=>c.exitCode===null).map(c=>c.pid).join('\n'));
 console.log(`\nMediBuddy is running at http://localhost:${frontendPort} (API health: http://localhost:${apiPort}/api/health). Press Ctrl+C to stop.\n`);
 await Promise.race([new Promise(r=>api.once('exit',r)),new Promise(r=>vite.once('exit',r))]);shutdown();
}catch(error){shutdown();console.error(error instanceof Error?error.message:error);process.exit(1)}
