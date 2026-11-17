import test from 'node:test';
import assert from 'node:assert/strict';
import {storedMedia,CACHEABLE_BYTES} from './worker/media-response.mjs';

function fixture(size=64){
 const bytes=Uint8Array.from({length:size},(_,i)=>i%251),calls={head:0,get:0},pending=[],cacheEntries=new Map();
 const env={FILES:{async head(){calls.head++;return {size};},async get(key,{range}={}){calls.get++;return {body:range?bytes.slice(range.offset,range.offset+range.length):bytes};}}};
 const cache={async match(key){return cacheEntries.get(key.url)?.clone();},async put(key,response){assert.equal(response.status,200);assert.equal(response.headers.get('content-range'),null);const body=await response.arrayBuffer();assert.equal(body.byteLength,Number(response.headers.get('content-length')));cacheEntries.set(key.url,new Response(body,response));}};
 const context={waitUntil(promise){pending.push(promise);}};
 return {env,bytes,calls,cache,cacheEntries,pending,context,call:(headers={},method='GET',extra={})=>storedMedia(new Request('https://site.test/media/test',{method,headers}),env,'works/test/immutable','video/mp4',{size,published:true,context,...extra})};
}
test('known immutable sizes avoid metadata reads and preserve all range forms',async()=>{
 const f=fixture();
 for(const [range,status,start,end]of [[null,200,0,64],['bytes=0-7',206,0,8],['bytes=8-',206,8,64],['bytes=-8',206,56,64],['bytes=60-999',206,60,64],['bytes=-999',206,0,64]]){
  const r=await f.call(range?{Range:range}:{});assert.equal(r.status,status);assert.equal(Number(r.headers.get('content-length')),end-start);assert.deepEqual(new Uint8Array(await r.arrayBuffer()),f.bytes.slice(start,end));
  if(range)assert.equal(r.headers.get('content-range'),`bytes ${start}-${end-1}/64`);
 }
 assert.equal(f.calls.head,0);assert.equal(f.calls.get,6);
 const head=await f.call({Range:'bytes=8-15'},'HEAD');assert.equal(head.status,206);assert.equal(await head.text(),'');assert.equal(f.calls.get,6);assert.equal(f.calls.head,0);
 await f.call({},'HEAD',{size:undefined});assert.equal(f.calls.head,1);
});
test('invalid and multipart ranges fail before reading a body',async()=>{
 const f=fixture();for(const Range of ['bytes=64-','bytes=9-2','bytes=-0','bytes=-','bytes=0-1,8-9','items=0-7','bytes=9007199254740993-']){const r=await f.call({Range});assert.equal(r.status,416);assert.equal(r.headers.get('content-range'),'bytes */64');}
 assert.equal(f.calls.get,0);assert.equal(f.calls.head,0);assert.equal((await f.call({},'POST')).status,405);
});
test('validators enable private revalidation and If-Range prevents combining different versions',async()=>{
 const f=fixture(),first=await f.call(),etag=first.headers.get('etag');await first.arrayBuffer();
 assert.match(first.headers.get('cache-control'),/private, no-cache, must-revalidate/);
 for(const value of [etag,'W/'+etag,'"old", W/'+etag,'*']){const r=await f.call({'If-None-Match':value});assert.equal(r.status,304);assert.equal(await r.text(),'');assert.equal(r.headers.get('etag'),etag);}
 assert.equal(f.calls.get,1);
 let r=await f.call({'If-Range':etag,Range:'bytes=2-7'});assert.equal(r.status,206);assert.equal((await r.arrayBuffer()).byteLength,6);
 for(const value of ['"other"','W/'+etag,'Wed, 01 Jan 2025 00:00:00 GMT']){r=await f.call({'If-Range':value,Range:'bytes=2-7'});assert.equal(r.status,200);assert.equal((await r.arrayBuffer()).byteLength,64);}
 r=await f.call({'If-None-Match':etag},'GET',{published:false});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');await r.arrayBuffer();
});
test('small public byte ranges use internal cache without making responses public',async()=>{
 const f=fixture(),old=globalThis.caches;globalThis.caches={default:f.cache};try{
  let r=await f.call({Range:'bytes=4-15'});assert.deepEqual(new Uint8Array(await r.arrayBuffer()),f.bytes.slice(4,16));await Promise.all(f.pending);assert.equal(f.cacheEntries.size,1);
  r=await f.call({Range:'bytes=4-15'});assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),'bytes 4-15/64');assert.match(r.headers.get('cache-control'),/^private,/);assert.match(r.headers.get('server-timing'),/edge-hit/);assert.deepEqual(new Uint8Array(await r.arrayBuffer()),f.bytes.slice(4,16));assert.equal(f.calls.get,1);
  r=await f.call({Range:'bytes=4-15'},'GET',{published:false});await r.arrayBuffer();assert.equal(f.calls.get,2);assert.equal(r.headers.get('cache-control'),'private, no-store');
  r=await f.call({Range:'bytes=16-31'});await r.arrayBuffer();await Promise.all(f.pending);assert.equal(f.calls.get,3);assert.equal(f.cacheEntries.size,2);
 }finally{globalThis.caches=old;}
});
test('large responses stay streamed and cache failures fall back to storage',async()=>{
 const f=fixture(CACHEABLE_BYTES+1),old=globalThis.caches;globalThis.caches={default:f.cache};try{
  let r=await f.call();assert.equal((await r.arrayBuffer()).byteLength,CACHEABLE_BYTES+1);assert.equal(f.pending.length,0);assert.equal(f.cacheEntries.size,0);
  globalThis.caches={default:{match:async()=>{throw Error('cache unavailable');},put:async()=>{throw Error('cache unavailable');}}};
  r=await f.call({Range:'bytes=0-7'});assert.equal(r.status,206);assert.equal((await r.arrayBuffer()).byteLength,8);await Promise.all(f.pending);
  f.env.FILES.get=async()=>null;r=await f.call({Range:'bytes=0-7'});assert.equal(r.status,404);assert.equal(r.headers.get('cache-control'),'no-store');
 }finally{globalThis.caches=old;}
});
