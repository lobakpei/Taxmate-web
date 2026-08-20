'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');

const root=path.resolve(__dirname,'../..');
const port=4187;
const base=`http://127.0.0.1:${port}`;

async function waitForServer(){
  for(let attempt=0;attempt<40;attempt++){
    try{const response=await fetch(base+'/robots.txt');if(response.ok)return;}catch(_){ }
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('SEO preview server did not start');
}

test('public preview pages return 200 and unknown paths return a real 404',async()=>{
  const server=spawn(process.execPath,['scripts/preview-server.js'],{cwd:root,env:{...process.env,TAXMATE_PREVIEW_PORT:String(port)},stdio:'ignore'});
  try{
    await waitForServer();
    for(const pathname of ['/','/help.html','/privacy.html','/terms.html','/robots.txt','/sitemap.xml']){
      const response=await fetch(base+pathname);
      assert.equal(response.status,200,pathname);
    }
    const missing=await fetch(base+'/not-a-real-taxmate-page');
    assert.equal(missing.status,404);
  }finally{
    server.kill();
  }
});
