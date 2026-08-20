'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8'));
const headers=Object.fromEntries(config.hosting.headers[0].headers.map(x=>[x.key,x.value]));
if(process.env.TAXMATE_CSP_MODE==='report-only'){headers['Content-Security-Policy-Report-Only']=headers['Content-Security-Policy'];delete headers['Content-Security-Policy'];}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.css':'text/css; charset=utf-8','.md':'text/markdown; charset=utf-8'};
const server=http.createServer((req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch(_){res.writeHead(400).end();return;}const requested=pathname==='/'?'index.html':pathname.replace(/^\/+/,''),file=path.resolve(root,requested);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404,headers).end('Not found');return;}res.writeHead(200,{...headers,'Content-Type':mime[path.extname(file)]||'application/octet-stream',...(requested==='sw.js'?{'Cache-Control':'no-cache'}:{})});fs.createReadStream(file).pipe(res);});});
server.listen(Number(process.env.TAXMATE_PREVIEW_PORT)||4173,'127.0.0.1',()=>console.log('TaxMate preview http://127.0.0.1:'+(Number(process.env.TAXMATE_PREVIEW_PORT)||4173)));
