import {spawn} from 'node:child_process';
const children=['backend','frontend'].map(dir=>spawn(process.platform==='win32'?'npm.cmd':'npm',['--prefix',dir,'run','dev'],{stdio:'inherit',shell:process.platform==='win32'}));
process.on('SIGINT',()=>children.forEach(p=>p.kill()));
children.forEach(p=>p.on('exit',code=>{children.forEach(c=>c.kill());process.exit(code||0)}));
