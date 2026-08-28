'use strict';
const path=require('node:path'),{spawnSync}=require('node:child_process'),{localToolEnvironment,localBinary}=require('./local-tool-runtime'); const root=path.resolve(__dirname,'..');
const {env}=localToolEnvironment(root);
const firebase=localBinary(root,path.join('node_modules','.bin','firebase.cmd')); const command=`"${firebase}" emulators:exec --project demo-taxmate --only firestore,storage "node --test tests/rules/emulator.test.js"`; const child=spawnSync(command,{cwd:root,env,stdio:'inherit',shell:true}); process.exit(child.status==null?1:child.status);
