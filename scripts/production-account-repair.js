'use strict';

const crypto=require('node:crypto');
const fs=require('node:fs/promises');
const path=require('node:path');
const firebaseCliAuth=require('firebase-tools/lib/auth');
const Stripe=require('../functions/node_modules/stripe');

const PROJECT_ID='taxmate-uk-2';
const PROJECT_NUMBER='995936701479';
const BUCKET='taxmate-uk-2.firebasestorage.app';
const DATABASE_ROOT=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)`;
const DOCUMENT_ROOT=`${DATABASE_ROOT}/documents`;
const KNOWN_ROOT_COLLECTIONS=new Set([
  'appConfig','billingCustomers','founderPromotions','partnerships','promotionRedemptions',
  'stripeWebhookEvents','users','accountClaims','accountResets','accountQuarantines'
]);

function requiredEnv(name){const value=String(process.env[name]||'').trim();if(!value)throw new Error(`Missing ${name}`);return value;}
function sha256(value){return crypto.createHash('sha256').update(value).digest('hex');}
function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(!value||typeof value!=='object')return value;
  if(Buffer.isBuffer(value))return{$bytesBase64:value.toString('base64')};
  if(typeof value.toDate==='function'&&typeof value.toMillis==='function')return{$timestamp:value.toDate().toISOString(),millis:value.toMillis()};
  if(typeof value.path==='string'&&value.firestore)return{$documentReference:value.path};
  if(Number.isFinite(value.latitude)&&Number.isFinite(value.longitude))return{$geoPoint:{latitude:value.latitude,longitude:value.longitude}};
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
}
function decodeFirestoreValue(value){
  if(!value||typeof value!=='object')return null;
  if('nullValue'in value)return null;if('booleanValue'in value)return value.booleanValue;
  if('integerValue'in value)return Number(value.integerValue);if('doubleValue'in value)return Number(value.doubleValue);
  if('timestampValue'in value)return{$timestamp:value.timestampValue};if('stringValue'in value)return value.stringValue;
  if('bytesValue'in value)return{$bytesBase64:value.bytesValue};if('referenceValue'in value)return{$documentReference:value.referenceValue};
  if('geoPointValue'in value)return{$geoPoint:value.geoPointValue};
  if('arrayValue'in value)return(value.arrayValue.values||[]).map(decodeFirestoreValue);
  if('mapValue'in value)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([key,item])=>[key,decodeFirestoreValue(item)]));
  throw new Error('Unknown Firestore value type');
}
function decodeFirestoreDocument(document){
  const prefix=`projects/${PROJECT_ID}/databases/(default)/documents/`,name=String(document?.name||'');
  if(!name.startsWith(prefix))throw new Error('Firestore document project mismatch');
  return{path:name.slice(prefix.length),createTime:document.createTime||null,updateTime:document.updateTime||null,readTime:document.readTime||null,data:Object.fromEntries(Object.entries(document.fields||{}).map(([key,value])=>[key,decodeFirestoreValue(value)]))};
}
function encodeFirestoreValue(value){
  if(value===null||value===undefined)return{nullValue:null};
  if(typeof value==='boolean')return{booleanValue:value};
  if(typeof value==='string')return{stringValue:value};
  if(typeof value==='number'){if(!Number.isFinite(value))throw new Error('Non-finite Firestore number');return Number.isInteger(value)?{integerValue:String(value)}:{doubleValue:value};}
  if(Buffer.isBuffer(value))return{bytesValue:value.toString('base64')};
  if(Array.isArray(value))return{arrayValue:{values:value.map(encodeFirestoreValue)}};
  if(typeof value==='object'){
    if(typeof value.$timestamp==='string')return{timestampValue:value.$timestamp};
    if(typeof value.$bytesBase64==='string')return{bytesValue:value.$bytesBase64};
    if(typeof value.$documentReference==='string')return{referenceValue:value.$documentReference};
    if(value.$geoPoint&&typeof value.$geoPoint==='object')return{geoPointValue:value.$geoPoint};
    return{mapValue:{fields:Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encodeFirestoreValue(item)]))}};
  }
  throw new Error('Unsupported Firestore value');
}
function encodeFirestoreFields(fields){return Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,encodeFirestoreValue(value)]));}
function firestoreDocumentName(documentPath){return`projects/${PROJECT_ID}/databases/(default)/documents/${documentPath}`;}
function patchWrite(documentPath,fields,precondition){
  const currentDocument=precondition?.updateTime?{updateTime:precondition.updateTime}:precondition?.exists===false?{exists:false}:null;
  if(!currentDocument)throw new Error(`Missing write precondition for ${safeToken(documentPath)}`);
  return{update:{name:firestoreDocumentName(documentPath),fields:encodeFirestoreFields(fields)},updateMask:{fieldPaths:Object.keys(fields).sort()},currentDocument};
}
function deleteWrite(document){if(!document?.path||!document?.updateTime)throw new Error('Delete write requires an exact snapshot precondition');return{delete:firestoreDocumentName(document.path),currentDocument:{updateTime:document.updateTime}};}
function json(value){return`${JSON.stringify(stable(value),null,2)}\n`;}
function safeToken(value){return sha256(String(value||'')).slice(0,16);}
function maskIdentity(user){return{uidSha256:sha256(user.uid),emailSha256:sha256(String(user.email||'').toLowerCase()),emailVerified:user.emailVerified===true,providers:(user.providerData||[]).map(item=>item.providerId).sort(),disabled:user.disabled===true};}
function walk(value,visit,key='root'){
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){value.forEach((item,index)=>walk(item,visit,`${key}[${index}]`));return;}
  for(const [name,item] of Object.entries(value)){visit(name,item,key);walk(item,visit,`${key}.${name}`);}
}
function receiptPath(value){
  const source=String(value||'');if(/^receipts\/[^/]+\//.test(source))return source;
  if(!/^https?:\/\//i.test(source))return null;
  try{const url=new URL(source),match=/\/o\/([^?#]+)/.exec(url.pathname);if(match){const decoded=decodeURIComponent(match[1]);if(/^receipts\/[^/]+\//.test(decoded))return decoded;}const named=url.searchParams.get('name');if(named){const decoded=decodeURIComponent(named);if(/^receipts\/[^/]+\//.test(decoded))return decoded;}}catch(_){}
  return null;
}

async function accessToken(){
  const account=firebaseCliAuth.getGlobalDefaultAccount();
  if(!account?.tokens?.refresh_token)throw new Error('Firebase CLI login is required');
  const refreshed=await firebaseCliAuth.getAccessToken(account.tokens.refresh_token,[]);
  if(!refreshed?.access_token)throw new Error('Firebase CLI access token unavailable');
  return{access_token:refreshed.access_token,expires_in:Number(refreshed.expires_in)||3500};
}
async function requestJson(url,token,options={}){
  const response=await fetch(url,{...options,headers:{authorization:`Bearer ${token}`,'content-type':'application/json',...(options.headers||{})}}),text=await response.text();
  let body=null;try{body=text?JSON.parse(text):null;}catch{body=null;}
  if(!response.ok){const error=new Error(body?.error?.message||`${response.status} ${response.statusText}`);error.status=response.status;throw error;}
  return body;
}
async function secretValue(name,token){
  const body=await requestJson(`https://secretmanager.googleapis.com/v1/projects/${PROJECT_NUMBER}/secrets/${encodeURIComponent(name)}/versions/latest:access`,token);
  const encoded=body?.payload?.data;if(!encoded)throw new Error(`Secret ${name} has no enabled value`);return Buffer.from(encoded,'base64').toString('utf8');
}
function firestoreDocumentUrl(documentPath){return`${DOCUMENT_ROOT}/${documentPath.split('/').map(encodeURIComponent).join('/')}`;}
async function getFirestoreDocument(documentPath,token){try{return decodeFirestoreDocument(await requestJson(firestoreDocumentUrl(documentPath),token));}catch(error){if(error.status===404)return null;throw error;}}
async function listCollectionIds(parentPath,token){
  const url=parentPath?`${firestoreDocumentUrl(parentPath)}:listCollectionIds`:`${DOCUMENT_ROOT}:listCollectionIds`,result=[];let pageToken='';
  do{const body=await requestJson(url,token,{method:'POST',body:JSON.stringify({pageSize:1000,...(pageToken?{pageToken}:{})})});result.push(...(body.collectionIds||[]));pageToken=String(body.nextPageToken||'');}while(pageToken);
  return[...new Set(result)].sort();
}
async function listDocuments(parentPath,collectionId,token){
  const base=parentPath?`${firestoreDocumentUrl(parentPath)}/${encodeURIComponent(collectionId)}`:`${DOCUMENT_ROOT}/${encodeURIComponent(collectionId)}`,result=[];let pageToken='';
  do{const url=new URL(base);url.searchParams.set('pageSize','300');url.searchParams.set('showMissing','true');if(pageToken)url.searchParams.set('pageToken',pageToken);const body=await requestJson(url.toString(),token);result.push(...(body.documents||[]).map(decodeFirestoreDocument));pageToken=String(body.nextPageToken||'');}while(pageToken);
  return result;
}
async function runFieldQuery(collectionId,fieldPath,value,token,{allDescendants=false}={}){
  const body=await requestJson(`${DOCUMENT_ROOT}:runQuery`,token,{method:'POST',body:JSON.stringify({structuredQuery:{from:[{collectionId,allDescendants}],where:{fieldFilter:{field:{fieldPath},op:'EQUAL',value:{stringValue:value}}}}})});
  return body.filter(item=>item.document).map(item=>decodeFirestoreDocument({...item.document,readTime:item.readTime||null}));
}
async function snapshotDocumentTree(documentPath,records,seen,token){
  if(seen.has(documentPath))return;seen.add(documentPath);const document=await getFirestoreDocument(documentPath,token);if(document)records.push(document);
  for(const collectionId of await listCollectionIds(documentPath,token))for(const child of await listDocuments(documentPath,collectionId,token))await snapshotDocumentTree(child.path,records,seen,token);
}
async function snapshotOneDocument(documentPath,records,seen,token){const document=await getFirestoreDocument(documentPath,token);if(!document||seen.has(documentPath))return false;await snapshotDocumentTree(documentPath,records,seen,token);return true;}
async function queryRelated(uid,records,seen,token){
  try{await snapshotDocumentTree(`users/${uid}`,records,seen,token);}catch(error){throw new Error(`user_document_tree: ${error.message}`);}
  try{
    for(const root of ['billingCustomers','accountClaims','accountResets'])await snapshotOneDocument(`${root}/${uid}`,records,seen,token);
    await snapshotDocumentTree(`accountQuarantines/${uid}`,records,seen,token);
  }catch(error){throw new Error(`account_control_documents: ${error.message}`);}
  let redemptions;try{redemptions=await runFieldQuery('promotionRedemptions','uid',uid,token);}catch(error){throw new Error(`promotion_query: ${error.message}`);}
  for(const document of redemptions)await snapshotDocumentTree(document.path,records,seen,token);
  let partnershipRoots;try{partnershipRoots=await listDocuments('','partnerships',token);}catch(error){throw new Error(`partnership_inventory: ${error.message}`);}
  const partnerships=new Set(),membership=[];
  for(const root of partnershipRoots){
    const member=await getFirestoreDocument(`${root.path}/members/${uid}`,token);
    if(member){membership.push(member);partnerships.add(root.path);}
    if(String(root.data?.createdBy||'')===uid)partnerships.add(root.path);
  }
  for(const partnershipPath of [...partnerships].sort())await snapshotDocumentTree(partnershipPath,records,seen,token);
  return{membershipCount:membership.length,partnershipPaths:[...partnerships].sort()};
}
function accountStats(uid,records,storageObjects){
  const personalPrefix=`users/${uid}/entries/`,personalEntries=records.filter(row=>row.path.startsWith(personalPrefix)&&row.path.split('/').length===4).map(row=>row.data),partnershipRoots=new Set();
  for(const row of records)if(/^partnerships\/[^/]+$/.test(row.path))partnershipRoots.add(row.path);
  const partnershipEntries=records.filter(row=>/^partnerships\/[^/]+\/entries\/[^/]+$/.test(row.path)).map(row=>row.data),entries=[...personalEntries,...partnershipEntries];
  const meta=records.find(row=>row.path===`users/${uid}/app/meta`)?.data||{},receiptReferences=new Set();
  for(const row of records)walk(row.data,(name,value)=>{if(name==='receiptPath'||name==='receiptUrl'){const found=receiptPath(value);if(found)receiptReferences.add(found);}});
  const amount=(kind)=>entries.filter(item=>item&&item.deletedAt==null&&(!kind||item.kind===kind)).reduce((sum,item)=>sum+(Number(item.amount)||0),0);
  const domain=meta.domain&&typeof meta.domain==='object'?meta.domain:{};
  return{
    businessCount:Array.isArray(meta.businesses)?meta.businesses.length:0,
    personalEntryCount:personalEntries.length,
    partnershipEntryCount:partnershipEntries.length,
    transactionCount:entries.length,
    activeTransactionCount:entries.filter(item=>item&&item.deletedAt==null).length,
    incomeTotal:amount('income'),expenseTotal:amount('expense'),allAmountTotal:amount(null),
    receiptReferenceCount:receiptReferences.size,storageReceiptCount:storageObjects.length,
    storageReceiptBytes:storageObjects.reduce((sum,item)=>sum+Number(item.size||0),0),
    partnershipCount:partnershipRoots.size,
    ltdCounts:Object.fromEntries(Object.entries(domain).filter(([,value])=>Array.isArray(value)).map(([name,value])=>[name,value.length]).sort(([a],[b])=>a.localeCompare(b)))
  };
}
async function snapshotStorage(uid,outputDir,token){
  const objects=[],listed=await listStorageMetadata(uid,token);await fs.mkdir(path.join(outputDir,'storage-bytes'),{recursive:true});
  for(const metadata of listed){
    const response=await fetch(`https://storage.googleapis.com/download/storage/v1/b/${encodeURIComponent(BUCKET)}/o/${encodeURIComponent(metadata.name)}?alt=media`,{headers:{authorization:`Bearer ${token}`}});if(!response.ok)throw new Error(`Storage download failed for ${safeToken(metadata.name)}: ${response.status}`);
    const bytes=Buffer.from(await response.arrayBuffer()),digest=sha256(bytes),filename=`${sha256(metadata.name)}.bin`;
    if(Number(metadata.size)!==bytes.length)throw new Error(`Storage byte count mismatch for ${safeToken(metadata.name)}`);
    await fs.writeFile(path.join(outputDir,'storage-bytes',filename),bytes);
    objects.push({...metadata,snapshotFile:`storage-bytes/${filename}`,size:bytes.length,sha256:digest});
  }
  return objects;
}
async function listStorageMetadata(uid,token){
  const prefix=`receipts/${uid}/`,listed=[];let pageToken='';
  do{const url=new URL(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}/o`);url.searchParams.set('prefix',prefix);url.searchParams.set('maxResults','1000');if(pageToken)url.searchParams.set('pageToken',pageToken);const body=await requestJson(url.toString(),token);listed.push(...(body.items||[]));pageToken=String(body.nextPageToken||'');}while(pageToken);
  return listed.sort((a,b)=>a.name.localeCompare(b.name)).map(metadata=>({name:metadata.name,nameSha256:sha256(metadata.name),size:Number(metadata.size)||0,generation:String(metadata.generation||''),metageneration:String(metadata.metageneration||''),contentType:metadata.contentType||null,md5Hash:metadata.md5Hash||null,crc32c:metadata.crc32c||null,timeCreated:metadata.timeCreated||null,updated:metadata.updated||null}));
}
async function billingStatus(uid,token){
  const billing=await getFirestoreDocument(`billingCustomers/${uid}`,token),entitlement=await getFirestoreDocument(`users/${uid}/entitlements/current`,token),entitlementData=entitlement?.data||{};
  const projectedPaid=['active','trialing','past_due'].includes(String(entitlementData.subscriptionStatus||''))&&['plus','pro'].includes(String(entitlementData.paidTier||''));
  const result={billingDocument:!!billing,entitlementStatus:String(entitlementData.subscriptionStatus||'none'),paidTier:String(entitlementData.paidTier||'free'),projectedPaid,customerExists:false,liveSubscriptionCount:0,livePaidInvoiceCount:0,blocked:false};
  if(!billing){result.blocked=projectedPaid;return result;}
  const customerId=String(billing.data?.stripeCustomerId||'');if(!/^cus_[A-Za-z0-9]+$/.test(customerId)){result.blocked=true;result.reason='invalid_billing_customer_reference';return result;}
  const key=await secretValue('STRIPE_SECRET_KEY',token);if(!/^(?:rk|sk)_live_/.test(key))throw new Error('Production Stripe secret is not LIVE');
  const stripe=new Stripe(key,{maxNetworkRetries:2});
  try{
    const customer=await stripe.customers.retrieve(customerId);result.customerExists=!!customer&&!customer.deleted;
    const subscriptions=await stripe.subscriptions.list({customer:customerId,status:'all',limit:100}),invoices=await stripe.invoices.list({customer:customerId,limit:100});
    result.liveSubscriptionCount=subscriptions.data.filter(item=>item.livemode).length;
    result.livePaidInvoiceCount=invoices.data.filter(item=>item.livemode&&item.paid&&Number(item.amount_paid)>0).length;
    result.blocked=result.liveSubscriptionCount>0||result.livePaidInvoiceCount>0||projectedPaid;
  }catch(error){if(error?.code==='resource_missing'){result.customerExists=false;result.reason='stripe_customer_missing';result.blocked=projectedPaid;}else throw error;}
  return result;
}
async function checksumDirectory(root){
  const rows=[];
  async function visit(current){for(const entry of (await fs.readdir(current,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const absolute=path.join(current,entry.name),relative=path.relative(root,absolute).replace(/\\/g,'/');if(entry.isDirectory())await visit(absolute);else if(relative!=='CHECKSUMS.sha256'){const bytes=await fs.readFile(absolute);rows.push(`${sha256(bytes)}  ${relative}`);}}}
  await visit(root);await fs.writeFile(path.join(root,'CHECKSUMS.sha256'),`${rows.join('\n')}\n`,'utf8');return rows;
}
async function verifyChecksums(root){
  const manifest=await fs.readFile(path.join(root,'CHECKSUMS.sha256'),'utf8'),rows=manifest.trim().split(/\r?\n/).filter(Boolean);let checked=0;
  for(const row of rows){const match=/^([a-f0-9]{64})  (.+)$/.exec(row);if(!match)throw new Error('Invalid checksum manifest');const bytes=await fs.readFile(path.join(root,...match[2].split('/')));if(sha256(bytes)!==match[1])throw new Error(`Snapshot checksum mismatch: ${match[2]}`);checked++;}
  return checked;
}
function collectReceiptReferences(records){
  const rows=[];
  for(const document of records)walk(document.data,(name,value,parent)=>{if(name!=='receiptPath'&&name!=='receiptUrl')return;const parsed=receiptPath(value);if(parsed)rows.push({documentPath:document.path,field:name,reference:String(value),path:parsed,isUrl:/^https?:\/\//i.test(String(value||'')),parent});});
  return rows;
}
function directRecordObjects(records){
  const rows=[];
  for(const document of records){rows.push({source:document.path,record:document.data});walk(document.data,(name,value,parent)=>{if(Array.isArray(value))for(const item of value)if(item&&typeof item==='object'&&!Array.isArray(item)&&('id'in item||'recordId'in item))rows.push({source:`${document.path}:${parent}.${name}`,record:item});});}
  return rows;
}
function previewGhost(value){let found=false;walk({value},(name,item)=>{if(String(item||'').trim().toUpperCase()==='LOBAKPE FOUNDER PREVIEW LTD'||name==='previewFixture'&&item===true||name==='previewAlias'&&String(item).toLowerCase()==='lobakpe1')found=true;});return found;}
function pathOwner(receipt){const match=/^receipts\/([^/]+)\//.exec(String(receipt||''));return match?match[1]:null;}
async function loadSnapshotTarget(snapshotRoot,label){
  const firestore=JSON.parse(await fs.readFile(path.join(snapshotRoot,label,'firestore.json'),'utf8')),storage=JSON.parse(await fs.readFile(path.join(snapshotRoot,label,'storage.json'),'utf8'));
  return{records:firestore.documents||[],objects:storage.objects||[]};
}
async function analyzeSnapshot(){
  const snapshotRoot=path.resolve(requiredEnv('TAXMATE_PRIVATE_SNAPSHOT_DIR'));await verifyChecksums(snapshotRoot);
  const identities=JSON.parse(await fs.readFile(path.join(snapshotRoot,'PRIVATE_AUTH_IDENTITIES.json'),'utf8')),summary=JSON.parse(await fs.readFile(path.join(snapshotRoot,'SNAPSHOT_SUMMARY_REDACTED.json'),'utf8'));
  const founderUid=identities.founder.uid,resetUid=identities.resetTarget.uid,[founder,resetTarget]=await Promise.all([loadSnapshotTarget(snapshotRoot,'founder'),loadSnapshotTarget(snapshotRoot,'resetTarget')]);
  const objectNames=new Set([...founder.objects,...resetTarget.objects].map(item=>item.name)),labels=new Map([[founderUid,'founder'],[resetUid,'resetTarget']]);
  const analyze=(label,uid,target)=>{
    const references=collectReceiptReferences(target.records),referencedPaths=new Set(references.map(item=>item.path)),ownerRecords=directRecordObjects(target.records),ownerFields=ownerRecords.filter(item=>Object.prototype.hasOwnProperty.call(item.record||{},'accountOwnerUid'));
    const receiptClasses={normalOwned:0,ownedStale:0,ownedLegacyUrlOnly:0,foreignResetTarget:0,foreignFounder:0,foreignOtherOrUnknown:0,orphans:target.objects.filter(item=>!referencedPaths.has(item.name)).length},receiptReferenceCategories={};
    for(const reference of references){
      const owner=pathOwner(reference.path),category=reference.documentPath.startsWith(`users/${uid}/entries/`)?'personalEntry':reference.documentPath===`users/${uid}/app/meta`?'personalMeta':/^partnerships\/[^/]+\/entries\//.test(reference.documentPath)?'partnershipEntry':'otherDocument';let classification;
      if(owner===uid){classification=objectNames.has(reference.path)?'ownedAvailable':'ownedStale';if(reference.isUrl&&reference.field==='receiptUrl')receiptClasses.ownedLegacyUrlOnly++;if(objectNames.has(reference.path))receiptClasses.normalOwned++;else receiptClasses.ownedStale++;}else if(owner===resetUid){classification='foreignResetTarget';receiptClasses.foreignResetTarget++;}else if(owner===founderUid){classification='foreignFounder';receiptClasses.foreignFounder++;}else{classification='foreignOtherOrUnknown';receiptClasses.foreignOtherOrUnknown++;}
      const key=`${category}:${classification}:${reference.field}`;receiptReferenceCategories[key]=(receiptReferenceCategories[key]||0)+1;
    }
    const roots=target.records.filter(row=>/^partnerships\/[^/]+$/.test(row.path)),members=target.records.filter(row=>/^partnerships\/[^/]+\/members\/[^/]+$/.test(row.path)),ownedRoots=roots.filter(row=>row.data?.createdBy===uid),memberships=members.filter(row=>row.path.endsWith(`/${uid}`)||row.data?.uid===uid);
    return{
      firestoreDocuments:target.records.length,storageObjects:target.objects.length,
      ownerEvidence:{objectsInspected:ownerRecords.length,explicitOwnerFields:ownerFields.length,matchingOwnerFields:ownerFields.filter(item=>String(item.record.accountOwnerUid)===uid).length,mismatchingOwnerFields:ownerFields.filter(item=>String(item.record.accountOwnerUid)!==uid).length,ownerlessObjects:ownerRecords.length-ownerFields.length},
      receiptClasses,receiptReferenceCategories,previewGhostDocuments:target.records.filter(row=>previewGhost(row.data)).length,
      partnerships:{roots:roots.length,createdByTarget:ownedRoots.length,membershipDocuments:memberships.length,otherMembershipDocuments:members.length-memberships.length},
      proposedWrites:label==='founder'?{accountClaimCreateOrReplace:1,tagUserMetaAndEntries:target.records.filter(row=>row.path===`users/${uid}/app/meta`||row.path.startsWith(`users/${uid}/entries/`)).filter(row=>String(row.data?.accountOwnerUid||'')!==uid).length,receiptCopiesFromResetTarget:references.filter(row=>pathOwner(row.path)===resetUid&&objectNames.has(row.path)).length,previewGhostDocumentsToQuarantine:target.records.filter(row=>previewGhost(row.data)).length}:{userTreeDocumentsDelete:target.records.filter(row=>row.path===`users/${uid}`||row.path.startsWith(`users/${uid}/`)).length,promotionRedemptionsDelete:target.records.filter(row=>row.path.startsWith('promotionRedemptions/')).length,billingCustomerDelete:target.records.some(row=>row.path===`billingCustomers/${uid}`)?1:0,membershipDocumentsDelete:memberships.length,ownedSingletonPartnershipCandidates:ownedRoots.filter(root=>members.filter(member=>member.path.startsWith(`${root.path}/members/`)).length<=1).length,storageObjectsDelete:target.objects.length,resetMarkerCreateOrReplace:1}
    };
  };
  const report={status:'DRY_RUN_READY',projectId:PROJECT_ID,snapshotVerified:summary.snapshotVerified===true,identityAllowlist:{founderUidSha256:sha256(founderUid),resetTargetUidSha256:sha256(resetUid),size:2},targets:{founder:analyze('founder',founderUid,founder),resetTarget:analyze('resetTarget',resetUid,resetTarget)},writeBoundary:{allowedUserLabels:['founder','resetTarget'],otherUidWrites:0,storagePrefixes:['founder','resetTarget'],fullUidValuesOmitted:true},notes:{labels:Object.fromEntries(labels),privateSnapshotExcludedFromQa:true}};
  delete report.notes.labels;
  const output=path.join(snapshotRoot,'DRY_RUN_ANALYSIS_REDACTED.json');await fs.writeFile(output,json(report),'utf8');await checksumDirectory(snapshotRoot);await verifyChecksums(snapshotRoot);process.stdout.write(json(report));
}
function documentMap(records){return new Map(records.map(document=>[document.path,document]));}
function comparableDocuments(records){return records.map(document=>({path:document.path,updateTime:document.updateTime,data:stable(document.data)})).sort((a,b)=>a.path.localeCompare(b.path));}
function comparableStorage(objects){return objects.map(item=>({name:item.name,generation:String(item.generation||''),size:Number(item.size)||0,md5Hash:item.md5Hash||null,crc32c:item.crc32c||null})).sort((a,b)=>a.name.localeCompare(b.name));}
function equalStable(left,right){return JSON.stringify(stable(left))===JSON.stringify(stable(right));}
function targetPartnershipState(uid,records){
  const roots=records.filter(row=>/^partnerships\/[^/]+$/.test(row.path)),members=records.filter(row=>/^partnerships\/[^/]+\/members\/[^/]+$/.test(row.path));
  return roots.map(root=>({root,documents:records.filter(row=>row.path===root.path||row.path.startsWith(`${root.path}/`)),members:members.filter(row=>row.path.startsWith(`${root.path}/members/`)),createdByTarget:String(root.data?.createdBy||'')===uid}));
}
function assertPlanPath(pathName,label,founderUid,resetUid,founderPartnerships,resetOwnedPartnerships){
  const founderAllowed=pathName===`accountClaims/${founderUid}`||pathName.startsWith(`accountQuarantines/${founderUid}/`)||pathName===`users/${founderUid}/app/meta`||pathName.startsWith(`users/${founderUid}/entries/`)||pathName===`users/${founderUid}/ltdControl/activeCompany`||[...founderPartnerships].some(root=>pathName.startsWith(`${root}/entries/`));
  const resetAllowed=pathName===`accountResets/${resetUid}`||pathName===`accountClaims/${resetUid}`||pathName===`billingCustomers/${resetUid}`||pathName===`accountQuarantines/${resetUid}`||pathName.startsWith(`accountQuarantines/${resetUid}/`)||pathName===`users/${resetUid}`||pathName.startsWith(`users/${resetUid}/`)||pathName.startsWith('promotionRedemptions/')||[...resetOwnedPartnerships].some(root=>pathName===root||pathName.startsWith(`${root}/`))||/^partnerships\/[^/]+\/members\/[^/]+$/.test(pathName)&&pathName.endsWith(`/${resetUid}`);
  if(label==='founder'&&!founderAllowed)throw new Error(`Founder plan path escaped allowlist: ${safeToken(pathName)}`);
  if(label==='resetTarget'&&!resetAllowed)throw new Error(`Reset plan path escaped allowlist: ${safeToken(pathName)}`);
}
function buildRepairPlan(snapshotRoot,identities,founder,resetTarget,nowIso){
  const founderUid=identities.founder.uid,resetUid=identities.resetTarget.uid,founderDocs=documentMap(founder.records),resetDocs=documentMap(resetTarget.records),founderPatches=new Map(),founderWrites=[],founderPartnerships=new Set(targetPartnershipState(founderUid,founder.records).map(group=>group.root.path));
  const patchFounder=(document,field,value)=>{if(!document?.updateTime)throw new Error('Founder patch target is missing its update time');const row=founderPatches.get(document.path)||{document,fields:{}};row.fields[field]=value;founderPatches.set(document.path,row);};
  for(const document of founder.records){
    const taggable=document.path===`users/${founderUid}/app/meta`||document.path.startsWith(`users/${founderUid}/entries/`)||document.path===`users/${founderUid}/ltdControl/activeCompany`;
    if(taggable&&String(document.data?.accountOwnerUid||'')!==founderUid)patchFounder(document,'accountOwnerUid',founderUid);
  }
  const existingClaim=founderDocs.get(`accountClaims/${founderUid}`);
  if(existingClaim){if(String(existingClaim.data?.ownerUid||'')!==founderUid||existingClaim.data?.status!=='verified'||!['server_migration','server_created'].includes(existingClaim.data?.claimType))throw new Error('Founder account claim conflicts with verified identity');}
  else founderWrites.push({label:'founder',path:`accountClaims/${founderUid}`,write:patchWrite(`accountClaims/${founderUid}`,{schemaVersion:1,status:'verified',claimType:'server_migration',ownerUid:founderUid,verifiedAt:{$timestamp:nowIso}},{exists:false}),kind:'create_claim'});
  const founderReferences=collectReceiptReferences(founder.records),resetObjects=new Set(resetTarget.objects.map(item=>item.name)),foreignByDocument=new Map();
  for(const reference of founderReferences){
    const owner=pathOwner(reference.path);if(owner===founderUid)continue;
    if(owner===resetUid&&resetObjects.has(reference.path))throw new Error('Cross-target receipt copy is required but was not approved by the verified dry-run');
    if(reference.parent!=='root')throw new Error('Nested foreign receipt reference needs a manual migration strategy');
    const document=founderDocs.get(reference.documentPath);if(!document)throw new Error('Foreign receipt source document is missing');
    const group=foreignByDocument.get(document.path)||{document,references:[]};group.references.push({field:reference.field,value:reference.reference,pathOwnerSha256:owner?sha256(owner):null});foreignByDocument.set(document.path,group);patchFounder(document,reference.field,null);
  }
  for(const group of foreignByDocument.values()){
    const quarantineId=sha256(group.document.path).slice(0,32),quarantinePath=`accountQuarantines/${founderUid}/migrations/${quarantineId}`;
    if(founderDocs.has(quarantinePath))throw new Error('Founder quarantine target already exists');
    founderWrites.push({label:'founder',path:quarantinePath,kind:'quarantine_reference',write:patchWrite(quarantinePath,{schemaVersion:1,status:'isolated',reason:'foreign_or_unverified_receipt_owner',ownerUid:founderUid,sourceDocumentPath:group.document.path,originalReferences:group.references,isolatedAt:{$timestamp:nowIso}},{exists:false})});
  }
  for(const {document,fields} of founderPatches.values())founderWrites.push({label:'founder',path:document.path,kind:'patch_owner_or_receipt',write:patchWrite(document.path,fields,{updateTime:document.updateTime})});

  const partnershipState=targetPartnershipState(resetUid,resetTarget.records),resetOwnedPartnerships=new Set(),resetDeleteDocuments=new Map();
  for(const group of partnershipState){
    const otherMembers=group.members.filter(member=>!member.path.endsWith(`/${resetUid}`)&&String(member.data?.uid||'')!==resetUid);
    if(group.createdByTarget){if(otherMembers.length)throw new Error('Tammy-owned partnership has another member and cannot be deleted');resetOwnedPartnerships.add(group.root.path);for(const document of group.documents)resetDeleteDocuments.set(document.path,document);}
    else for(const member of group.members)if(member.path.endsWith(`/${resetUid}`)||String(member.data?.uid||'')===resetUid)resetDeleteDocuments.set(member.path,member);
  }
  for(const document of resetTarget.records){
    const allowed=document.path===`users/${resetUid}`||document.path.startsWith(`users/${resetUid}/`)||document.path===`billingCustomers/${resetUid}`||document.path===`accountClaims/${resetUid}`||document.path===`accountQuarantines/${resetUid}`||document.path.startsWith(`accountQuarantines/${resetUid}/`)||document.path.startsWith('promotionRedemptions/');
    if(allowed&&document.path!==`accountResets/${resetUid}`)resetDeleteDocuments.set(document.path,document);
  }
  const resetWrites=[...resetDeleteDocuments.values()].sort((a,b)=>b.path.split('/').length-a.path.split('/').length||a.path.localeCompare(b.path)).map(document=>({label:'resetTarget',path:document.path,kind:'delete_document',write:deleteWrite(document)}));
  for(const operation of [...founderWrites,...resetWrites])assertPlanPath(operation.path,operation.label,founderUid,resetUid,founderPartnerships,resetOwnedPartnerships);
  for(const object of resetTarget.objects)if(!object.name.startsWith(`receipts/${resetUid}/`)||!object.generation)throw new Error('Reset Storage object escaped exact UID prefix or lacks generation');
  return{snapshotRoot,founderUid,resetUid,founder,resetTarget,founderWrites,resetWrites,resetStorage:resetTarget.objects,resetOwnedPartnerships,foreignReferenceDocuments:foreignByDocument.size};
}
function hasVerifiedGoogleSnapshotIdentity(user){return user?.emailVerified===true&&(user.providerData||[]).some(provider=>provider.providerId==='google.com');}
async function verifyLiveIdentity(founderEmail,resetEmail,identities,token){
  const lookup=await requestJson(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,token,{method:'POST',body:JSON.stringify({email:[founderEmail,resetEmail]})}),users=lookup.users||[],founder=users.find(user=>String(user.email||'').toLowerCase()===founderEmail),reset=users.find(user=>String(user.email||'').toLowerCase()===resetEmail);
  if(!founder||!reset||founder.localId!==identities.founder.uid||reset.localId!==identities.resetTarget.uid||founder.localId===reset.localId)throw new Error('Live Firebase Auth identities do not match the verified snapshot');
  if(founder.disabled||reset.disabled)throw new Error('A target Firebase Auth identity is disabled');
  const isVerifiedGoogle=user=>user.emailVerified===true&&(user.providerUserInfo||[]).some(provider=>provider.providerId==='google.com');
  if(!isVerifiedGoogle(founder)||!isVerifiedGoogle(reset)||!hasVerifiedGoogleSnapshotIdentity(identities.founder)||!hasVerifiedGoogleSnapshotIdentity(identities.resetTarget))throw new Error('Both exact target identities must be verified Google accounts');
  return{founder,reset};
}
async function liveTarget(uid,token){const records=[],seen=new Set();await queryRelated(uid,records,seen,token);records.sort((a,b)=>a.path.localeCompare(b.path));return{records,objects:await listStorageMetadata(uid,token)};}
async function verifyNoTargetDrift(plan,token){
  const roots=await listCollectionIds('',token),unknownRoots=roots.filter(item=>!KNOWN_ROOT_COLLECTIONS.has(item));if(unknownRoots.length)throw new Error('Unknown production root collection blocks exact-scope migration');
  const [founderLive,resetLive]=await Promise.all([liveTarget(plan.founderUid,token),liveTarget(plan.resetUid,token)]);
  if(!equalStable(comparableDocuments(founderLive.records),comparableDocuments(plan.founder.records))||!equalStable(comparableDocuments(resetLive.records),comparableDocuments(plan.resetTarget.records)))throw new Error('Production Firestore target data drifted after snapshot');
  if(!equalStable(comparableStorage(founderLive.objects),comparableStorage(plan.founder.objects))||!equalStable(comparableStorage(resetLive.objects),comparableStorage(plan.resetTarget.objects)))throw new Error('Production Storage target data drifted after snapshot');
  return{rootCollections:roots,founderLive,resetLive};
}
async function commitWrites(token,writes){if(!writes.length)return{writeResults:[]};if(writes.length>450)throw new Error('Firestore atomic write plan is too large');return requestJson(`${DATABASE_ROOT}/documents:commit`,token,{method:'POST',body:JSON.stringify({writes})});}
async function writeResetMarker(token,uid,status,resetEpoch,correlationId,precondition,failedStage=null){
  const fields={schemaVersion:1,status,resetEpoch,correlationId,updatedAt:{$timestamp:new Date().toISOString()},failedStage};
  return commitWrites(token,[patchWrite(`accountResets/${uid}`,fields,precondition)]);
}
async function deleteStorageObject(token,object){
  const url=new URL(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}/o/${encodeURIComponent(object.name)}`);url.searchParams.set('ifGenerationMatch',String(object.generation));
  const response=await fetch(url,{method:'DELETE',headers:{authorization:`Bearer ${token}`}});if(response.status!==204&&response.status!==200)throw new Error(`Storage delete failed for ${object.nameSha256.slice(0,16)}: ${response.status}`);
}
function redactedStats(uid,target){
  const references=collectReceiptReferences(target.records),ownedReferences=references.filter(item=>pathOwner(item.path)===uid),foreignReferences=references.length-ownedReferences.length;
  return{...accountStats(uid,target.records,target.objects),ownedReceiptReferenceCount:new Set(ownedReferences.map(item=>item.path)).size,foreignOrUnverifiedReceiptReferenceCount:foreignReferences};
}
async function verifyProductionRepair(plan,token,expectedResetEpoch,identities){
  const [founderPost,resetPost]=await Promise.all([liveTarget(plan.founderUid,token),liveTarget(plan.resetUid,token)]),founderBefore=redactedStats(plan.founderUid,plan.founder),founderAfter=redactedStats(plan.founderUid,founderPost),resetMarker=await getFirestoreDocument(`accountResets/${plan.resetUid}`,token);
  for(const field of ['businessCount','personalEntryCount','partnershipEntryCount','transactionCount','activeTransactionCount','incomeTotal','expenseTotal','allAmountTotal','storageReceiptCount','storageReceiptBytes','partnershipCount','ownedReceiptReferenceCount'])if(founderBefore[field]!==founderAfter[field])throw new Error(`Founder integrity changed at ${field}`);
  if(founderAfter.foreignOrUnverifiedReceiptReferenceCount!==0)throw new Error('Founder active data still contains foreign receipt references');
  if(resetPost.records.some(row=>row.path!==`accountResets/${plan.resetUid}`)||resetPost.objects.length)throw new Error('Tammy TaxMate cloud data is not empty after reset');
  if(!resetMarker||resetMarker.data?.status!=='complete'||Number(resetMarker.data?.resetEpoch)!==expectedResetEpoch)throw new Error('Tammy reset marker is incomplete');
  if(identities?.founder?.uid!==plan.founderUid||identities?.resetTarget?.uid!==plan.resetUid)throw new Error('Post-apply identity evidence does not match the exact plan');
  const authToken=(await accessToken()).access_token;await verifyLiveIdentity(requiredEnv('TAXMATE_FOUNDER_EMAIL').toLowerCase(),requiredEnv('TAXMATE_RESET_EMAIL').toLowerCase(),identities,authToken);
  return{founderBefore,founderAfter,resetTarget:{firestoreDocumentsRemaining:0,storageObjectsRemaining:0,authIdentityRetained:true,resetMarkerStatus:'complete',resetEpochSha256:sha256(String(expectedResetEpoch))},writeBoundary:{exactUidAllowlistSize:2,otherUidWrites:0,founderOperationCount:plan.founderWrites.length,resetOperationCount:plan.resetWrites.length,resetStorageDeleteCount:plan.resetStorage.length,fullUidValuesOmitted:true}};
}
async function applyRepair(){
  if(requiredEnv('TAXMATE_PRODUCTION_REPAIR_CONFIRM')!=='APPLY_TAXMATE_2_1_14_EXACT_TARGETS')throw new Error('Production repair confirmation does not match');
  const snapshotRoot=path.resolve(requiredEnv('TAXMATE_PRIVATE_SNAPSHOT_DIR'));await verifyChecksums(snapshotRoot);
  const identities=JSON.parse(await fs.readFile(path.join(snapshotRoot,'PRIVATE_AUTH_IDENTITIES.json'),'utf8')),founderEmail=requiredEnv('TAXMATE_FOUNDER_EMAIL').toLowerCase(),resetEmail=requiredEnv('TAXMATE_RESET_EMAIL').toLowerCase();
  if(founderEmail!==String(identities.founder.email||'').toLowerCase()||resetEmail!==String(identities.resetTarget.email||'').toLowerCase())throw new Error('Production target emails do not match the private snapshot');
  const [founder,resetTarget]=await Promise.all([loadSnapshotTarget(snapshotRoot,'founder'),loadSnapshotTarget(snapshotRoot,'resetTarget')]),token=(await accessToken()).access_token;
  await verifyLiveIdentity(founderEmail,resetEmail,identities,token);const billing=await billingStatus(identities.resetTarget.uid,token);if(billing.blocked||billing.liveSubscriptionCount||billing.livePaidInvoiceCount)throw new Error('Tammy LIVE billing preflight blocks production reset');
  const plan=buildRepairPlan(snapshotRoot,identities,founder,resetTarget,new Date().toISOString());await verifyNoTargetDrift(plan,token);
  const existingReset=resetTarget.records.find(row=>row.path===`accountResets/${plan.resetUid}`),resetEpoch=Math.max(Date.now(),Number(existingReset?.data?.resetEpoch||0)+1),correlationId=crypto.randomUUID();
  let resetStarted=false,stage='reset_marker';
  try{
    await writeResetMarker(token,plan.resetUid,'deleting',resetEpoch,correlationId,existingReset?{updateTime:existingReset.updateTime}:{exists:false});resetStarted=true;
    const deletingMarker=await getFirestoreDocument(`accountResets/${plan.resetUid}`,token);if(!deletingMarker||deletingMarker.data?.status!=='deleting')throw new Error('Deleting reset marker was not persisted');
    stage='storage';for(const object of plan.resetStorage)await deleteStorageObject(token,object);
    stage='firestore_atomic';const completeWrite=patchWrite(`accountResets/${plan.resetUid}`,{schemaVersion:1,status:'complete',resetEpoch,correlationId,updatedAt:{$timestamp:new Date().toISOString()},failedStage:null},{updateTime:deletingMarker.updateTime});await commitWrites(token,[...plan.founderWrites.map(item=>item.write),...plan.resetWrites.map(item=>item.write),completeWrite]);
    stage='verification';const verified=await verifyProductionRepair(plan,token,resetEpoch,identities),report={status:'PRODUCTION_REPAIR_VERIFIED',projectId:PROJECT_ID,completedAt:new Date().toISOString(),identityAllowlist:{founderUidSha256:sha256(plan.founderUid),resetTargetUidSha256:sha256(plan.resetUid),size:2},billingPreflight:{projectedPaid:billing.projectedPaid,liveSubscriptionCount:billing.liveSubscriptionCount,livePaidInvoiceCount:billing.livePaidInvoiceCount,externalStripeCustomerModified:false},receiptIsolation:{documentsQuarantined:plan.foreignReferenceDocuments,founderStorageBytesCopied:0,founderStorageBytesDeleted:0},...verified};
    await fs.writeFile(path.join(snapshotRoot,'PRODUCTION_REPAIR_RESULT_REDACTED.json'),json(report),'utf8');await checksumDirectory(snapshotRoot);await verifyChecksums(snapshotRoot);process.stdout.write(json(report));
  }catch(error){
    if(resetStarted){const marker=await getFirestoreDocument(`accountResets/${plan.resetUid}`,token).catch(()=>null);if(marker&&marker.data?.status!=='complete')await writeResetMarker(token,plan.resetUid,'failed',resetEpoch,correlationId,{updateTime:marker.updateTime},stage).catch(()=>{});}
    throw error;
  }
}
async function verifyAppliedRepair(){
  const snapshotRoot=path.resolve(requiredEnv('TAXMATE_PRIVATE_SNAPSHOT_DIR'));await verifyChecksums(snapshotRoot);
  const identities=JSON.parse(await fs.readFile(path.join(snapshotRoot,'PRIVATE_AUTH_IDENTITIES.json'),'utf8')),founderEmail=requiredEnv('TAXMATE_FOUNDER_EMAIL').toLowerCase(),resetEmail=requiredEnv('TAXMATE_RESET_EMAIL').toLowerCase();
  if(founderEmail!==String(identities.founder.email||'').toLowerCase()||resetEmail!==String(identities.resetTarget.email||'').toLowerCase())throw new Error('Production target emails do not match the private snapshot');
  const [founder,resetTarget]=await Promise.all([loadSnapshotTarget(snapshotRoot,'founder'),loadSnapshotTarget(snapshotRoot,'resetTarget')]),token=(await accessToken()).access_token,plan=buildRepairPlan(snapshotRoot,identities,founder,resetTarget,new Date().toISOString());
  await verifyLiveIdentity(founderEmail,resetEmail,identities,token);const marker=await getFirestoreDocument(`accountResets/${plan.resetUid}`,token),resetEpoch=Number(marker?.data?.resetEpoch);
  if(!marker||marker.data?.status!=='complete'||!Number.isFinite(resetEpoch))throw new Error('Completed Tammy reset marker is unavailable');
  const verified=await verifyProductionRepair(plan,token,resetEpoch,identities),report={status:'PRODUCTION_REPAIR_VERIFIED_AFTER_APPLY',projectId:PROJECT_ID,completedAt:new Date().toISOString(),identityAllowlist:{founderUidSha256:sha256(plan.founderUid),resetTargetUidSha256:sha256(plan.resetUid),size:2},receiptIsolation:{documentsQuarantined:plan.foreignReferenceDocuments,founderStorageBytesCopied:0,founderStorageBytesDeleted:0},...verified};
  await fs.writeFile(path.join(snapshotRoot,'PRODUCTION_REPAIR_RESULT_REDACTED.json'),json(report),'utf8');await checksumDirectory(snapshotRoot);await verifyChecksums(snapshotRoot);process.stdout.write(json(report));
}
async function planRepair(){
  const snapshotRoot=path.resolve(requiredEnv('TAXMATE_PRIVATE_SNAPSHOT_DIR'));await verifyChecksums(snapshotRoot);const identities=JSON.parse(await fs.readFile(path.join(snapshotRoot,'PRIVATE_AUTH_IDENTITIES.json'),'utf8')),[founder,resetTarget]=await Promise.all([loadSnapshotTarget(snapshotRoot,'founder'),loadSnapshotTarget(snapshotRoot,'resetTarget')]),plan=buildRepairPlan(snapshotRoot,identities,founder,resetTarget,new Date().toISOString()),kinds=rows=>rows.reduce((result,item)=>{result[item.kind]=(result[item.kind]||0)+1;return result;},{});
  const report={status:'WRITE_PLAN_READY',projectId:PROJECT_ID,identityAllowlist:{founderUidSha256:sha256(plan.founderUid),resetTargetUidSha256:sha256(plan.resetUid),size:2},founder:{firestoreOperations:plan.founderWrites.length,operationKinds:kinds(plan.founderWrites),foreignReferenceDocumentsToQuarantine:plan.foreignReferenceDocuments,storageDeletes:0},resetTarget:{firestoreOperations:plan.resetWrites.length,operationKinds:kinds(plan.resetWrites),storageDeletes:plan.resetStorage.length,ownedPartnershipsToDelete:plan.resetOwnedPartnerships.size},writeBoundary:{otherUidWrites:0,allFirestoreWritesPreconditioned:[...plan.founderWrites,...plan.resetWrites].every(item=>!!item.write.currentDocument),allStorageDeletesGenerationMatched:plan.resetStorage.every(item=>!!item.generation),fullUidValuesOmitted:true}};
  await fs.writeFile(path.join(snapshotRoot,'WRITE_PLAN_REDACTED.json'),json(report),'utf8');await checksumDirectory(snapshotRoot);await verifyChecksums(snapshotRoot);process.stdout.write(json(report));
}
async function snapshot(){
  if(process.env.GCLOUD_PROJECT&&process.env.GCLOUD_PROJECT!==PROJECT_ID)throw new Error('GCLOUD_PROJECT mismatch');
  const founderEmail=requiredEnv('TAXMATE_FOUNDER_EMAIL').toLowerCase(),resetEmail=requiredEnv('TAXMATE_RESET_EMAIL').toLowerCase();if(founderEmail===resetEmail)throw new Error('Target identities must be different');
  const outputRoot=path.resolve(process.env.TAXMATE_PRIVATE_SNAPSHOT_DIR||path.join(__dirname,'..','.hosting-build','production-account-repair',new Date().toISOString().replace(/[:.]/g,'-')));
  try{await fs.access(outputRoot);throw new Error(`Snapshot directory already exists: ${outputRoot}`);}catch(error){if(error.code!=='ENOENT')throw error;}await fs.mkdir(outputRoot,{recursive:true});
  const token=(await accessToken()).access_token,lookup=await requestJson(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,token,{method:'POST',body:JSON.stringify({email:[founderEmail,resetEmail]})}),users=lookup.users||[];
  const founder=users.find(user=>String(user.email||'').toLowerCase()===founderEmail),resetTarget=users.find(user=>String(user.email||'').toLowerCase()===resetEmail);
  if(!founder||!resetTarget)throw new Error('One or both Firebase Auth identities were not found');
  founder.uid=founder.localId;founder.emailVerified=founder.emailVerified===true;founder.disabled=founder.disabled===true;founder.providerData=(founder.providerUserInfo||[]).map(item=>({providerId:item.providerId,uid:item.rawId||item.federatedId||null}));
  resetTarget.uid=resetTarget.localId;resetTarget.emailVerified=resetTarget.emailVerified===true;resetTarget.disabled=resetTarget.disabled===true;resetTarget.providerData=(resetTarget.providerUserInfo||[]).map(item=>({providerId:item.providerId,uid:item.rawId||item.federatedId||null}));
  {
    if(String(founder.email||'').toLowerCase()!==founderEmail||String(resetTarget.email||'').toLowerCase()!==resetEmail)throw new Error('Firebase Auth identity mismatch');
    if(founder.uid===resetTarget.uid)throw new Error('Firebase Auth UID collision');
    let roots;try{roots=await listCollectionIds('',token);}catch(error){throw new Error(`root_collection_inventory: ${error.message}`);}const unknownRoots=roots.filter(item=>!KNOWN_ROOT_COLLECTIONS.has(item));
    const targets=[['founder',founder],['resetTarget',resetTarget]],privateIdentity={},safeIdentity={},safeSummary={projectId:PROJECT_ID,bucket:BUCKET,createdAt:new Date().toISOString(),rootCollections:roots,unknownRootCollections:unknownRoots,targets:{}};
    for(const [label,user] of targets){
      const targetDir=path.join(outputRoot,label);await fs.mkdir(targetDir,{recursive:true});const records=[],seen=new Set();
      const related=await queryRelated(user.uid,records,seen,token);let objects,billing;
      try{objects=await snapshotStorage(user.uid,targetDir,token);}catch(error){throw new Error(`${label}_storage_snapshot: ${error.message}`);}
      try{billing=await billingStatus(user.uid,token);}catch(error){throw new Error(`${label}_billing_preflight: ${error.message}`);}
      records.sort((a,b)=>a.path.localeCompare(b.path));privateIdentity[label]={uid:user.uid,email:user.email,emailVerified:user.emailVerified,disabled:user.disabled,providerData:user.providerData};safeIdentity[label]=maskIdentity(user);
      await fs.writeFile(path.join(targetDir,'firestore.json'),json({documents:records}),'utf8');await fs.writeFile(path.join(targetDir,'storage.json'),json({objects}),'utf8');
      safeSummary.targets[label]={identity:safeIdentity[label],firestoreDocumentCount:records.length,relatedMembershipCount:related.membershipCount,stats:accountStats(user.uid,records,objects),billing};
    }
    await fs.writeFile(path.join(outputRoot,'PRIVATE_AUTH_IDENTITIES.json'),json(privateIdentity),'utf8');await fs.writeFile(path.join(outputRoot,'SNAPSHOT_SUMMARY_REDACTED.json'),json(safeSummary),'utf8');
    await fs.writeFile(path.join(outputRoot,'README_FIRST.md'),`# Private TaxMate production snapshot\n\nThis directory contains private account data and exact Firebase identity values. Do not include it in the public or Founder QA ZIP.\n\nProject: ${PROJECT_ID}\nBucket: ${BUCKET}\nCreated: ${safeSummary.createdAt}\n`,'utf8');
    const checksumRows=await checksumDirectory(outputRoot),verified=await verifyChecksums(outputRoot);if(verified!==checksumRows.length)throw new Error('Snapshot verification count mismatch');
    safeSummary.checksumFiles=verified;safeSummary.snapshotVerified=true;await fs.writeFile(path.join(outputRoot,'SNAPSHOT_SUMMARY_REDACTED.json'),json(safeSummary),'utf8');await checksumDirectory(outputRoot);await verifyChecksums(outputRoot);
    process.stdout.write(json({status:safeSummary.targets.resetTarget.billing.blocked?'BLOCKED_LIVE_BILLING':'SNAPSHOT_VERIFIED',outputRoot,summary:safeSummary}));
    if(safeSummary.targets.resetTarget.billing.blocked)process.exitCode=42;
  }
}

async function main(){const command=process.argv[2]||'';if(command==='snapshot')await snapshot();else if(command==='analyze')await analyzeSnapshot();else if(command==='plan')await planRepair();else if(command==='apply')await applyRepair();else if(command==='verify')await verifyAppliedRepair();else throw new Error('Usage: node scripts/production-account-repair.js <snapshot|analyze|plan|apply|verify>');}
if(require.main===module)main().catch(error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1;});
module.exports={PROJECT_ID,PROJECT_NUMBER,BUCKET,stable,receiptPath,accountStats,encodeFirestoreValue,patchWrite,deleteWrite,buildRepairPlan,comparableDocuments,comparableStorage,hasVerifiedGoogleSnapshotIdentity};
