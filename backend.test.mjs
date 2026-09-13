import {tokens,accessEnv} from './test/access-fixture.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';
import worker from './worker/index.mjs';import {CHUNK} from './worker/api.mjs';
const origin='https://aurovoy.invalid';
test('mentor add, multilingual edits, photo upload, visibility and removal persist across public pages',async()=>{
 const {call}=setup();const base='/api/admin/content/mentors';
 assert.equal((await call(base,'GET',null,null)).status,401);assert.equal((await call('/admin/mentors','GET',null,null)).status,302);
 const initial=await(await call(base)).json();assert.equal(initial.items.length,5);assert(initial.items.every(m=>m.biography[0]&&m.photo));
 let m=await(await call(base,'POST',{})).json();const suffix=`/${m.id}`,profile=`/mentor-${m.id}.html`;
 assert.equal(m.status,'draft');assert.equal((await call(profile,'GET',null,null)).status,404);
 const data={...m,name:['新导师 <script>','New Instructor','Nouvel intervenant'],role:['课程导师','Instructor','Intervenant'],biography:['真实专业经历\n\n详细授课说明','',''],bio:['简要介绍','',''],teaching:['课程方向一\n课程方向二','',''],tags:['实操\n创作','','']};
 assert.equal((await call(base+suffix,'PUT',{...data,status:'published'})).status,400);
 m=await(await call(base+suffix,'PUT',data)).json();assert(m.revision!=='baseline');
 const pic=new Uint8Array(32);pic.set([137,80,78,71,13,10,26,10]);
 assert.equal((await call(base+suffix+'/photo','PUT',pic,'owner',{'Content-Type':'image/png','X-Content-Revision':'old'})).status,409);
 m=await(await call(base+suffix+'/photo','PUT',pic,'owner',{'Content-Type':'image/png','X-Content-Revision':m.revision})).json();assert(m.photo.startsWith('/content-media/'));
 assert.equal((await call(m.photo,'GET',null,null)).status,404);assert.equal((await call(m.photo)).status,200);
 m=await(await call(base+suffix+'/status','PATCH',{revision:m.revision,status:'published'})).json();
 for(const pre of ['','/en','/fr']){const page=await(await call(pre+profile,'GET',null,null)).text();assert(page.includes(m.photo));assert(page.includes('真实专业经历'));assert(!page.includes('<script>'));assert.equal((page.match(/class="parent-back"/g)||[]).length,1);assert(page.includes(`${pre?pre.slice(1)+'/':''}mentor-${m.id}.html`)||page.includes(profile.slice(1)));const list=await(await call(pre+'/mentors.html','GET',null,null)).text();assert(list.includes(m.id));}
 assert((await(await call('/sitemap.xml','GET',null,null)).text()).includes(profile));
 let older=m;m=await(await call(base+suffix+'/status','PATCH',{revision:m.revision,status:'draft'})).json();assert.equal((await call(base+suffix,'PUT',older)).status,409);assert.equal((await call(profile,'GET',null,null)).status,404);
 assert.equal((await call(base+suffix,'DELETE',{revision:m.revision})).status,200);assert(!(await(await call(base)).json()).items.some(x=>x.id===m.id));assert.equal((await call(base+suffix,'PUT',m)).status,404);
 const existing=(await(await call(base)).json()).items.find(x=>x.id==='huohuo');await call(base+'/huohuo','DELETE',{revision:existing.revision});assert(!(await(await call(base)).json()).items.some(x=>x.id==='huohuo'));assert.equal((await call('/mentor-huohuo.html','GET',null,null)).status,404);
});
test('course editing preserves examples and synchronizes curriculum, language fallback and visibility',async()=>{
 const {call}=setup(),base='/api/admin/content/courses';let items=(await(await call(base)).json()).items;assert.equal(items.length,3);let c=items.find(x=>x.id==='intro');assert.equal(c.modules.length,5);
 c={...c,name:['更新公开课','',''],time:['两小时','',''],desc:['新版课程说明','',''],modules:[{title:['全新模块','',''],lesson:['学习 <img src=x onerror=alert(1)>','',''],exercise:['课堂新练习','',''],outcome:['练习成果','','']}]};
 c=await(await call(base+'/intro','PUT',c)).json();assert.equal(c.name[0],'更新公开课');
 for(const pre of ['','/en','/fr']){const page=await(await call(pre+'/course-intro.html','GET',null,null)).text();assert(page.includes('更新公开课'));assert(page.includes('全新模块'));assert(page.includes('课堂新练习'));assert(!page.includes('<img src=x'));assert(page.includes('case-tea.mp4'));assert.equal((page.match(/class="parent-back"/g)||[]).length,1);assert((await(await call(pre+'/training.html','GET',null,null)).text()).includes('更新公开课'));}
 const zh=await(await call('/course-intro.html','GET',null,null)).text();assert(zh.includes('学员练习作品，非商业合作'));
 c=await(await call(base+'/intro/status','PATCH',{revision:c.revision,status:'draft'})).json();assert.equal((await call('/course-intro.html','GET',null,null)).status,404);
 const training=await(await call('/training.html','GET',null,null)).text();assert(!training.includes('course-intro.html'));assert.equal((training.match(/id="learning-path-tab-/g)||[]).length,2);assert.equal((training.match(/class="goal-panel"/g)||[]).length,2);
 assert(!(await(await call('/sitemap.xml','GET',null,null)).text()).includes('course-intro.html'));
});
test('one-click removal and relisting synchronize existing works across all public languages',async()=>{
 const {call}=setup();let w=(await(await call('/api/admin/works')).json()).works.find(w=>w.id==='legacy-2');
 const toggle=`/api/admin/works/${w.id}/status`,before=structuredClone(w);
 assert.equal((await call(toggle,'PATCH',{status:'draft',updatedAt:w.updatedAt},'outsider')).status,403);
 w=await(await call(toggle,'PATCH',{status:'draft',updatedAt:w.updatedAt})).json();assert(w.hasBeenPublished);assert.equal(w.video,before.video);assert.deepEqual(w.titles,before.titles);
 for(const prefix of ['','/en','/fr']){
  for(const page of ['/works.html','/works-overseas.html','/global.html','/work-1.html']){
   const r=await call(prefix+page,'GET',null,null);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const html=await r.text();assert(!html.includes('work-2.html'),prefix+page);assert(!html.includes('cover-2.webp'),prefix+page);
  }
  assert.equal((await call(prefix+'/work-2.html','GET',null,null)).status,404);
  assert.equal((await call(prefix+'/work-2','GET',null,null)).status,404);
 }
 assert(!(await(await call('/sitemap.xml','GET',null,null)).text()).includes('work-2.html'));
 assert.equal((await call(toggle,'PATCH',{status:'published',updatedAt:before.updatedAt})).status,409);
 w=await(await call(toggle,'PATCH',{status:'published',updatedAt:w.updatedAt})).json();assert.equal(w.status,'published');
 for(const prefix of ['','/en','/fr']){assert((await(await call(prefix+'/works-overseas.html','GET',null,null)).text()).includes('work-2.html'));assert.equal((await call(prefix+'/work-2.html','GET',null,null)).status,200);}
 const draft=await(await call('/api/admin/works','POST',{})).json();assert.equal((await call(`/api/admin/works/${draft.id}/status`,'PATCH',{status:'published',updatedAt:draft.updatedAt})).status,400);
});
function setup(){const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
 const DB={prepare(q){const s=sql.prepare(q);let args=[];return {bind(...a){args=a;return this;},async first(){return s.get(...args)??null;},async all(){return {results:s.all(...args)};},async run(){return s.run(...args);}};}};
 const blobs=new Map(),multiparts=new Map();const FILES={async put(k,b,o){blobs.set(k,{bytes:Buffer.from(b),type:o?.httpMetadata?.contentType});return this.head(k);},async head(k){const b=blobs.get(k);return b?{size:b.bytes.length}:null;},async get(k,o){const b=blobs.get(k);return b?{body:o?.range?b.bytes.subarray(o.range.offset,o.range.offset+o.range.length):b.bytes}:null;},async delete(k){blobs.delete(k);},async createMultipartUpload(k,o){const id=crypto.randomUUID();multiparts.set(id,{key:k,type:o.httpMetadata.contentType,parts:new Map()});return {uploadId:id};},resumeMultipartUpload(k,id){return {async uploadPart(n,b){multiparts.get(id).parts.set(n,Buffer.from(b));return {partNumber:n,etag:`etag-${n}`};},async complete(parts){const m=multiparts.get(id);blobs.set(k,{bytes:Buffer.concat(parts.map(p=>m.parts.get(p.partNumber))),type:m.type});multiparts.delete(id);},async abort(){multiparts.delete(id);}};}};
 const env={...accessEnv,DB,FILES,ASSETS:{async fetch(r){let p=new URL(r.url).pathname;if(p==='/')p='/index.html';const file=path.resolve('dist/client','.'+p);if(!file.startsWith(path.resolve('dist/client')+path.sep)||!fs.existsSync(file))return new Response('Not found',{status:404});return new Response(fs.readFileSync(file),{headers:{'Content-Type':file.endsWith('.html')?'text/html':'text/plain'}});}}};
 const call=(p,method='GET',body,auth='owner',extra={})=>{const headers={...extra};if(auth){headers['cf-access-jwt-assertion']=tokens[auth];}if(method!=='GET'){headers.Origin=origin;headers['X-Aurovoy-Admin']='1';}let payload=body;if(body&&!(body instanceof Uint8Array)){payload=JSON.stringify(body);headers['Content-Type']='application/json';}if(payload instanceof Uint8Array)headers['Content-Length']=String(payload.byteLength);return worker.fetch(new Request(origin+p,{method,headers,body:payload}),env);};return {call,env,sql};}
test('owner-only admin, cross-site protection and indexable public content',async()=>{const {call,env}=setup();assert.equal((await call('/admin','GET',null,null)).status,302);assert.equal((await call('/api/admin/works','GET',null,null)).status,401);assert.equal((await call('/api/admin/works','GET',null,'outsider')).status,403);assert.equal((await call('/admin')).status,200);const r=await worker.fetch(new Request(origin+'/api/admin/works',{method:'POST',headers:{'cf-access-jwt-assertion':tokens.owner,Origin:'https://evil.test','X-Aurovoy-Admin':'1'}}),env);assert.equal(r.status,403);const list=await(await call('/api/admin/works')).json();assert.equal(list.works.length,75);assert.equal(list.works.filter(w=>w.status==="published").length,72);const about=await(await call('/about.html','GET',null,null)).text();assert(about.includes('width="100%" height="100%"'));assert(about.includes('in2="SourceAlpha" operator="in"'));const robots=await(await call('/robots.txt','GET',null,null)).text();assert(robots.includes('Allow: /')&&robots.includes('Disallow: /admin'));assert.equal((await call('/works-brand.html','GET',null,null)).status,200);});
test('durable create, validated multipart upload, publishing, range playback, unpublishing',async()=>{const {call}=setup();let w=await(await call('/api/admin/works','POST',{})).json();const route='/api/admin/works/'+w.id;assert.equal(w.status,'draft');assert.equal((await call('/work/'+w.id,'GET',null,null)).status,404);assert.equal((await call(route,'PUT',{...w,status:'published'})).status,400);
 const video=new Uint8Array(CHUNK+32);video.set([0,0,0,24,102,116,121,112],0);const up=await(await call('/api/admin/uploads','POST',{workId:w.id,kind:'video',size:video.length,type:'video/mp4'})).json();assert(up.id);assert.equal((await call(`/api/admin/uploads/${up.id}/complete`,'POST',{})).status,400);assert.equal((await call(`/api/admin/uploads/${up.id}/1`,'PUT',video.subarray(0,CHUNK))).status,200);assert.equal((await call(`/api/admin/uploads/${up.id}/2`,'PUT',video.subarray(CHUNK))).status,200);w=await(await call(`/api/admin/uploads/${up.id}/complete`,'POST',{})).json();
 const poster=new Uint8Array(32);poster.set([137,80,78,71,13,10,26,10]);const pp=await(await call('/api/admin/uploads','POST',{workId:w.id,kind:'poster',size:poster.length,type:'image/png'})).json();assert.equal((await call(`/api/admin/uploads/${pp.id}/1`,'PUT',new Uint8Array(32))).status,400);assert.equal((await call(`/api/admin/uploads/${pp.id}/1`,'PUT',poster)).status,200);w=await(await call(`/api/admin/uploads/${pp.id}/complete`,'POST',{})).json();assert.equal((await call(w.video,'GET',null,null)).status,404);
 w=await(await call(route,'PUT',{...w,titles:['新作品 <script>','New film','Nouveau film'],descriptions:['创作说明','',''],status:'published',category:'brand',orientation:'portrait'})).json();assert.equal(w.status,'published');
 for(const prefix of ['','/en','/fr']){const html=await(await call(prefix+'/work/'+w.id,'GET',null,null)).text();assert(!html.includes('<script>'));assert(html.includes(w.video));assert(html.includes('parent-back'));assert(html.includes(`href="${prefix}/works-brand.html"`));assert(html.includes(`/en/work/${w.id}`)&&html.includes(`/fr/work/${w.id}`));const gallery=await(await call(prefix+'/works-brand.html','GET',null,null)).text();assert(gallery.includes(w.id));assert(gallery.indexOf('format-landscape')<gallery.indexOf('format-portrait'));}
 const playback=await call(w.video,'GET',null,null,{Range:'bytes=0-15'});assert.equal(playback.status,206);assert.equal((await playback.arrayBuffer()).byteLength,16);assert.equal((await call(w.video,'GET',null,null,{Range:'bytes=999999999-'})).status,416);
 const sitemap=await(await call('/sitemap.xml','GET',null,null)).text();assert(sitemap.includes('/work/'+w.id));assert(!sitemap.includes('/admin'));
 assert.equal((await call(route,'PUT',{...w,updatedAt:'old'})).status,409);w=await(await call(route,'PUT',{...w,status:'draft'})).json();assert.equal((await call(w.video,'GET',null,null)).status,404);assert.equal((await call('/work/'+w.id,'GET',null,null)).status,404);assert(!(await(await call('/works-brand.html','GET',null,null)).text()).includes(w.id));});

test('publication selects a category and moves listings in every language',async()=>{
 const {call}=setup();let data=await(await call('/api/admin/works')).json(),w=data.works.find(w=>w.category==='brand');const endpoint=`/api/admin/works/${w.id}/status`;
 w=await(await call(endpoint,'PATCH',{status:'draft',updatedAt:w.updatedAt})).json();
 assert.equal((await call(endpoint,'PATCH',{status:'published',category:'invalid',updatedAt:w.updatedAt})).status,400);
 w=await(await call(endpoint,'PATCH',{status:'published',category:'overseas',updatedAt:w.updatedAt})).json();assert.equal(w.category,'overseas');
 const path='work-'+w.id.slice(7)+'.html';
 for(const prefix of ['','/en','/fr']){
  const cards=async category=>(await(await call(prefix+'/works-'+category+'.html','GET',null,null)).text()).match(/<article class="film-tile"[\s\S]*?<\/article>/g)?.join('')||'';
  assert(!(await cards('brand')).includes(path));assert((await cards('overseas')).includes(path));
 }
 w=await(await call(endpoint,'PATCH',{status:'draft',category:'brand',updatedAt:w.updatedAt})).json();assert.equal(w.category,'overseas');assert.equal((await call('/'+path,'GET',null,null)).status,404);
 const admin=await(await call('/admin')).text();assert(admin.includes('id="publication-dialog"'));assert(admin.includes('id="zone-filter"'));
});
test('training foregrounds the team link without individual profiles or making steps',async()=>{
 const {call}=setup();
 for(const prefix of ['','/en','/fr']){
  const s=await(await call(prefix+'/training.html','GET',null,null)).text();
  const team=s.match(/<section class="section training-team">[\s\S]*?<\/section>/)?.[0];
  assert(team);assert(team.includes('href="mentors.html"'));
  assert(s.indexOf('class="section training-team"')<s.indexOf('class="section goal-studio"'));
  assert.equal((s.match(/class="section training-team"/g)||[]).length,1);
  assert(!s.includes('training-person'));assert(!s.includes('making-sequence'));assert(!s.includes('THE MAKING OF A STORY'));assert(!s.includes('class="mentor-teaser section"'));
 }
});

test('Chinese saves localize both languages, preserve manual edits, cache results and fail without partial saves',async()=>{
 const {call,env,sql}=setup();let calls=0;
 env.AI={async run(model,options){calls++;const batch=JSON.parse(options.messages[1].content);return {response:{items:batch.map(x=>({id:x.id,en:'English: '+x.text,fr:'Français : '+x.text}))}};}};
 let w=(await(await call('/api/admin/works')).json()).works.find(x=>x.id==='legacy-3'),url='/api/admin/works/'+w.id;
 w=await(await call(url,'PUT',{...w,titles:['中文新片','',''],descriptions:['中文介绍','',''],autoTranslate:true})).json();assert.equal(w.titles[1],'English: 中文新片');assert.equal(w.descriptions[2],'Français : 中文介绍');assert.equal(calls,1);
 w=await(await call(url,'PUT',{...w,titles:[w.titles[0],'Edited English title',w.titles[2]],autoTranslate:true})).json();assert.equal(w.titles[1],'Edited English title');assert.equal(calls,1);
 const old=w;env.AI.run=async()=>{throw Error('unavailable');};let r=await call(url,'PUT',{...w,titles:['另一个标题','',''],autoTranslate:true});assert.equal(r.status,503);assert.equal((await(await call('/api/admin/works')).json()).works.find(x=>x.id===w.id).titles[0],old.titles[0]);
 w=await(await call(url,'PUT',{...w,titles:['另一个标题','',''],autoTranslate:false})).json();assert.equal(w.titles[0],'另一个标题');
 const day=new Date().toISOString().slice(0,10);sql.prepare('UPDATE translation_usage SET reserved=8000 WHERE day=?').run(day);assert.equal((await call(url,'PUT',{...w,titles:['超出额度','',''],autoTranslate:true})).status,429);
 assert.equal((await call(url,'PUT',{...w,autoTranslate:true},null)).status,401);
});

test('section changes preserve publication state and appear in science pages in every language',async()=>{
 const {call}=setup();let w=(await(await call('/api/admin/works')).json()).works.find(x=>x.id==='legacy-3');const endpoint='/api/admin/works/'+w.id+'/category';
 assert.equal((await call(endpoint,'PATCH',{category:'fake',updatedAt:w.updatedAt})).status,400);
 const old=w;w=await(await call(endpoint,'PATCH',{category:'science',updatedAt:w.updatedAt})).json();assert.equal(w.status,'published');assert.equal(w.category,'science');
 assert.equal((await call(endpoint,'PATCH',{category:'brand',updatedAt:old.updatedAt})).status,409);
 for(const pre of ['','/en','/fr']){const page=await(await call(pre+'/works-science.html','GET',null,null)).text();assert(page.includes('work-3.html'));assert((await(await call(pre+'/work-3.html','GET',null,null)).text()).includes('works-science.html'));}
});

test('course and mentor Chinese edits generate translations including nested modules',async()=>{
 const {call,env}=setup();env.AI={async run(model,options){return {response:{items:JSON.parse(options.messages[1].content).map(x=>({id:x.id,en:'English '+x.text,fr:'Français '+x.text}))}};}};
 let c=(await(await call('/api/admin/content/courses')).json()).items[0];c.modules=[{title:['新模块','',''],lesson:['新的学习内容','',''],exercise:['练习','',''],outcome:['成果','','']}];c=await(await call('/api/admin/content/courses/'+c.id,'PUT',{...c,autoTranslate:true})).json();assert.equal(c.modules[0].title[1],'English 新模块');assert.equal(c.modules[0].outcome[2],'Français 成果');
 let m=(await(await call('/api/admin/content/mentors')).json()).items[0];m=await(await call('/api/admin/content/mentors/'+m.id,'PUT',{...m,bio:['新的简介','',''],autoTranslate:true})).json();assert.equal(m.bio[1],'English 新的简介');
});


test('category ordering is atomic, owner-only and persists in all public languages',async()=>{
 const {call,sql,env}=setup(),endpoint='/api/admin/works/reorder';
 const list=async()=>(await(await call('/api/admin/works')).json()).works;
 const payload=(group)=>({category:group[0].category,orientation:group[0].orientation,items:group.map(({id,updatedAt})=>({id,updatedAt}))});
 const original=await list(),group=original.filter(w=>w.category==='brand'&&w.orientation==='landscape').reverse(),body=payload(group);
 assert(group.length>1);
 assert.equal((await call(endpoint,'PUT',body,null)).status,401);assert.equal((await call(endpoint,'PUT',body,'outsider')).status,403);
 assert.equal((await call(endpoint,'PUT',{...body,items:[body.items[0],body.items[0]]})).status,400);
 assert.equal((await call(endpoint,'PUT',{...body,items:body.items.slice(1)})).status,409);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM works').get().n,0);
 const response=await call(endpoint,'PUT',body);assert.equal(response.status,200,await response.clone().text());
 const changed=(await response.json()).works;
 for(const [i,w]of group.entries()){const current=changed.find(x=>x.id===w.id);assert.equal(current.order,i+1);for(const key of ['status','titles','descriptions','video','poster','category'])assert.deepEqual(current[key],w[key]);}
 for(const w of original.filter(w=>!group.some(x=>x.id===w.id)))assert.deepEqual(changed.find(x=>x.id===w.id),w);
 for(const prefix of ['','/en','/fr']){const html=await(await call(prefix+'/works-brand.html','GET',null,null)).text(),cards=[...html.matchAll(/<article class="film-tile"[\s\S]*?<\/article>/g)].map(m=>m[0]);const published=group.filter(w=>w.status==='published');let index=-1;for(const w of published){const href=w.id.startsWith('legacy-')?'work-'+w.id.slice(7)+'.html':'work/'+w.id;const next=cards.findIndex(c=>c.includes(href));assert(next>index,href);index=next;}}
 assert.equal((await call(endpoint,'PUT',body)).status,409);
 // A concurrent edit after reading the snapshot causes zero ordering writes.
 let fresh=await list(),retry=payload(fresh.filter(w=>w.category==='brand'&&w.orientation==='landscape').reverse());const before=sql.prepare('SELECT id,data FROM works ORDER BY id').all();
 const prepare=env.DB.prepare.bind(env.DB);let injected=false;
 env.DB.prepare=q=>{const statement=prepare(q);if(q.startsWith('INSERT INTO works(id,data,status,updated_at,updated_by)\n')){const run=statement.run;statement.run=async()=>{injected=true;sql.prepare("UPDATE works SET updated_at='concurrent-change' WHERE id=?").run(group[0].id);return run.call(statement);};}return statement;};
 assert.equal((await call(endpoint,'PUT',retry)).status,409);assert(injected);assert.deepEqual(sql.prepare('SELECT id,data FROM works ORDER BY id').all(),before);
});

test('every category and both formats support sorting, including retained drafts',async()=>{
 const {call}=setup();const data=await(await call('/api/admin/works')).json();
 for(const category of data.categories){for(const orientation of ['landscape','portrait']){
  const all=(await(await call('/api/admin/works')).json()).works,group=all.filter(w=>w.category===category.id&&w.orientation===orientation).reverse();if(!group.length)continue;
  const r=await call('/api/admin/works/reorder','PUT',{category:category.id,orientation,items:group.map(({id,updatedAt})=>({id,updatedAt}))});assert.equal(r.status,200,category.id+' '+await r.clone().text());
  const saved=(await r.json()).works.filter(w=>w.category===category.id&&w.orientation===orientation);assert.deepEqual(saved.map(w=>w.id),group.map(w=>w.id));assert.deepEqual(saved.map(w=>w.status),group.map(w=>w.status));
 }}
 const admin=await(await call('/admin')).text();assert(admin.includes('id="reorder-dialog"'));assert(admin.includes('id="reorder-open"'));
});

test('full-quality media preserves full dimensions and duration while respecting later admin uploads',async()=>{
 const {call,env,sql}=setup();const {default:quality}=await import('./video-quality.json',{with:{type:'json'}});const q=quality['legacy-12'];
 let w=(await(await call('/api/admin/works')).json()).works.find(w=>w.id==='legacy-12');assert.equal(w.video,q.video);assert.equal(w.mediaWidth,1922);assert(w.duration>240);
 for(const pre of ['','/en','/fr']){const html=await(await call(pre+'/work-12.html','GET',null,null)).text();assert(html.includes(q.video));assert(!html.includes('assets/film-12.mp4'));assert(!/最长 45 秒|Up to 45 seconds|45 secondes maximum/.test(html));const listing=await(await call(pre+'/works.html','GET',null,null)).text();assert(listing.includes(q.video));}
 const bytes=Buffer.alloc(64,7);await env.FILES.put(q.objectKey,bytes,{httpMetadata:{contentType:'video/mp4'}});
 sql.prepare('INSERT INTO uploads(id,work_id,kind,object_key,content_type,size,owner,state,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(q.video.split('/').pop(),w.id,'video',q.objectKey,'video/mp4',64,'owner','complete',new Date().toISOString());
 let r=await call(q.video,'GET',null,null,{Range:'bytes=48-'});assert.equal(r.status,206);assert.equal((await r.arrayBuffer()).byteLength,16);assert.equal(r.headers.get('content-range'),'bytes 48-63/64');
 w=await(await call('/api/admin/works/'+w.id+'/status','PATCH',{status:'draft',updatedAt:w.updatedAt})).json();assert.equal((await call(q.video,'GET',null,null)).status,404);assert.equal((await call(q.video)).status,200);
 const own={...w,video:'/media/new-admin-upload',order:77};sql.prepare('UPDATE works SET data=? WHERE id=?').run(JSON.stringify(own),w.id);
 const loaded=(await(await call('/api/admin/works')).json()).works.find(x=>x.id===w.id);assert.equal(loaded.video,own.video);assert.equal(loaded.order,77);assert.equal((await call(q.video)).status,404);
});

test('international showcases use complete R2 videos and support byte ranges',async()=>{
 const {call,env}=setup();const {default:quality}=await import('./video-quality.json',{with:{type:'json'}});
 for(const id of ['global-en','global-pt']){const q=quality[id];await env.FILES.put(q.objectKey,Buffer.alloc(200,3),{httpMetadata:{contentType:'video/mp4'}});
  for(const pre of ['','/en','/fr']){const html=await(await call(pre+'/global.html','GET',null,null)).text();assert(html.includes(q.video));assert(!html.includes(q.previousVideo));}
  const r=await call(q.video,'GET',null,null,{Range:'bytes=-20'});assert.equal(r.status,206);assert.equal((await r.arrayBuffer()).byteLength,20);assert.equal((await call(q.video,'HEAD',null,null)).headers.get('content-length'),'200');assert.equal((await call(q.video,'GET',null,null,{Range:'bytes=201-'})).status,416);assert.equal((await call(q.video,'POST',{},null)).status,405);
 }
 assert.equal((await call('/showcase-video/private.mp4','GET',null,null)).status,404);
});

