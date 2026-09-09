import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const {publicKey,privateKey}=await generateKeyPair('RS256');
const jwk={...await exportJWK(publicKey),kid:'runtime-test',alg:'RS256',use:'sig'};
const issuer='https://aurovoy-runtime-test.cloudflareaccess.com';
const token=await new SignJWT({email:'owner@example.test',type:'app'}).setProtectedHeader({alg:'RS256',kid:'runtime-test'}).setIssuer(issuer).setAudience('runtime-test').setSubject('owner').setIssuedAt().setExpirationTime('1h').sign(privateKey);
const mf=new Miniflare({telemetry:{enabled:false},cf:false,workers:[{config:{
 name:'aurovoy-runtime-test',type:'worker',compatibilityDate:'2026-09-09',compatibilityFlags:['nodejs_compat'],
 manifest:{mainModule:'index.mjs',modules:{'index.mjs':{type:'esm',contents:fs.readFileSync('.wrangler/portable/index.mjs','utf8')}}},
 env:{DB:{type:'d1',name:'runtime-test'},FILES:{type:'r2',name:'runtime-files'},ASSETS:{type:'assets'},ADMIN_EMAIL:{type:'text',value:'owner@example.test'},ACCESS_TEAM_DOMAIN:{type:'text',value:'aurovoy-runtime-test.cloudflareaccess.com'},ACCESS_AUD:{type:'text',value:'runtime-test'}},
 assets:{directory:'dist/client',hasUserWorker:true,htmlHandling:'none',notFoundHandling:'none',runWorkerFirst:false},
 },dev:{outboundService:{type:'fetcher',handler:async r=>r.url===issuer+'/cdn-cgi/access/certs'?Response.json({keys:[jwk]}):new Response('Denied',{status:403})}}}]});
try{
 await mf.ready;
 const db=await mf.getD1Database('DB');
 for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))for(const statement of fs.readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
 const call=(p,method='GET',body,admin=false,extra={})=>mf.dispatchFetch('https://aurovoy.example'+p,{method,headers:{...(admin?{'cf-access-jwt-assertion':token}:{}),...(body?{origin:'https://aurovoy.example','X-Aurovoy-Admin':'1','Content-Type':body instanceof Uint8Array?'application/octet-stream':'application/json'}:{}),...extra},body:body?(body instanceof Uint8Array?body:JSON.stringify(body)):undefined});
 const pages=Object.keys(JSON.parse(fs.readFileSync('worker/pages.generated.json','utf8')));
 for(const p of pages){const r=await call('/'+p);assert.equal(r.status,200,p);await r.arrayBuffer();}
 assert.equal((await call('/api/admin/works')).status,401);
 assert.equal((await call('/admin','GET',null,true)).status,200);
 let r=await call('/api/admin/works','POST',{},true);assert.equal(r.status,201);let work=await r.json();
 const png=new Uint8Array(32);png.set([137,80,78,71,13,10,26,10]);
 let upload=await(await call('/api/admin/uploads','POST',{workId:work.id,kind:'poster',size:png.length,type:'image/png'},true)).json();
 assert.equal((await call(`/api/admin/uploads/${upload.id}/1`,'PUT',png,true,{'Content-Length':String(png.length)})).status,200);
 work=await(await call(`/api/admin/uploads/${upload.id}/complete`,'POST',{},true)).json();assert(work.poster.startsWith('/media/'));
 assert.equal((await call(work.poster)).status,404);assert.equal((await call(work.poster,'GET',null,true)).status,200);
 assert.equal((await call('/assets/mark.png')).status,200);
 console.log(`Cloudflare runtime passed: ${pages.length} public pages, real JWT verification, D1 create, R2 upload and private preview.`);
}finally{await mf.dispose();}
