# Founder Preview Gate

Branch: `codex/taxmate-modernisation-20260817`.

Run from the repository root:

```powershell
node -e "const http=require('http'),fs=require('fs'),path=require('path');const t={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.xml':'application/xml','.txt':'text/plain'};http.createServer((q,s)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';fs.readFile(path.join(process.cwd(),p),(e,d)=>{if(e){s.writeHead(404);return s.end('Not found')}s.writeHead(200,{'Content-Type':t[path.extname(p)]||'application/octet-stream'});s.end(d)})}).listen(5002,'127.0.0.1')"
```

Open http://127.0.0.1:5002/ . Local preview intentionally disables production Firebase unless `?firebase=1` is added; do not add that switch for Founder UI review.

Review focus: TaxMate still looks and feels like the approved product; main local flows remain simple; the required MTD/property/billing/deletion copy is sensible; optional polish choices are only those listed in `UI_POLISH_CANDIDATES.md`.

STOP at this gate. Do not merge, push, deploy, configure Stripe, deploy Firebase rules, or run a production migration.
