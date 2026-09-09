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
  for(const p of ['/','/en/about.html','/sitemap.xml','/robots.txt']){
   const r=await worker.fetch(new Request('https://aurovoy.example'+p),env);assert.equal(r.status,200);
   const text=await r.text();assert(!text.includes('chatgpt.site'));assert(!text.includes('aurovoy.invalid'));assert(text.includes(expected));
  }
  assert.equal(await(await worker.fetch(new Request('https://aurovoy.example/',{method:'HEAD'}),env)).text(),'');
 }
});
