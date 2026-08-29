'use strict';

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const sourceRoot=path.join(root,'assets','brand','source');
const derivedRoot=path.join(root,'assets','brand','derived');
const sources=Object.freeze({
  dark_brandlogo:{file:'dark_brandlogo.svg',sha256:'55A5431D3196F94B9F92C326F87A1798089910FBAFD44E06DDEB3DACF47217A1'},
  light_brandlogo:{file:'light_brandlogo.svg',sha256:'7B8E9469058A4CBFD345387B55A0282DBFF43426EEF8AB76766FE4608C2B113E'},
  dark_icon:{file:'dark_icon.svg',sha256:'12DB5CC1BCF8B1BB7AD1B10C52124246960A0FDCCA2D52A747FBC58533D088B8'},
  light_icon:{file:'light_icon.svg',sha256:'6CA5D181A5BB18C257642700C2AA2AEB5875A87B0D3BFD0A06A4E11E49905638'}
});
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const read=file=>fs.readFileSync(file);
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);};
const dataUrl=svg=>'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
function chromePath(){for(const candidate of [process.env.TAXMATE_CHROME_PATH,'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'])if(candidate&&fs.existsSync(candidate))return candidate;throw new Error('Installed Chrome is required for deterministic brand raster generation');}
function svgParts(svg){const open=(svg.match(/<svg\b[^>]*>/)||[])[0],paths=[...svg.matchAll(/<path\b[^>]*\/>/g)].map(match=>match[0]);if(!open||!paths.length)throw new Error('Unsupported Founder SVG structure');return{open,paths};}
function pathAttribute(pathSource,name){return(pathSource.match(new RegExp(`${name}="([^"]+)"`))||[])[1];}
function transparentLogos(source){
  const light=svgParts(source.light_brandlogo),dark=svgParts(source.dark_brandlogo);
  if(light.paths.length!==3||pathAttribute(light.paths[0],'fill')!=='#ffbe0a'||pathAttribute(light.paths[1],'fill')!=='#0b121a'||pathAttribute(light.paths[2],'fill')!=='#fcfcfc')throw new Error('Light Brand Logo layers drifted');
  if(dark.paths.length!==3||pathAttribute(dark.paths[0],'fill')!=='#0b121a'||pathAttribute(dark.paths[1],'fill')!=='#ffbd04'||pathAttribute(dark.paths[2],'fill')!=='#fcfcfc')throw new Error('Dark Brand Logo layers drifted');
  const backgroundAndFace=pathAttribute(dark.paths[0],'d').split(/(?=M )/).filter(Boolean),faceIndexes=[10,11,13];
  if(backgroundAndFace.length!==14)throw new Error('Dark Brand Logo background/face path structure drifted');
  const facePath=`<path d="${faceIndexes.map(index=>backgroundAndFace[index]).join(' ')}" stroke="none" fill="#0b121a" fill-rule="evenodd"/>`;
  return{
    light:`${light.open}\n${light.paths[0]}\n${light.paths[1]}\n</svg>\n`,
    dark:`${dark.open}\n${dark.paths[1]}\n${dark.paths[2]}\n${facePath}\n</svg>\n`,
    darkFaceSubpaths:faceIndexes
  };
}
async function raster(page,svg,width,height,output,background='transparent'){
  await page.setViewportSize({width,height});
  await page.setContent(`<style>html,body{margin:0;width:${width}px;height:${height}px;background:transparent;overflow:hidden}img{display:block;width:${width}px;height:${height}px;background:${background}}</style><img id="asset" alt="" src="${dataUrl(svg)}">`);
  await page.locator('#asset').screenshot({path:output,omitBackground:true,animations:'disabled'});
  const png=read(output);if(png.toString('ascii',1,4)!=='PNG'||png.readUInt32BE(16)!==width||png.readUInt32BE(20)!==height)throw new Error(`Raster dimension mismatch: ${output}`);return png;
}
async function compareComposite(page,original,transparent,width,height,background,backgroundRgb){
  return page.evaluate(async input=>{const load=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;}),[originalImage,transparentImage]=await Promise.all([load(input.original),load(input.transparent)]),canvasA=document.createElement('canvas'),canvasB=document.createElement('canvas');canvasA.width=canvasB.width=input.width;canvasA.height=canvasB.height=input.height;const a=canvasA.getContext('2d',{willReadFrequently:true}),b=canvasB.getContext('2d',{willReadFrequently:true});a.drawImage(originalImage,0,0,input.width,input.height);b.fillStyle=input.background;b.fillRect(0,0,input.width,input.height);b.drawImage(transparentImage,0,0,input.width,input.height);const aa=a.getImageData(0,0,input.width,input.height).data,bb=b.getImageData(0,0,input.width,input.height).data,totalPixels=input.width*input.height;let mismatchPixels=0,maxChannelDelta=0,totalChannelDelta=0,foregroundMaskMismatch=0,originalForegroundPixels=0,compositeForegroundPixels=0;for(let index=0;index<aa.length;index+=4){let mismatch=false;for(let channel=0;channel<4;channel++){const delta=Math.abs(aa[index+channel]-bb[index+channel]);totalChannelDelta+=delta;if(delta){mismatch=true;maxChannelDelta=Math.max(maxChannelDelta,delta);}}if(mismatch)mismatchPixels++;const originalDistance=Math.max(...input.backgroundRgb.map((value,channel)=>Math.abs(aa[index+channel]-value))),compositeDistance=Math.max(...input.backgroundRgb.map((value,channel)=>Math.abs(bb[index+channel]-value))),originalForeground=originalDistance>24,compositeForeground=compositeDistance>24;if(originalForeground)originalForegroundPixels++;if(compositeForeground)compositeForegroundPixels++;if(originalForeground!==compositeForeground)foregroundMaskMismatch++;}const foregroundMaskMismatchRatio=foregroundMaskMismatch/totalPixels,meanChannelDelta=totalChannelDelta/(totalPixels*4),status=foregroundMaskMismatchRatio<=0.005&&meanChannelDelta<=1?'PASS':'FAIL';return{width:input.width,height:input.height,background:input.background,comparisonTolerance:{foregroundMaskMismatchRatio:0.005,meanChannelDelta:1},exactMismatchPixels:mismatchPixels,exactMismatchRatio:mismatchPixels/totalPixels,maxChannelDelta,meanChannelDelta,originalForegroundPixels,compositeForegroundPixels,foregroundMaskMismatch,foregroundMaskMismatchRatio,status};},{original:dataUrl(original),transparent:dataUrl(transparent),width,height,background,backgroundRgb});
}
async function scanRaster(page,file,background){
  return page.evaluate(async input=>{const image=await new Promise((resolve,reject)=>{const value=new Image();value.onload=()=>resolve(value);value.onerror=reject;value.src=input.src;}),canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);const data=context.getImageData(0,0,canvas.width,canvas.height).data,bg=input.background,bounds={left:canvas.width,top:canvas.height,right:-1,bottom:-1};let transparentPixels=0,opaquePixels=0,foregroundPixels=0;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const index=(y*canvas.width+x)*4,alpha=data[index+3];if(alpha===0)transparentPixels++;if(alpha===255)opaquePixels++;const delta=Math.max(Math.abs(data[index]-bg[0]),Math.abs(data[index+1]-bg[1]),Math.abs(data[index+2]-bg[2]));if(alpha>0&&delta>12){foregroundPixels++;bounds.left=Math.min(bounds.left,x);bounds.top=Math.min(bounds.top,y);bounds.right=Math.max(bounds.right,x);bounds.bottom=Math.max(bounds.bottom,y);}}return{width:canvas.width,height:canvas.height,transparentPixels,opaquePixels,foregroundPixels,foregroundBounds:bounds,foregroundBoundsRatio:{left:bounds.left/canvas.width,top:bounds.top/canvas.height,right:(bounds.right+1)/canvas.width,bottom:(bounds.bottom+1)/canvas.height}};},{src:'data:image/png;base64,'+read(file).toString('base64'),background});
}
function ico(images){
  const header=Buffer.alloc(6+images.length*16);header.writeUInt16LE(0,0);header.writeUInt16LE(1,2);header.writeUInt16LE(images.length,4);let offset=header.length;images.forEach((item,index)=>{const entry=6+index*16;header[entry]=item.size===256?0:item.size;header[entry+1]=item.size===256?0:item.size;header[entry+2]=0;header[entry+3]=0;header.writeUInt16LE(1,entry+4);header.writeUInt16LE(32,entry+6);header.writeUInt32LE(item.png.length,entry+8);header.writeUInt32LE(offset,entry+12);offset+=item.png.length;});return Buffer.concat([header,...images.map(item=>item.png)]);
}
function socialSvg(lightIcon,lightLogo){return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#f5f7f9"/>
<rect x="56" y="80" width="340" height="470" rx="44" fill="#ffffff" stroke="#e4e9ee" stroke-width="2"/>
<image x="96" y="145" width="260" height="260" preserveAspectRatio="xMidYMid meet" href="${dataUrl(lightIcon)}"/>
<image x="438" y="126" width="690" height="220" preserveAspectRatio="xMidYMid meet" href="${dataUrl(lightLogo)}"/>
<text x="454" y="390" fill="#16202b" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700">Simple bookkeeping and tax planning</text>
<text x="454" y="442" fill="#4f5c69" font-family="Arial, Helvetica, sans-serif" font-size="28">for UK sole traders and self-employed people.</text>
<text x="454" y="493" fill="#067a4b" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">Record income and expenses. See your estimated tax.</text>
</svg>\n`;}
async function main(){
  const source={};for(const [key,identity] of Object.entries(sources)){const file=path.join(sourceRoot,identity.file),buffer=read(file),actual=sha256(buffer);if(actual!==identity.sha256)throw new Error(`${identity.file} SHA-256 drift: ${actual}`);source[key]=buffer.toString('utf8');}
  fs.rmSync(derivedRoot,{recursive:true,force:true});fs.mkdirSync(derivedRoot,{recursive:true});
  const logos=transparentLogos(source),files={
    'taxmate-brand-logo-light.svg':logos.light,
    'taxmate-brand-logo-dark.svg':logos.dark,
    'taxmate-icon-light.svg':source.light_icon,
    'taxmate-icon-dark.svg':source.dark_icon
  };for(const [name,value] of Object.entries(files))write(path.join(derivedRoot,name),value);
  const browser=await chromium.launch({headless:true,executablePath:chromePath()});
  try{
    const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
    const comparisons={
      light:await compareComposite(page,source.light_brandlogo,logos.light,1024,316,'#fcfcfc',[252,252,252]),
      dark:await compareComposite(page,source.dark_brandlogo,logos.dark,1024,334,'#0b121a',[11,18,26])
    };if(comparisons.light.status!=='PASS'||comparisons.dark.status!=='PASS')throw new Error(`Transparent Brand Logo pixel comparison failed: ${JSON.stringify(comparisons)}`);
    const iconOutputs=[[16,'favicon-16x16.png'],[32,'favicon-32x32.png'],[48,'favicon-48x48.png'],[180,'apple-touch-icon.png'],[192,'icon-192.png'],[512,'icon-512.png'],[512,'icon-512-maskable.png']],pngs={};
    for(const [size,name] of iconOutputs)pngs[name]=await raster(page,source.light_icon,size,size,path.join(root,name),'#fdfdfd');
    write(path.join(root,'favicon.ico'),ico([16,32,48].map(size=>({size,png:pngs[`favicon-${size}x${size}.png`]}))));
    const social=socialSvg(source.light_icon,logos.light);write(path.join(derivedRoot,'taxmate-share-20260829.svg'),social);await raster(page,social,1200,630,path.join(root,'taxmate-share-20260829.png'),'#f5f7f9');
    const maskable=await scanRaster(page,path.join(root,'icon-512-maskable.png'),[253,253,253]);
    if(maskable.transparentPixels!==0||maskable.foregroundBoundsRatio.left<0.18||maskable.foregroundBoundsRatio.top<0.18||maskable.foregroundBoundsRatio.right>0.82||maskable.foregroundBoundsRatio.bottom>0.82)throw new Error(`Maskable safe-zone validation failed: ${JSON.stringify(maskable)}`);
    const derivedNames=[...Object.keys(files),'taxmate-share-20260829.svg','favicon-16x16.png','favicon-32x32.png','favicon-48x48.png','favicon.ico','apple-touch-icon.png','icon-192.png','icon-512.png','icon-512-maskable.png','taxmate-share-20260829.png'],derived={};
    for(const name of derivedNames){const file=name.endsWith('.svg')?path.join(derivedRoot,name):path.join(root,name),buffer=read(file);derived[name]={bytes:buffer.length,sha256:sha256(buffer),...(buffer.toString('ascii',1,4)==='PNG'?{width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)}:{})};}
    const manifest={status:'PASS',generator:'scripts/generate-brand-assets.js',source:Object.fromEntries(Object.entries(sources).map(([key,value])=>[value.file,{bytes:read(path.join(sourceRoot,value.file)).length,sha256:value.sha256}])),transparentLogoComparison:comparisons,darkFaceSubpaths:logos.darkFaceSubpaths,maskableValidation:maskable,derived};
    write(path.join(derivedRoot,'BRAND_ASSET_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
    process.stdout.write(`BRAND_ASSET_GENERATION_PASS derived=${derivedNames.length} lightMaskMismatch=${comparisons.light.foregroundMaskMismatch} darkMaskMismatch=${comparisons.dark.foregroundMaskMismatch}\n`);
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
