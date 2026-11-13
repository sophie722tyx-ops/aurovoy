import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {baseline} from './worker/repository.mjs';
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const paused=process.argv.includes('--paused');
const {publicKey,privateKey}=await generateKeyPair('RS256');
const jwk={...await exportJWK(publicKey),kid:'runtime-test',alg:'RS256',use:'sig'};
const issuer='https://aurovoy-runtime-test.cloudflareaccess.com';
const token=await new SignJWT({email:'owner@example.test',type:'app'}).setProtectedHeader({alg:'RS256',kid:'runtime-test'}).setIssuer(issuer).setAudience('runtime-test').setSubject('owner').setIssuedAt().setExpirationTime('1h').sign(privateKey);
const mf=new Miniflare({telemetry:{enabled:false},cf:false,workers:[{config:{
 name:'aurovoy-runtime-test',type:'worker',compatibilityDate:'2026-09-09',compatibilityFlags:['nodejs_compat'],
 manifest:{mainModule:'index.mjs',modules:{'index.mjs':{type:'esm',contents:fs.readFileSync('.wrangler/portable/index.mjs','utf8')}}},
 env:{DB:{type:'d1',name:'runtime-test'},FILES:{type:'r2',name:'runtime-files'},ASSETS:{type:'assets'},PUBLIC_SITE_PAUSED:{type:'text',value:String(paused)},ADMIN_EMAIL:{type:'text',value:'owner@example.test'},ACCESS_TEAM_DOMAIN:{type:'text',value:'aurovoy-runtime-test.cloudflareaccess.com'},ACCESS_AUD:{type:'text',value:'runtime-test'}},
 assets:{directory:'dist/client',hasUserWorker:true,htmlHandling:'none',notFoundHandling:'none',runWorkerFirst:true},
 },dev:{outboundService:{type:'fetcher',handler:async r=>r.url===issuer+'/cdn-cgi/access/certs'?Response.json({keys:[jwk]}):new Response('Denied',{status:403})}}}]});
try{
 await mf.ready;
 const db=await mf.getD1Database('DB');
 for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))for(const statement of fs.readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
 const call=(p,method='GET',body,admin=false,extra={})=>mf.dispatchFetch('https://aurovoy.example'+p,{method,headers:{...(admin?{'cf-access-jwt-assertion':token}:{}),...(body?{origin:'https://aurovoy.example','X-Aurovoy-Admin':'1','Content-Type':body instanceof Uint8Array?'application/octet-stream':'application/json'}:{}),...extra},body:body?(body instanceof Uint8Array?body:JSON.stringify(body)):undefined});
 const pages=Object.keys(JSON.parse(fs.readFileSync('worker/pages.generated.json','utf8')));
 if(paused){
  for(const p of ['/','/en/','/fr/works.html','/creator/aurovoy-team','/sitemap.xml','/assets/cover-3.webp','/assets/film-3.mp4','/app.js','/media/old-video','/content-media/old-photo'])for(const method of ['GET','HEAD']){const r=await call(p,method);assert.equal(r.status,503,p);assert.match(r.headers.get('cache-control'),/no-store/);if(method==='HEAD')assert.equal(await r.text(),'');else assert((await r.text()).includes('官网暂未开放'));}
  assert.equal((await call('/world/')).status,410);assert.equal((await call('/world/assets/scene.glb')).status,410);
  const login=await mf.dispatchFetch('https://aurovoy.example/admin',{redirect:'manual'});assert.equal(login.status,302);
  assert.equal((await call('/api/admin/works')).status,401);
  for(const p of ['/admin','/admin/creators','/admin/training','/admin/members','/assets/cover-3.webp']){const r=await call(p,'GET',null,true);assert.equal(r.status,200,p);assert.match(r.headers.get('cache-control'),/private, no-store/);}
  for(const p of ['/admin.css','/content-admin.css','/admin.js','/content-admin.js','/creator-works.js','/media-frame.js'])assert.equal((await call(p)).status,200,p);
  const work=await(await call('/api/admin/works','POST',{},true)).json();assert(work.id);
  const bytes=new Uint8Array(32);bytes.set([0,0,0,24,102,116,121,112]);
  const upload=await(await call('/api/admin/uploads','POST',{workId:work.id,kind:'video',type:'video/mp4',size:32},true)).json();
  assert.equal((await call('/api/admin/uploads/'+upload.id+'/1','PUT',bytes,true,{'Content-Length':'32'})).status,200);
  const saved=await(await call('/api/admin/uploads/'+upload.id+'/complete','POST',{},true)).json();
  assert.equal((await call(saved.video)).status,503);
  const playback=await call(saved.video,'GET',null,true,{Range:'bytes=0-7'});assert.equal(playback.status,206);assert.equal((await playback.arrayBuffer()).byteLength,8);assert.match(playback.headers.get('cache-control'),/private, no-store/);
  const cookiePlayback=await call(saved.video,'GET',null,false,{Cookie:'CF_Authorization='+token,Range:'bytes=8-15'});assert.equal(cookiePlayback.status,206);assert.equal((await cookiePlayback.arrayBuffer()).byteLength,8);
  assert.equal((await call('/assets/cover-3.webp','GET',null,false,{Cookie:'CF_Authorization='+token})).status,200);assert.equal((await call('/assets/cover-3.webp')).status,503);assert.equal((await call(saved.video)).status,503);
  console.log('Paused runtime passed: real static routing, private uploads, signed admin sessions, old links blocked and world removed.');
 }else{
 for(const p of pages){const r=await call('/'+p),legacy=p.match(/(?:^|\/)work-(\d+)\.html$/),hidden=legacy&&baseline.find(w=>w.id==='legacy-'+legacy[1])?.status!=='published';assert.equal(r.status,hidden?404:200,p);await r.arrayBuffer();}
 const entry=await mf.dispatchFetch('https://aurovoy.example/?utm_source=test',{redirect:'manual'});assert.equal(entry.status,200);assert((await entry.text()).includes('id="language-welcome"'));
 assert.equal((await call('/api/admin/works')).status,401);
 assert.equal((await call('/admin','GET',null,true)).status,200);
 assert.equal((await call('/admin/creators','GET',null,true)).status,200);
 assert.equal((await call('/admin/members','GET',null,true)).status,200);
 assert.equal((await call('/api/admin/members','POST',{email:'editor@example.test'},true)).status,200);
 assert.equal((await call('/api/admin/members','DELETE',{email:'editor@example.test'},true)).status,200);
 for(const p of ['/creators.html','/en/creators.html','/fr/creators.html'])assert.equal((await call(p)).status,200);
 assert.equal((await call('/creator/missing')).status,404);
 let r=await call('/api/admin/works','POST',{},true);assert.equal(r.status,201);let work=await r.json();
 const author=await(await call('/api/admin/content/creators','POST',{},true)).json();
 const batchRoute='/api/admin/content/creators/'+author.id+'/works';
 assert.equal((await call(batchRoute,'GET',null,true)).status,200);
 r=await call(batchRoute,'PUT',{creatorRevision:author.revision,replaceOthers:false,items:[{id:work.id,updatedAt:work.updatedAt,selected:true}]},true);assert.equal(r.status,200);assert.equal((await r.json()).updated,1);
 work=(await(await call('/api/admin/works','GET',null,true)).json()).works.find(w=>w.id===work.id);assert.deepEqual(work.creatorIds,[author.id]);
 const png=new Uint8Array(32);png.set([137,80,78,71,13,10,26,10]);
 let upload=await(await call('/api/admin/uploads','POST',{workId:work.id,kind:'poster',size:png.length,type:'image/png'},true)).json();
 assert.equal((await call(`/api/admin/uploads/${upload.id}/1`,'PUT',png,true,{'Content-Length':String(png.length)})).status,200);
 work=await(await call(`/api/admin/uploads/${upload.id}/complete`,'POST',{},true)).json();assert(work.poster.startsWith('/media/'));
 assert.equal((await call(work.poster)).status,404);assert.equal((await call(work.poster,'GET',null,true)).status,200);
 assert.equal((await call('/assets/mark.png')).status,200);
 console.log(`Cloudflare runtime passed: ${pages.length} public pages, real JWT verification, D1 create, R2 upload and private preview.`);
 }
}finally{await mf.dispose();}
