(function(root,factory){
  const node=typeof module==='object'&&module.exports,api=factory(node?require('./product-content'):root.TaxMateLegal);
  if(node)module.exports=api;
  root.TaxMateLegacyLegal=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(ProductContent){
  'use strict';
  if(!ProductContent)throw new Error('Canonical TaxMate product content is required');
  // Compatibility alias only. Product/legal copy has one canonical source.
  return ProductContent;
});
