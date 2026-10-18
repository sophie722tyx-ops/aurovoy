import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import worker from './worker/index.mjs';

test('built assets contain no HTML that could bypass publication or administration',()=>{
 const files=fs.readdirSync('dist/client',{recursive:true}).filter(f=>fs.statSync(path.join('dist/client',f)).isFile());
 assert(!files.some(f=>f.endsWith('.html')));assert(files.length<20000);
 assert(files.every(f=>fs.statSync(path.join('dist/client',f)).size<=25*1024*1024));
 assert(fs.existsSync('dist/client/assets/global-pt.mp4'));
});

test('sitemap and public HTML use the deployment origin, with an optional canonical origin',async()=>{
 const DB={prepare(){return {bind(){return this;},async all(){return {results:[]};},async first(){return null;}};}};
 for(const configured of [undefined,'https://www.aurovoy.example']){
  const env={DB,PUBLIC_ORIGIN:configured};const expected=configured||'https://aurovoy.example';
  for(const p of ['/index.html','/en/about.html','/sitemap.xml','/robots.txt']){
   const r=await worker.fetch(new Request('https://aurovoy.example'+p),env);assert.equal(r.status,200);
   const text=await r.text();assert(!text.includes('chatgpt.site'));assert(!text.includes('aurovoy.invalid'));assert(text.includes(expected));
  }
  assert.equal(await(await worker.fetch(new Request('https://aurovoy.example/',{method:'HEAD'}),env)).text(),'');
 }
});

test('default entry opens English and explicit Chinese and French homepages remain usable',async()=>{
 const DB={prepare(){return {bind(){return this;},async all(){return {results:[]};},async first(){return null;}};}};
 for(const method of ['GET','HEAD']){
  const r=await worker.fetch(new Request('https://aurovoy.example/?utm_source=campaign',{method,headers:{'Accept-Language':'zh-CN'}}),{DB});
  assert.equal(r.status,302);assert.equal(r.headers.get('location'),'/en/?utm_source=campaign');assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(await r.text(),'');
 }
 for(const [p,lang,canonical] of [['/en/','en','/en/'],['/index.html','zh-CN','/index.html'],['/fr/','fr','/fr/']]){
  const r=await worker.fetch(new Request('https://aurovoy.example'+p),{DB});assert.equal(r.status,200);const h=await r.text();assert(h.includes('html lang="'+lang+'"'));assert(h.includes('rel="canonical" href="https://aurovoy.example'+canonical+'"'));assert(h.includes('hreflang="zh-CN" href="https://aurovoy.example/index.html"'));assert(h.includes('lang="zh" hreflang="zh"'));assert(h.includes('brand-creators'));assert(!h.includes('creator-home'));
 }
 const site=await(await worker.fetch(new Request('https://aurovoy.example/sitemap.xml'),{DB})).text();assert(site.includes('<loc>https://aurovoy.example/index.html</loc>'));assert(site.includes('<loc>https://aurovoy.example/en/</loc>'));
});
