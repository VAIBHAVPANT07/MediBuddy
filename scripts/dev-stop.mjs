import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
const pidFile=resolve(process.cwd(),'.local/dev.pids');if(!existsSync(pidFile)){console.log('No local launcher PID file found.');process.exit(0)}
const pids=readFileSync(pidFile,'utf8').trim().split(/\s+/).map(Number).filter(Boolean);
for(const pid of pids){try{process.kill(pid,'SIGTERM');console.log(`Stopped ${pid}`)}catch{}}
for(const pid of pids){try{process.kill(pid,0);process.kill(pid,'SIGKILL')}catch{}}
unlinkSync(pidFile);
