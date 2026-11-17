import {tokens,accessEnv} from './test/access-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {authenticate} from './worker/auth.mjs';
import {playback} from './worker/playback.mjs';
import quality from './video-quality.json' with {type:'json'};

function setup(t,{id='test-video',workId='test-work',baseline=false}={}){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 sql.exec('CREATE TABLE works(id TEXT PRIMARY KEY,data TEXT,status TEXT,updated_at TEXT); CREATE TABLE admin_members(email TEXT PRIMARY KEY);');
 const bytes=Uint8Array.from({length:64},(_,i)=>i),manifest=new TextEncoder().encode('#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:4.0,\n480p/seg00000.ts\n#EXT-X-ENDLIST\n');
 const entry={workId,source:'/media/'+id,sourceObjectKey:'works/'+workId+'/'+id,sourceSize:512,duration:4,prefix:'playback/v1/'+id+'/version1',files:{'master.m3u8':{size:manifest.length,type:'application/vnd.apple.mpegurl'},'480p/seg00000.ts':{size:bytes.length,type:'video/mp2t'}}};
 const catalog={[id]:entry},blobs=new Map([[entry.prefix+'/master.m3u8',manifest],[entry.prefix+'/480p/seg00000.ts',bytes]]),calls={queries:0,heads:0,gets:0},pending=[];
 const env={...accessEnv,DB:{prepare(query){calls.queries++;const statement=sql.prepare(query);let args=[];return {bind(...values){args=values;return this;},async first(){return statement.get(...args)??null;}};}},FILES:{async head(){calls.heads++;throw Error('Unexpected metadata read');},async get(key,{range}={}){calls.gets++;const data=blobs.get(key);return data?{body:range?data.slice(range.offset,range.offset+range.length):data}:null;}}};
 function setWork(status='published',video=entry.source){sql.prepare('INSERT INTO works(id,data,status,updated_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status,updated_at=excluded.updated_at').run(workId,JSON.stringify({id:workId,video}),status,new Date().toISOString());}
 if(!baseline)setWork();
 async function call(file='master.m3u8',{method='GET',headers={},auth,path}={}){
  const request=new Request('https://site.test'+(path??'/playback/'+id+'/'+file),{method,headers:{...headers,...(auth?{'cf-access-jwt-assertion':tokens[auth]??auth}:{})}});
  return playback(request,await authenticate(request,env),{waitUntil:p=>pending.push(p)},catalog);
 }
 return {sql,env,entry,catalog,bytes,manifest,blobs,calls,pending,setWork,call};
}

test('HLS manifests and segments retain byte ranges, validators and audited lengths',async t=>{
 const f=setup(t);let r=await f.call();assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/vnd.apple.mpegurl');assert.deepEqual(new Uint8Array(await r.arrayBuffer()),f.manifest);
 r=await f.call('480p/seg00000.ts',{headers:{Range:'bytes=8-23'}});assert.equal(r.status,206);assert.equal(r.headers.get('content-type'),'video/mp2t');assert.equal(r.headers.get('content-range'),'bytes 8-23/64');assert.deepEqual(new Uint8Array(await r.arrayBuffer()),f.bytes.slice(8,24));const etag=r.headers.get('etag');
 r=await f.call('480p/seg00000.ts',{method:'HEAD'});assert.equal(r.status,200);assert.equal(r.headers.get('content-length'),'64');assert.equal(await r.text(),'');
 r=await f.call('480p/seg00000.ts',{headers:{'If-None-Match':etag}});assert.equal(r.status,304);assert.equal(await r.text(),'');
 r=await f.call('480p/seg00000.ts',{headers:{Range:'bytes=64-'}});assert.equal(r.status,416);assert.equal(r.headers.get('cache-control'),'no-store');
 assert.equal(f.calls.heads,0);assert.equal(f.calls.gets,2);assert.equal(f.calls.queries,5);
});

test('cached HLS bytes and 304 responses cannot bypass unpublish, replacement, deletion or site pause',async t=>{
 const f=setup(t),old=Object.getOwnPropertyDescriptor(globalThis,'caches'),cache=new Map();let reads=0;
 Object.defineProperty(globalThis,'caches',{configurable:true,value:{default:{async match(request){reads++;return cache.get(request.url)?.clone();},async put(request,response){const bytes=await response.arrayBuffer();cache.set(request.url,new Response(bytes,response));}}}});
 t.after(()=>{if(old)Object.defineProperty(globalThis,'caches',old);else delete globalThis.caches;});
 const files=['master.m3u8','480p/seg00000.ts'],etags=new Map();
 for(const file of files){let r=await f.call(file);etags.set(file,r.headers.get('etag'));await r.arrayBuffer();await Promise.all(f.pending.splice(0));r=await f.call(file);assert.match(r.headers.get('server-timing'),/edge-hit/);await r.arrayBuffer();}
 assert.equal(f.calls.gets,2);assert.equal(cache.size,2);
 for(const state of ['draft','replaced','deleted','paused']){
  f.env.PUBLIC_SITE_PAUSED=state==='paused'?'true':'false';f.setWork(['draft','deleted'].includes(state)?state:'published',state==='replaced'?'/media/new-video':f.entry.source);
  const beforeGets=f.calls.gets,beforeReads=reads;
  for(const file of files)for(const headers of [{},{Range:'bytes=0-7'},{'If-None-Match':etags.get(file)}]){
   const r=await f.call(file,{headers});assert.equal(r.status,state==='paused'?503:404,state);assert.equal(r.headers.get('cache-control'),'no-store');
  }
  assert.equal(f.calls.gets,beforeGets);assert.equal(reads,beforeReads);
 }
});

test('draft HLS previews require verified membership and do not use public caches or 304',async t=>{
 const f=setup(t);f.setWork('draft');
 for(const options of [{},{auth:'outsider'},{auth:'invalid-jwt'},{headers:{'Cf-Access-Authenticated-User-Email':accessEnv.ADMIN_EMAIL}}])assert.equal((await f.call('master.m3u8',options)).status,404);
 const old=Object.getOwnPropertyDescriptor(globalThis,'caches');Object.defineProperty(globalThis,'caches',{configurable:true,value:{default:{async match(){assert.fail('Draft preview read shared cache');},async put(){assert.fail('Draft preview populated shared cache');}}}});
 t.after(()=>{if(old)Object.defineProperty(globalThis,'caches',old);else delete globalThis.caches;});
 let r=await f.call('master.m3u8',{auth:'owner'});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');const etag=r.headers.get('etag');await r.arrayBuffer();
 r=await f.call('master.m3u8',{auth:'owner',headers:{'If-None-Match':etag}});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');await r.arrayBuffer();
 f.sql.prepare('INSERT INTO admin_members(email) VALUES(?)').run('outsider@example.test');r=await f.call('master.m3u8',{auth:'outsider'});assert.equal(r.status,200);await r.arrayBuffer();
 f.sql.prepare('DELETE FROM admin_members').run();assert.equal((await f.call('master.m3u8',{auth:'outsider'})).status,404);
 f.setWork('published');f.env.PUBLIC_SITE_PAUSED='true';r=await f.call('master.m3u8',{auth:'owner'});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');await r.arrayBuffer();
 f.setWork('deleted');assert.equal((await f.call('master.m3u8',{auth:'owner'})).status,404);
});

test('baseline quality media can use HLS but deletion never revives its bundled work',async t=>{
 const q=quality['legacy-12'],f=setup(t,{id:q.video.slice(7),workId:'legacy-12',baseline:true});
 let r=await f.call();assert.equal(r.status,200);const etag=r.headers.get('etag');await r.arrayBuffer();
 f.setWork('deleted');for(const auth of [undefined,'owner']){r=await f.call('master.m3u8',{auth,headers:{'If-None-Match':etag}});assert.equal(r.status,404);}
});

test('only complete catalog files with safe paths are served, without revealing storage locations',async t=>{
 const f=setup(t);
 for(const path of ['/playback/missing/master.m3u8','/playback/test-video/missing.ts','/playback/test-video/480p/../private.ts','/playback/test-video/480p/%2e%2e/private.ts','/playback/test-video/480p%2fseg00000.ts','/playback/test-video/%2e%2e%2fmaster.m3u8','/playback/test-video/480p/seg00000.ts/extra','/playback/test-video/index.json','/playback/test-video/constructor','/playback/test-video/../../works/private','/playback/test-video/480p%5cseg00000.ts']){
  const r=await f.call(undefined,{path});assert.equal(r.status,404,path);assert.equal(r.headers.get('cache-control'),'no-store');
 }
 assert.equal(f.calls.gets,0);assert.equal(f.calls.queries,0);
 let r=await f.call('master.m3u8',{method:'POST'});assert.equal(r.status,405);assert.equal(r.headers.get('allow'),'GET, HEAD');assert.equal(r.headers.get('cache-control'),'no-store');
 f.entry.files['master.m3u8'].size=0;r=await f.call();assert.equal(r.status,404);assert.equal(f.calls.gets,0);
 f.entry.files['master.m3u8'].size=f.manifest.length;f.entry.prefix='playback/v1/another-video/version1';assert.equal((await f.call()).status,404);f.entry.prefix='playback/v1/test-video/version1';
 f.blobs.delete(f.entry.prefix+'/master.m3u8');r=await f.call();assert.equal(r.status,404);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(await r.text(),'Not found');
});

test('only the two audited editorial showcase sources bypass work rows and site pause still revokes them',async t=>{
 for(const name of ['global-en','global-pt']){
  const q=quality[name],id='showcase-'+name,f=setup(t,{id,workId:id,baseline:true});
  Object.assign(f.entry,{source:q.video,sourceObjectKey:q.objectKey,sourceSize:q.size});
  let r=await f.call();assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/vnd.apple.mpegurl');const etag=r.headers.get('etag');await r.arrayBuffer();
  r=await f.call('480p/seg00000.ts',{headers:{Range:'bytes=0-7'}});assert.equal(r.status,206);assert.deepEqual(new Uint8Array(await r.arrayBuffer()),f.bytes.slice(0,8));assert.equal(f.calls.queries,0);
  const gets=f.calls.gets;
  for(const [field,value]of [['source','/showcase-video/private.mp4'],['source','/media/'+id],['sourceObjectKey','works/private/secret'],['sourceSize',q.size+1],['workId','legacy-12']]){
   const original=f.entry[field];f.entry[field]=value;r=await f.call('master.m3u8',{headers:{'If-None-Match':etag},auth:'owner'});assert.equal(r.status,404,field);assert.equal(r.headers.get('cache-control'),'no-store');f.entry[field]=original;
  }
  assert.equal(f.calls.gets,gets);assert.equal(f.calls.queries,0);
  f.env.PUBLIC_SITE_PAUSED='true';
  for(const headers of [{},{'If-None-Match':etag}])for(const auth of [undefined,'outsider','invalid-jwt']){r=await f.call('master.m3u8',{headers,auth});assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');}
  assert.equal(f.calls.gets,gets);
  r=await f.call('master.m3u8',{auth:'owner',headers:{'If-None-Match':etag}});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');await r.arrayBuffer();
 }
 const f=setup(t,{id:'showcase-legacy-12',workId:'showcase-legacy-12'});assert.equal((await f.call()).status,404);assert.equal(f.calls.gets,0);
});
