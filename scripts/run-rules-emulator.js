'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'); const root=path.resolve(__dirname,'..');
const jdkRoot=path.join(root,'.tools','jdk'); const jdkName=fs.readdirSync(jdkRoot).find(name=>fs.existsSync(path.join(jdkRoot,name,'bin','java.exe'))); if(!jdkName)throw new Error('Portable JDK not found under .tools/jdk');
const javaHome=path.join(jdkRoot,jdkName); const env={...process.env,JAVA_HOME:javaHome,PATH:path.join(javaHome,'bin')+path.delimiter+process.env.PATH,XDG_CONFIG_HOME:path.join(root,'.tools','config')};
const firebase=path.join(root,'node_modules','.bin','firebase.cmd'); const command=`"${firebase}" emulators:exec --project demo-taxmate --only firestore "node --test tests/rules/emulator.test.js"`; const child=spawnSync(command,{cwd:root,env,stdio:'inherit',shell:true}); process.exit(child.status==null?1:child.status);
