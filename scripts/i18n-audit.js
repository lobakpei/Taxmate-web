'use strict';
const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'..','src','app','app.js'),'utf8');
const start=source.indexOf('const I18N = '),end=source.indexOf('\nfunction t(',start);
if(start<0||end<0)throw new Error('I18N source block not found');
const context={};vm.runInNewContext(source.slice(start,end)+'\n;globalThis.__I18N=I18N;',context,{timeout:1000});
const I18N=context.__I18N,locales=['en','zh','pl','ro','es','ur'];
function placeholders(value){return [...String(value).matchAll(/\{([A-Za-z][\w]*)\}/g)].map(x=>x[1]).sort();}
function audit(){const canonical=Object.keys(I18N.en),missing={},placeholderMismatches=[];for(const locale of locales){missing[locale]=canonical.filter(k=>!(k in I18N[locale]));for(const key of canonical){if(!(key in I18N[locale]))continue;const english=placeholders(I18N.en[key]),required=english.filter(x=>x!=='s'),actual=placeholders(I18N[locale][key]);if(required.some(x=>!actual.includes(x))||actual.some(x=>!english.includes(x)))placeholderMismatches.push({locale,key});}}const spanishLeaks=Object.keys(I18N.es).filter(key=>I18N.ur[key]===I18N.es[key]&&/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]/.test(I18N.es[key])&&!/[\u0600-\u06ff]/.test(I18N.ur[key])&&!['mtd.title','pdf.class4','pro.titleOld'].includes(key));return{locales,canonicalCount:canonical.length,missing,placeholderMismatches,spanishLeaks};}
if(require.main===module){const result=audit();console.log(JSON.stringify(result,null,2));if(Object.values(result.missing).some(x=>x.length)||result.placeholderMismatches.length||result.spanishLeaks.length)process.exitCode=1;}
module.exports={I18N,locales,placeholders,audit};
