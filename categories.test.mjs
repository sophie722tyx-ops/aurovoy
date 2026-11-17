import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,origin} from './test/worker-fixture.mjs';
import {tokens,tokenFor} from './test/access-fixture.mjs';
import worker from './worker/index.mjs';
import {categories} from './content.mjs';

const png=()=>{const bytes=new Uint8Array(32);bytes.set([137,80,78,71,13,10,26,10]);return bytes;};
const payload=data=>({revision:data.revision,items:data.items.map(x=>({id:x.id,cover:x.customCover||''}))});
const read=async call=>{const r=await call('/api/admin/categories');assert.equal(r.status,200);return r.json();};
async function upload(call,id='brand'){const r=await call('/api/admin/categories/'+id+'/cover','POST',png(),'owner',{'Content-Type':'image/png'});assert.equal(r.status,201);return (await r.json()).cover;}

test('category management requires signed membership and same-origin writes',async t=>{
 const {call,env}=setup(t);
 assert.equal((await call('/api/admin/categories','GET',null,null)).status,401);
 assert.equal((await call('/api/admin/categories','GET',null,'outsider')).status,403);
 assert.equal((await call('/admin/categories','GET',null,null)).status,302);
 assert.equal((await call('/admin/categories','GET',null,'outsider')).status,403);
 const page=await call('/admin/categories');assert.equal(page.status,200);assert.match(await page.text(),/category-admin\.js/);
 const settings=await read(call),body=payload(settings);
 const cross=await worker.fetch(new Request(origin+'/api/admin/categories',{method:'PUT',headers:{'cf-access-jwt-assertion':tokens.owner,'X-Aurovoy-Admin':'1',Origin:'https://other.example','Content-Type':'application/json'},body:JSON.stringify(body)}),env);assert.equal(cross.status,403);
 await call('/api/admin/members','POST',{email:'category-editor@example.test'});tokens.categoryEditor=await tokenFor('category-editor@example.test');
 assert.equal((await call('/api/admin/categories','PUT',body,'categoryEditor')).status,200);
});

test('category order and cover save together across galleries, headers, filters and admin selectors',async t=>{
 const {call,sql}=setup(t);const initial=await read(call);assert.equal(initial.items.length,categories.length);assert(initial.items.every(x=>x.defaultCover.startsWith('/')&&!x.defaultCover.startsWith('//')));
 const cover=await upload(call);assert.equal((await call(cover,'GET',null,null)).status,404);assert.equal((await call(cover)).status,200);
 const body=payload(initial);body.items.reverse();body.items.find(x=>x.id==='brand').cover=cover;
 const r=await call('/api/admin/categories','PUT',body);assert.equal(r.status,200);const saved=await r.json();assert.notEqual(saved.revision,initial.revision);
 assert.deepEqual(saved.items.map(x=>x.id),body.items.map(x=>x.id));assert.equal(saved.items.find(x=>x.id==='brand').cover,cover);
 assert.equal((await call(cover,'GET',null,null)).status,200);assert.deepEqual(new Uint8Array(await(await call(cover,'GET',null,null)).arrayBuffer()),png());
 assert.equal((await call(cover,'HEAD',null,null)).status,200);assert.equal(await(await call(cover,'HEAD',null,null)).text(),'');
 assert.equal((await call(cover.replace('category-media','content-media'),'GET',null,null)).status,404);
 for(const prefix of ['/','/en/','/fr/']){
  const html=await(await call(prefix+'works.html','GET',null,null)).text();
  const cards=[...html.matchAll(/<a class="category-card[^>]+href="works-([a-z]+)\.html"/g)].map(x=>x[1]);assert.deepEqual(cards,body.items.map(x=>x.id));
  const card=html.match(/<a class="category-card[^>]+href="works-brand\.html"[\s\S]*?<\/a>/)?.[0];assert(card?.includes(cover));
  const options=html.match(/<select[^>]+data-work-category[^>]*>([\s\S]*?)<\/select>/)?.[1];assert(options);assert.deepEqual([...options.matchAll(/value="([a-z]+)"/g)].map(x=>x[1]),['all',...body.items.map(x=>x.id)]);
  const category=await(await call(prefix+'works-brand.html','GET',null,null)).text();assert.match(category,new RegExp('<figure class="chapter-visual[^]*?'+cover));
  const links=category.match(/<div class="category-switch">([\s\S]*?)<\/div>/)?.[1];assert.deepEqual([...links.matchAll(/href="works-([a-z]+)\.html"/g)].map(x=>x[1]),body.items.map(x=>x.id).filter(x=>x!=='brand'));
  const production=await(await call(prefix+'production.html','GET',null,null)).text(),capabilities=production.match(/<div class="capability-links">([\s\S]*?)<\/div>/)?.[1];assert.deepEqual([...capabilities.matchAll(/href="works-([a-z]+)\.html"/g)].map(x=>x[1]),body.items.map(x=>x.id));
 }
 assert.deepEqual((await(await call('/api/admin/works')).json()).categories.map(x=>x.id),body.items.map(x=>x.id));assert.equal(sql.prepare('SELECT COUNT(*) n FROM works').get().n,0);
});

test('invalid, incomplete, foreign-image and stale category saves preserve the whole previous configuration',async t=>{
 const {call}=setup(t),initial=await read(call),body=payload(initial),cover=await upload(call,'product');
 for(const items of [[],body.items.slice(1),[body.items[0],...body.items.slice(0,-1)],body.items.map((x,i)=>i?x:{...x,id:'unknown'}),body.items.map((x,i)=>i?x:{...x,cover:'https://external.example/image.png'}),body.items.map(x=>x.id==='brand'?{...x,cover}:x)]){
  assert.equal((await call('/api/admin/categories','PUT',{revision:initial.revision,items})).status,400);assert.deepEqual(await read(call),initial);
 }
 const changed=payload(initial);changed.items.reverse();const saved=await(await call('/api/admin/categories','PUT',changed)).json();
 assert.equal((await call('/api/admin/categories','PUT',body)).status,409);assert.deepEqual(await read(call),saved);
});

test('a concurrent first-save or later edit cannot overwrite category settings',async t=>{
 for(const seed of [false,true]){
  const {call,env,sql}=setup(t);let initial=await read(call);if(seed)initial=await(await call('/api/admin/categories','PUT',payload(initial))).json();
  const prepare=env.DB.prepare.bind(env.DB);let raced=false;
  env.DB.prepare=q=>{const statement=prepare(q);if(q.startsWith('INSERT INTO content_entries')){const run=statement.run.bind(statement);statement.run=async()=>{
   if(!raced){raced=true;sql.prepare('INSERT INTO content_entries(key,kind,data,revision,updated_at,updated_by) VALUES(?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET revision=excluded.revision').run('presentation:categories','presentation',JSON.stringify({items:payload(initial).items}),'concurrent-revision',new Date().toISOString(),'other-admin');}
   return run();
  };}return statement;};
  const body=payload(initial);body.items.reverse();assert.equal((await call('/api/admin/categories','PUT',body)).status,409);assert.equal((await read(call)).revision,'concurrent-revision');
  assert.deepEqual((await read(call)).items.map(x=>x.id),initial.items.map(x=>x.id));
 }
});

test('cover uploads reject wrong formats, stage privately, and replaced or reset covers stop being public',async t=>{
 const {call,env}=setup(t);
 for(const [id,type,bytes]of [['unknown','image/png',png()],['brand','image/svg+xml',png()],['brand','image/png',new Uint8Array(32)]])assert([400,404].includes((await call('/api/admin/categories/'+id+'/cover','POST',bytes,'owner',{'Content-Type':type})).status));
 const first=await upload(call),second=await upload(call),settings=await read(call);let body=payload(settings);body.items.find(x=>x.id==='brand').cover=first;
 let saved=await(await call('/api/admin/categories','PUT',body)).json();assert.equal((await call(first,'GET',null,null)).status,200);assert.equal((await call(second,'GET',null,null)).status,404);
 body=payload(saved);body.items.find(x=>x.id==='brand').cover=second;saved=await(await call('/api/admin/categories','PUT',body)).json();assert.equal((await call(first,'GET',null,null)).status,404);assert.equal((await call(second,'GET',null,null)).status,200);
 env.PUBLIC_SITE_PAUSED='true';assert.equal((await call(second,'GET',null,null)).status,503);assert.equal((await call('/admin/categories','GET',null,null)).status,302);assert.equal((await call('/admin/categories')).status,200);env.PUBLIC_SITE_PAUSED='false';
 body=payload(saved);body.items.find(x=>x.id==='brand').cover='';saved=await(await call('/api/admin/categories','PUT',body)).json();assert.equal(saved.items.find(x=>x.id==='brand').cover,settings.items.find(x=>x.id==='brand').defaultCover);assert.equal((await call(second,'GET',null,null)).status,404);
});
