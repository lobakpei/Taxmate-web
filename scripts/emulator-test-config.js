'use strict';

const fs=require('node:fs');
const path=require('node:path');

function prepare(root,portEnvironment=process.env){
  const requested={auth:portEnvironment.TAXMATE_AUTH_EMULATOR_PORT,functions:portEnvironment.TAXMATE_FUNCTIONS_EMULATOR_PORT,firestore:portEnvironment.TAXMATE_FIRESTORE_EMULATOR_PORT,storage:portEnvironment.TAXMATE_STORAGE_EMULATOR_PORT};
  if(!Object.values(requested).some(Boolean))return{arg:'',cleanup(){}};
  const config=JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8'));
  for(const [name,value] of Object.entries(requested))if(value){const port=Number(value);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error(`Invalid ${name} emulator port: ${value}`);config.emulators[name]={...(config.emulators[name]||{}),port};}
  const generated=path.join(root,`firebase-emulators-${process.pid}.json`);fs.writeFileSync(generated,JSON.stringify(config));return{arg:` --config "${generated}"`,cleanup(){if(fs.existsSync(generated))fs.unlinkSync(generated);}};
}

module.exports={prepare};
