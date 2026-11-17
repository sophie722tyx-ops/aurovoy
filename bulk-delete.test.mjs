import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,origin} from './test/worker-fixture.mjs';
import worker from './worker/index.mjs';
import {tokens} from './test/access-fixture.mjs';
import catalog from './playback-catalog.json' with {type:'json'};
import {allWorks,getWork,saveWork} from './worker/repository.mjs';

const endpoint='/api/admin/works/bulk-delete';
const selection=works=>({items:works.map(({id,updatedAt})=>({id,updatedAt}))});
const list=async call=>(await(await call('/api/admin/works')).json()).works;
const rows=sql=>sql.prepare('SELECT * FROM works ORDER BY id').all();

test('bulk deletion rejects unauthorised, cross-site and malformed selections before writing',async t=>{
 const {call,env,sql}=setup(t),selected=(await list(call)).slice(0,2),body=selection(selected);
 assert.equal((await call(endpoint,'POST',body,null)).status,401);
 assert.equal((await call(endpoint,'POST',body,'outsider')).status,403);
 for(const headers of [{Origin:'https://other.test','X-Aurovoy-Admin':'1'},{Origin:origin}]){
  const r=await worker.fetch(new Request(origin+endpoint,{method:'POST',headers:{...headers,'cf-access-jwt-assertion':tokens.owner,'Content-Type':'application/json'},body:JSON.stringify(body)}),env);assert.equal(r.status,403);
 }
 const item=body.items[0];
 for(const bad of [null,{},[],{items:[]},{items:null},{items:[null]},{items:[item,item]},{items:[{...item,id:'../work'}]},{items:[{...item,updatedAt:'old'}]},{items:[{...item,updatedAt:null}]},{items:Array.from({length:201},(_,i)=>({...item,id:'work-'+i}))}]){
  const r=await call(endpoint,'POST',bad);assert.equal(r.status,400,JSON.stringify(bad));
 }
 assert.deepEqual(rows(sql),[]);
 await call('/api/admin/members','POST',{email:'outsider@example.test'});
 const r=await call(endpoint,'POST',body,'outsider');assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true,ids:selected.map(w=>w.id)});
 assert(rows(sql).every(row=>row.status==='deleted'&&JSON.parse(row.data).deletedBy));
});

test('one batch removes bundled, uploaded and draft works across public pages and revokes media without deleting files',async t=>{
 const {call,env,sql}=setup(t);let uploaded=await(await call('/api/admin/works','POST',{})).json();
 const uploads=[];
 for(const [kind,type,signature]of [['video','video/mp4',[0,0,0,24,102,116,121,112]],['poster','image/png',[137,80,78,71,13,10,26,10]]]){
  const bytes=new Uint8Array(32);bytes.set(signature);
  const u=await(await call('/api/admin/uploads','POST',{workId:uploaded.id,kind,type,size:bytes.length})).json();uploads.push(u);
  assert.equal((await call('/api/admin/uploads/'+u.id+'/1','PUT',bytes)).status,200);
  uploaded=await(await call('/api/admin/uploads/'+u.id+'/complete','POST',{})).json();
 }
 uploaded=await(await call('/api/admin/works/'+uploaded.id,'PUT',{...uploaded,status:'published'})).json();
 const draft=await(await call('/api/admin/works','POST',{})).json(),bundled=(await list(call)).find(w=>w.id==='legacy-3'),untouched=(await list(call)).find(w=>w.id==='legacy-4');
 const [mediaId,hls]=Object.entries(catalog).find(([,e])=>e.workId===bundled.id),hlsPath='/playback/'+mediaId+'/'+hls.prefix.split('/').pop()+'/master.m3u8';
 await env.FILES.put(hls.prefix+'/master.m3u8',new Uint8Array(hls.files['master.m3u8'].size));
 const before=await call(hlsPath,'GET',null,null);assert.equal(before.status,200);const etag=before.headers.get('etag');await before.arrayBuffer();
 assert.equal((await call(uploaded.video,'GET',null,null)).status,200);
 const removed=[bundled,uploaded,draft],response=await call(endpoint,'POST',selection(removed));assert.equal(response.status,200);assert.deepEqual((await response.json()).ids,removed.map(w=>w.id));
 const remaining=await list(call);assert(removed.every(w=>!remaining.some(x=>x.id===w.id)));assert.deepEqual(remaining.find(w=>w.id===untouched.id),untouched);
 const creatorList=await(await call('/api/admin/content/creators/aurovoy-team/works')).json();assert(removed.every(w=>!creatorList.works.some(x=>x.id===w.id)));
 for(const pre of ['','/en','/fr']){
  for(const path of ['/work-3.html','/work/'+uploaded.id,'/work/'+draft.id])assert.equal((await call(pre+path,'GET',null,null)).status,404);
  for(const page of ['/works.html','/works-brand.html','/creator/aurovoy-team']){const html=await(await call(pre+page,'GET',null,null)).text();assert(!html.includes('work-3.html'));assert(!html.includes('/work/'+uploaded.id));}
 }
 const sitemap=await(await call('/sitemap.xml','GET',null,null)).text();assert(!sitemap.includes('work-3.html'));assert(!sitemap.includes('/work/'+uploaded.id));
 for(const auth of [null,'owner'])for(const path of [uploaded.video,uploaded.poster,hlsPath])for(const headers of [{},{Range:'bytes=0-7'},{'If-None-Match':etag}])assert.equal((await call(path,'GET',null,auth,headers)).status,404);
 for(const w of removed){
  const row=sql.prepare('SELECT * FROM works WHERE id=?').get(w.id),data=JSON.parse(row.data);assert.equal(row.status,'deleted');assert.equal(data.deletedAt,row.updated_at);
  for(const key of ['titles','descriptions','video','poster','category','orientation','order'])assert.deepEqual(data[key],w[key]);
  assert.equal(await getWork(env,w.id),undefined);await assert.rejects(saveWork(env,w,'owner'),e=>e.status===409);
 }
 assert.equal((await allWorks(env,true,true)).filter(w=>removed.some(x=>x.id===w.id)&&w.status==='deleted').length,3);
 for(const u of uploads){const row=sql.prepare('SELECT * FROM uploads WHERE id=?').get(u.id);assert.equal(row.state,'complete');assert.equal((await env.FILES.head(row.object_key)).size,32);}
 assert.equal((await env.FILES.head(hls.prefix+'/master.m3u8')).size,hls.files['master.m3u8'].size);
});

test('missing, already deleted or stale items prevent every deletion in the batch',async t=>{
 const {call,sql}=setup(t),initial=(await list(call)).filter(w=>['legacy-3','legacy-4','legacy-5'].includes(w.id));
 let changed=await(await call('/api/admin/works/'+initial[1].id,'PUT',{...initial[1],titles:['另一个窗口的新标题',...initial[1].titles.slice(1)]})).json();
 let before=rows(sql);assert.equal((await call(endpoint,'POST',selection(initial.slice(0,2)))).status,409);assert.deepEqual(rows(sql),before);
 assert.equal((await call(endpoint,'POST',selection([initial[0],{...changed,id:'missing-work'}]))).status,404);assert.deepEqual(rows(sql),before);
 assert.equal((await call('/api/admin/works/'+changed.id,'DELETE',{updatedAt:changed.updatedAt})).status,200);
 before=rows(sql);assert.equal((await call(endpoint,'POST',selection([initial[0],changed]))).status,404);assert.deepEqual(rows(sql),before);
 assert.equal((await call(endpoint,'POST',selection([initial[0],initial[2]]))).status,200);
 assert.equal((await call('/work-3.html','GET',null,null)).status,404);
});

test('concurrent changes between validation and commit cannot partially delete or overwrite another editor',async t=>{
 for(const mode of ['edit-bundled','delete-bundled','edit-stored']){
  const {call,env,sql}=setup(t);let selected=(await list(call)).filter(w=>['legacy-3','legacy-4'].includes(w.id));
  if(mode==='edit-stored')selected[1]=await(await call('/api/admin/works/'+selected[1].id,'PUT',selected[1])).json();
  const target=selected[1],prepare=env.DB.prepare.bind(env.DB);let injected=false;
  env.DB.prepare=q=>{const statement=prepare(q);if(q.includes("SELECT json_extract(value,'$.id'),value,'deleted'")){
   const run=statement.run.bind(statement);statement.run=async()=>{if(!injected){injected=true;const concurrent={...target,status:mode==='delete-bundled'?'deleted':target.status,titles:['另一位编辑的新内容',...target.titles.slice(1)],updatedAt:'2099-01-01T00:00:00.000Z'};
    sql.prepare('INSERT INTO works(id,data,status,updated_at,updated_by) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status,updated_at=excluded.updated_at,updated_by=excluded.updated_by').run(target.id,JSON.stringify(concurrent),concurrent.status,concurrent.updatedAt,'other-editor');}
    return run();};}return statement;};
  const r=await call(endpoint,'POST',selection(selected));assert.equal(r.status,409,mode);assert(injected);assert.equal(rows(sql).length,1);assert.equal(sql.prepare('SELECT id FROM works WHERE id=?').get(selected[0].id),undefined);
  const row=sql.prepare('SELECT * FROM works WHERE id=?').get(target.id);assert.equal(row.updated_by,'other-editor');assert.equal(JSON.parse(row.data).titles[0],'另一位编辑的新内容');assert.equal(row.status,mode==='delete-bundled'?'deleted':target.status);
 }
});

test('a storage error rolls back the whole SQL statement, and a full 200-item selection is supported',async t=>{
 const {call,sql}=setup(t),selected=(await list(call)).filter(w=>['legacy-3','legacy-4'].includes(w.id));
 sql.exec("CREATE TRIGGER fail_second_deletion BEFORE INSERT ON works WHEN NEW.id='legacy-4' BEGIN SELECT RAISE(ABORT,'simulated write failure'); END");
 assert.equal((await call(endpoint,'POST',selection(selected))).status,500);assert.deepEqual(rows(sql),[]);sql.exec('DROP TRIGGER fail_second_deletion');
 const many=Array.from({length:200},(_,i)=>({...selected[0],id:'batch-work-'+String(i).padStart(3,'0'),status:'draft'}));
 const insert=sql.prepare('INSERT INTO works(id,data,status,updated_at,updated_by) VALUES(?,?,?,?,?)');for(const w of many)insert.run(w.id,JSON.stringify(w),w.status,w.updatedAt,'test');
 const r=await call(endpoint,'POST',selection(many));assert.equal(r.status,200);assert.equal((await r.json()).ids.length,200);assert.equal(sql.prepare("SELECT COUNT(*) n FROM works WHERE status='deleted'").get().n,200);
 assert.equal((await call('/work-3.html','GET',null,null)).status,200);
});
