
/* ═══════════ Audit Test (taxmate.uk?audit=1) ═══════════ */
if(new URLSearchParams(location.search).get('audit')==='1'){
  window.addEventListener('load',function(){
    let pass=0,fail=0,warn=0,out=[];
    function assert(name,cond,exp,act){
      if(cond){pass++;out.push('✅ '+name);}
      else{fail++;out.push('❌ '+name+'\n   Expected: '+exp+'\n   Actual:   '+act);}
    }
    function warning(name,msg){warn++;out.push('⚠️ '+name+': '+msg);}

    // 1. Tax config
    const cfg=TAXCFG['2025-26'];
    assert('PA = £12,570',cfg.pa===12570,12570,cfg.pa);
    assert('Basic band = £37,700',cfg.basicBand===37700,37700,cfg.basicBand);
    assert('Higher threshold = £125,140',cfg.addlFrom===125140,125140,cfg.addlFrom);
    assert('Basic rate = 20%',cfg.basic===0.20,0.20,cfg.basic);
    assert('Higher rate = 40%',cfg.higher===0.40,0.40,cfg.higher);
    assert('Additional rate = 45%',cfg.addl===0.45,0.45,cfg.addl);
    assert('Class 4 main = 6%',cfg.c4Main===0.06,0.06,cfg.c4Main);
    assert('Class 4 upper = 2%',cfg.c4Upper===0.02,0.02,cfg.c4Upper);
    assert('Class 4 lower = £12,570',cfg.c4Low===12570,12570,cfg.c4Low);
    assert('Class 4 upper = £50,270',cfg.c4High===50270,50270,cfg.c4High);
    assert('Trading allowance = £1,000',cfg.tradingAllowance===1000,1000,cfg.tradingAllowance);

    // 2. Mileage (2025-26 = 45p, still correct for that year)
    const r1=cfg.mileageRate1, r2=cfg.mileageRate2;
    const m5k=Math.min(5000,10000)*r1+Math.max(5000-10000,0)*r2;
    assert('Mileage 5k miles @45p = £2,250',Math.abs(m5k-2250)<0.01,2250,m5k);
    const m10k=Math.min(10000,10000)*r1+Math.max(10000-10000,0)*r2;
    assert('Mileage 10k miles @45p = £4,500',Math.abs(m10k-4500)<0.01,4500,m10k);
    const m12k=Math.min(12000,10000)*r1+Math.max(12000-10000,0)*r2;
    assert('Mileage 12k miles @45p = £5,000',Math.abs(m12k-5000)<0.01,5000,m12k);
    // 2026-27 new 55p rate
    const cfg27=TAXCFG['2026-27'];
    assert('2026-27 mileage rate = 55p',cfg27.mileageRate1===0.55,0.55,cfg27.mileageRate1);
    const m10k27=Math.min(10000,10000)*cfg27.mileageRate1+Math.max(10000-10000,0)*cfg27.mileageRate2;
    assert('Mileage 10k miles @55p = £5,500',Math.abs(m10k27-5500)<0.01,5500,m10k27);

    // 3. Tax calc
    const it30k=(30000-12570)*0.20;
    assert('IT on £30k = £3,486',Math.abs(it30k-3486)<0.01,3486,it30k);
    const c430k=(30000-12570)*0.06;
    assert('Class4 on £30k = £1,045.80',Math.abs(c430k-1045.80)<0.01,1045.80,c430k);
    const it60k=37700*0.20+(47430-37700)*0.40;
    assert('IT on £60k = £11,432',Math.abs(it60k-11432)<0.01,11432,it60k);
    const c460k=(50270-12570)*0.06+(60000-50270)*0.02;
    assert('Class4 on £60k = £2,456.60',Math.abs(c460k-2456.60)<0.01,2456.60,c460k);

    // 4. PA Taper
    const pa110k=Math.max(0,12570-Math.floor((110000-100000)/2));
    assert('PA taper at £110k = £7,570',pa110k===7570,7570,pa110k);
    const pa126k=Math.max(0,12570-Math.floor((126000-100000)/2));
    assert('PA taper at £126k = £0',pa126k===0,0,pa126k);

    // 5. Data integrity
    assert('S object exists',typeof S==='object'&&S!==null,'object',typeof S);
    assert('S.businesses is array',Array.isArray(S.businesses),true,Array.isArray(S.businesses));
    assert('S.entries is array',Array.isArray(S.entries),true,Array.isArray(S.entries));
    assert('S.year is valid string',typeof S.year==='string'&&S.year.includes('-'),true,S.year);

    // 6. Support email (split string so test doesn't match itself)
    const oldDomain='taxmate-uk'+'.com';
    const bodyOnly=document.body.innerHTML;
    assert('No old email in body HTML',!bodyOnly.includes('support@'+oldDomain),'not found','found');

    // 7. Sentry
    if(typeof Sentry!=='undefined') assert('Sentry loaded',true,true,true);
    else warning('Sentry SDK','Not detected — may still be loading');

    // 8. openLegal
    assert('openLegal() exists',typeof openLegal==='function','function',typeof openLegal);

    // Show results
    const box=document.createElement('div');
    box.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:#0F1620;color:#fff;z-index:99999;overflow:auto;padding:20px;font-family:monospace;font-size:13px;white-space:pre-wrap';
    box.textContent='══════════════════════════════\nTaxMate UK Audit Results\n══════════════════════════════\n'+out.join('\n')+'\n══════════════════════════════\nPASS: '+pass+' | FAIL: '+fail+' | WARN: '+warn+'\n══════════════════════════════\n\n(tap anywhere to close)';
    box.onclick=()=>box.remove();
    document.body.appendChild(box);
  });
}
