(function(root,factory){
  const node=typeof module==='object'&&module.exports,api=factory();
  if(node)module.exports=api;root.TaxMateCompanyIdentity=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const IDENTITY_RULE_VERSION='uk-company-identity.2026-08-23.1';
  const OFFICIAL_SOURCES=Object.freeze({
    number:Object.freeze({id:'CH-COMPANY-NUMBER',url:'https://find-and-update.company-information.service.gov.uk/company-lookup/search'}),
    prefixes:Object.freeze({id:'CH-WEBFILING-PREFIXES',url:'https://ewf-legacy.companieshouse.gov.uk/sframe?lang=en&name=aboutWebFiling'}),
    names:Object.freeze({id:'GOVUK-CHOOSE-COMPANY-NAME',url:'https://www.gov.uk/limited-company-formation/choose-company-name'}),
    characters:Object.freeze({id:'UKSI-2015-17-SCHEDULE-1',url:'https://www.legislation.gov.uk/uksi/2015/17/schedule/1'}),
    firstAccounts:Object.freeze({id:'GOVUK-FIRST-COMPANY-ACCOUNTS',url:'https://www.gov.uk/first-company-accounts-and-return'})
  });
  const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZÀÁÂÃÄÅĀĂĄǺÆǼÇĆĈĊČÞĎĐÈÉÊËĒĔĖĘĚĜĞĠĢĤĦÌÍÎÏĨĪĬĮİĴĶĹĻĽĿŁÑŃŅŇŊÒÓÔÕÖØŌŎŐǾŒŔŖŘŚŜŞŠŢŤŦÙÚÛÜŨŪŬŮŰŲŴẀẂẄỲÝŶŸŹŻŽ';
  const PUNCTUATION=".,:;-‘’'()[]{}<>!«»“”\"?\\/";
  const SYMBOLS='&@£$€¥';
  const RESTRICTED_PREFIX_SYMBOLS='*=#%+';
  const ALLOWED=new Set((LETTERS+LETTERS.toLowerCase()+PUNCTUATION+SYMBOLS+RESTRICTED_PREFIX_SYMBOLS+' 0123456789').split(''));
  const isoDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'));
  const addDays=(date,days)=>{const value=new Date(date+'T00:00:00Z');value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10);};

  function normalizeCompanyNumber(value){
    const compact=String(value||'').toUpperCase().replace(/[\s-]/g,'');
    return /^\d{1,8}$/.test(compact)?compact.padStart(8,'0'):compact;
  }
  function validateCompanyNumber(value){
    const normalized=normalizeCompanyNumber(value),valid=/^(?:\d{8}|(?:SC|NI|R0)\d{6})$/.test(normalized);
    return Object.freeze({valid,normalized,reason:valid?null:'company_number_format',ruleVersion:IDENTITY_RULE_VERSION,sourceIds:[OFFICIAL_SOURCES.number.id,OFFICIAL_SOURCES.prefixes.id]});
  }
  function validateCompanyName(value,options={}){
    const name=String(value||'').trim(),invalid=[];
    for(const character of name)if(!ALLOWED.has(character)&&!invalid.includes(character))invalid.push(character);
    const visible=name.replace(/\s/g,''),restricted=visible.slice(0,3).split('').some(character=>RESTRICTED_PREFIX_SYMBOLS.includes(character));
    const privateEnding=/(?:\bLIMITED|\bL\.?T\.?D\.?|\bCYFYNGEDIG|\bCYF\.?)$/i.test(name);
    let reason=null;if(!name)reason='company_name_required';else if(name.length>160)reason='company_name_too_long';else if(invalid.length)reason='company_name_character_not_permitted';else if(restricted)reason='company_name_symbol_position';else if(options.requirePrivateEnding!==false&&!privateEnding)reason='company_name_private_ending_required';
    return Object.freeze({valid:reason===null,name,reason,invalidCharacters:Object.freeze(invalid),privateEnding,requiresRegisterCheck:true,ruleVersion:IDENTITY_RULE_VERSION,sourceIds:[OFFICIAL_SOURCES.names.id,OFFICIAL_SOURCES.characters.id]});
  }
  function firstAccountsPeriod(incorporationDate){
    if(!isoDate(incorporationDate))throw new Error('A valid incorporation date is required');
    const source=new Date(incorporationDate+'T00:00:00Z'),end=new Date(Date.UTC(source.getUTCFullYear()+1,source.getUTCMonth()+1,0));
    return Object.freeze({startDate:incorporationDate,endDate:end.toISOString().slice(0,10),referenceDate:end.toISOString().slice(0,10),sourceId:OFFICIAL_SOURCES.firstAccounts.id});
  }
  function lastDayOfTwelveMonths(startDate){
    if(!isoDate(startDate))throw new Error('A valid Corporation Tax start date is required');
    const source=new Date(startDate+'T00:00:00Z'),day=source.getUTCDate(),target=new Date(Date.UTC(source.getUTCFullYear()+1,source.getUTCMonth(),1)),lastDay=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(day>lastDay?lastDay:day);if(day<=lastDay)target.setUTCDate(target.getUTCDate()-1);return target.toISOString().slice(0,10);
  }
  function corporationTaxPeriods(tradingStartDate,accountsEndDate){
    if(!isoDate(tradingStartDate)||!isoDate(accountsEndDate)||tradingStartDate>accountsEndDate)throw new Error('Valid trading and accounts dates are required');
    const periods=[];let startDate=tradingStartDate;
    while(startDate<=accountsEndDate){const endDate=lastDayOfTwelveMonths(startDate)<accountsEndDate?lastDayOfTwelveMonths(startDate):accountsEndDate;periods.push(Object.freeze({startDate,endDate}));startDate=addDays(endDate,1);}
    return Object.freeze(periods);
  }
  function planFirstPeriods(input={}){
    const accounts=input.override&&input.override.enabled?{startDate:input.override.startDate,endDate:input.override.endDate,referenceDate:input.override.endDate}:firstAccountsPeriod(input.incorporationDate);
    if(!isoDate(accounts.startDate)||!isoDate(accounts.endDate)||accounts.startDate>accounts.endDate)throw new Error('Accounts period dates are invalid');
    if(accounts.startDate<input.incorporationDate)throw new Error('Accounts period cannot start before incorporation');
    const trading=input.tradingStatus==='trading'?input.tradingStartDate:null;
    if(trading&&(!isoDate(trading)||trading<input.incorporationDate))throw new Error('Trading cannot start before incorporation');
    const ctPeriods=trading&&trading<=accounts.endDate?corporationTaxPeriods(trading,accounts.endDate):[];
    return Object.freeze({accounts:Object.freeze(accounts),corporationTaxPeriods:ctPeriods,ruleVersion:IDENTITY_RULE_VERSION,sourceIds:[OFFICIAL_SOURCES.firstAccounts.id]});
  }

  return{IDENTITY_RULE_VERSION,OFFICIAL_SOURCES,normalizeCompanyNumber,validateCompanyNumber,validateCompanyName,firstAccountsPeriod,lastDayOfTwelveMonths,corporationTaxPeriods,planFirstPeriods};
});
