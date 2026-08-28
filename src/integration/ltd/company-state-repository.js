'use strict';

const CompanyState=require('./company-state');
const clone=value=>JSON.parse(JSON.stringify(value));

function memoryRepository(initialState){
  let current=clone(initialState);
  CompanyState.validateState(current);
  return Object.freeze({
    load(){return clone(current);},
    replace(next){CompanyState.validateState(next);current=clone(next);return clone(current);}
  });
}

function assertRepository(repository){
  if(!repository||typeof repository.load!=='function'||typeof repository.replace!=='function')throw new Error('A canonical company state repository is required');
  const state=repository.load();CompanyState.validateState(state);return repository;
}

module.exports={memoryRepository,assertRepository};
