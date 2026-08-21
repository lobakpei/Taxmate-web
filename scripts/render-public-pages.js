'use strict';
const fs=require('node:fs'),path=require('node:path'),Content=require('../src/core/product-content');
const root=path.resolve(__dirname,'..'),write=process.argv.includes('--write');let mismatch=false;
for(const kind of ['help','privacy','terms']){const file=path.join(root,kind+'.html'),expected=Content.publicPage(kind),actual=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';if(actual===expected)continue;if(write)fs.writeFileSync(file,expected);else{console.error(`${kind}.html is not generated from src/core/product-content.js`);mismatch=true;}}
if(mismatch)process.exitCode=1;
