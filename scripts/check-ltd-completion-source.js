'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{sourceHashes}=require('./verify-ltd-statutory-completion');
const root=path.resolve(__dirname,'..'),files=Object.keys(sourceHashes());
function run(command,args){const r=spawnSync(command,args,{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024});if(r.status!==0)throw Error(args.join(' ')+'\n'+r.stdout+'\n'+r.stderr);if(r.stdout)process.stdout.write(r.stdout);}
let syntax=0,json=0;for(const file of files){if(/\.(?:c?js|mjs)$/.test(file)){run(process.execPath,['--check',file]);syntax++;}if(file.endsWith('.json')){JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));json++;}}
run(process.execPath,['scripts/render-public-pages.js']);run(process.execPath,['scripts/build-hosting.js','production','ltd-completion-final']);run('git',['diff','--check']);console.log(JSON.stringify({syntax,json,diffCheck:'PASS',productionArtifact:'build only; no deployment'}));
