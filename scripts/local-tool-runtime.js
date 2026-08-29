'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

function portableJavaHome(root){
  for(const parent of [root,path.resolve(root,'..')]){
    const jdkRoot=path.join(parent,'.tools','jdk');
    if(!fs.existsSync(jdkRoot))continue;
    const name=fs.readdirSync(jdkRoot).find(entry=>fs.existsSync(path.join(jdkRoot,entry,'bin','java.exe')));
    if(name)return path.join(jdkRoot,name);
  }
  return null;
}

function systemJavaHome(){
  if(process.env.JAVA_HOME&&fs.existsSync(path.join(process.env.JAVA_HOME,'bin','java.exe')))return process.env.JAVA_HOME;
  const located=spawnSync('where.exe',['java'],{encoding:'utf8',windowsHide:true});
  const executable=located.status===0&&String(located.stdout||'').split(/\r?\n/).find(Boolean);
  return executable?path.dirname(path.dirname(executable.trim())):null;
}

function localToolEnvironment(root){
  const javaHome=portableJavaHome(root)||systemJavaHome();
  if(!javaHome)throw new Error('Java runtime not found in worktree, parent workspace, JAVA_HOME, or PATH');
  const parentConfig=path.resolve(root,'..','.tools','config'),localConfig=path.join(root,'.tools','config');
  return{javaHome,env:{...process.env,JAVA_HOME:javaHome,PATH:path.join(javaHome,'bin')+path.delimiter+process.env.PATH,XDG_CONFIG_HOME:fs.existsSync(parentConfig)?parentConfig:localConfig}};
}

function localBinary(root,relativePath){
  for(const parent of [root,path.resolve(root,'..')]){const candidate=path.join(parent,relativePath);if(fs.existsSync(candidate))return candidate;}
  throw new Error(`Local tool not found: ${relativePath}`);
}

function localNodePath(root){
  return [path.join(root,'functions','node_modules'),path.resolve(root,'..','functions','node_modules'),path.join(root,'node_modules'),path.resolve(root,'..','node_modules')].filter(candidate=>fs.existsSync(candidate)).join(path.delimiter);
}

module.exports={localToolEnvironment,localBinary,localNodePath};
