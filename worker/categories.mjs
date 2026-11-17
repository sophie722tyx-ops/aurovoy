import {categories,db,allWorks} from './repository.mjs';
import {identity,isAdmin,assertWrite} from './auth.mjs';
import {synchronizeEditorial} from './publication.mjs';

const key='presentation:categories';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const imagePath=/^\/category-media\/([a-f0-9-]{36})$/;
const baseCover=c=>'/assets/'+(c.coverFile||`cover-${c.cover}.webp`);

export async function categorySettings(env){
 const row=await db(env).prepare('SELECT data,revision FROM content_entries WHERE key=?').bind(key).first();
 const stored=row?JSON.parse(row.data).items:[],seen=new Set(),items=[];
 for(const item of [...stored,...categories.map(c=>({id:c.id,cover:''}))]){
  if(seen.has(item.id)||!categories.some(c=>c.id===item.id))continue;
  seen.add(item.id);items.push({id:item.id,cover:typeof item.cover==='string'&&imagePath.test(item.cover)?item.cover:''});
 }
 return {revision:row?.revision||'baseline',items};
}
export async function orderedCategories(env){const settings=await categorySettings(env);return settings.items.map(item=>({...categories.find(c=>c.id===item.id),customCover:item.cover}));}
async function adminData(env,settings){
 const works=await allWorks(env,true,true);
 return {revision:settings.revision,items:settings.items.map(item=>{
  const c=categories.find(c=>c.id===item.id),markup=synchronizeEditorial(`<img src="${baseCover(c).slice(1)}">`,works),defaultCover='/'+markup.match(/src="([^"]+)"/)[1].replace(/^\/+/, '');
  return {id:c.id,name:c.name[0],cover:item.cover||defaultCover,customCover:item.cover,defaultCover};
 })};
}
async function input(request){const text=await request.text();if(text.length>32000)fail('分区设置内容过长',413);try{return JSON.parse(text);}catch{fail('无法读取分区设置');}}
export async function categoryApi(request,env){
 if(!isAdmin(request,env))return json({error:'请使用管理员账号登录'},identity(request,env)?403:401);
 if(request.method!=='GET')assertWrite(request);
 const path=new URL(request.url).pathname;
 if(path==='/api/admin/categories'&&request.method==='GET')return json(await adminData(env,await categorySettings(env)));
 if(path==='/api/admin/categories'&&request.method==='PUT'){
  const data=await input(request),settings=await categorySettings(env);
  if(data?.revision!==settings.revision)fail('分区设置已在其他窗口修改，请刷新后再编辑',409);
  if(!Array.isArray(data.items)||data.items.length!==categories.length||new Set(data.items.map(x=>x?.id)).size!==categories.length||data.items.some(x=>!x||!categories.some(c=>c.id===x.id)||typeof x.cover!=='string'||(x.cover!==''&&!imagePath.test(x.cover))))fail('请保留全部分区，并检查顺序与封面');
  const items=data.items.map(x=>({id:x.id,cover:x.cover}));
  for(const item of items){if(!item.cover)continue;const row=await db(env).prepare('SELECT entry_key FROM content_images WHERE id=?').bind(item.cover.split('/').pop()).first();if(row?.entry_key!=='categories:'+item.id)fail('请选择此分区上传的封面');}
  const revision=crypto.randomUUID(),now=new Date().toISOString();
  // A single document and guarded statement make order + covers an atomic save.
  const result=await db(env).prepare(`INSERT INTO content_entries(key,kind,data,revision,updated_at,updated_by)
   SELECT ?,?,?,?,?,? WHERE (?='baseline' AND NOT EXISTS (SELECT 1 FROM content_entries WHERE key=?))
    OR EXISTS (SELECT 1 FROM content_entries WHERE key=? AND revision=?)
   ON CONFLICT(key) DO UPDATE SET data=excluded.data,revision=excluded.revision,updated_at=excluded.updated_at,updated_by=excluded.updated_by WHERE content_entries.revision=?`)
   .bind(key,'presentation',JSON.stringify({items}),revision,now,identity(request,env).id,settings.revision,key,key,settings.revision,settings.revision).run();
  if((result.meta?.changes??result.changes)!==1)fail('分区设置已在其他窗口修改，请刷新后再编辑',409);
  return json(await adminData(env,{revision,items}));
 }
 const match=path.match(/^\/api\/admin\/categories\/([a-z]+)\/cover$/);
 if(match&&request.method==='POST'){
  const id=match[1];if(!categories.some(c=>c.id===id))fail('分区不存在',404);
  const type=request.headers.get('content-type'),size=Number(request.headers.get('content-length'));
  if(!['image/jpeg','image/png','image/webp'].includes(type)||!Number.isInteger(size)||size<12||size>10*1024*1024)fail('请上传 10 MB 以内的 JPG、PNG 或 WebP 封面');
  const bytes=new Uint8Array(await request.arrayBuffer()),str=(start,len)=>String.fromCharCode(...bytes.slice(start,start+len));
  const valid=type==='image/png'?bytes[0]===137&&str(1,3)==='PNG':type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:str(0,4)==='RIFF'&&str(8,4)==='WEBP';
  if(bytes.length!==size||!valid)fail('图片内容与文件格式不匹配');
  const imageId=crypto.randomUUID(),objectKey=`categories/${id}/${imageId}`;
  await env.FILES.put(objectKey,bytes,{httpMetadata:{contentType:type}});
  try{await db(env).prepare('INSERT INTO content_images(id,entry_key,object_key,content_type) VALUES(?,?,?,?)').bind(imageId,'categories:'+id,objectKey,type).run();}
  catch(error){await env.FILES.delete(objectKey);throw error;}
  return json({cover:'/category-media/'+imageId},201);
 }
 return json({error:'请求不存在'},404);
}
export async function categoryImage(request,env,id){
 const missing=()=>new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 const row=await db(env).prepare('SELECT * FROM content_images WHERE id=?').bind(id).first();
 if(!row||!row.entry_key.startsWith('categories:'))return missing();
 const categoryId=row.entry_key.slice(11),settings=await categorySettings(env);
 if(!settings.items.some(x=>x.id===categoryId)||(!isAdmin(request,env)&&!settings.items.some(x=>x.id===categoryId&&x.cover==='/category-media/'+id)))return missing();
 const object=await env.FILES.get(row.object_key);if(!object)return missing();
 return new Response(request.method==='HEAD'?null:object.body,{headers:{'Content-Type':row.content_type,'Cache-Control':'private, no-cache','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'}});
}

// Presentation overrides are applied to the generated markup, preserving its design.
export async function categoryPresentation(html,path,env){
 const current=path.match(/^\/(?:(en|fr)\/)?works-([a-z]+)(?:\.html)?\/?$/)?.[2];
 if(!current&&!/class="category-card|data-work-category|class="capability-links"|class="category-switch"/.test(html))return html;
 const settings=await categorySettings(env),byId=new Map(settings.items.map(x=>[x.id,x])),rank=new Map(settings.items.map((x,i)=>[x.id,i]));
 const idOf=markup=>markup.match(/(?:href="[^"]*works-|value=")([a-z]+)(?:\.html|")/)?.[1];
 function sorted(markup,pattern){const matches=[...markup.matchAll(pattern)].map(x=>x[0]);if(!matches.length)return markup;const ordered=matches.slice().sort((a,b)=>(rank.get(idOf(a))??999)-(rank.get(idOf(b))??999));let i=0;return markup.replace(pattern,()=>ordered[i++]);}
 html=html.replace(/<a\b[^>]*class="category-card(?: [^"]*)?"[^>]*>[\s\S]*?<\/a>/g,card=>{
  const item=byId.get(idOf(card));if(!item?.cover)return card;
  const c=categories.find(c=>c.id===item.id),lang=path.startsWith('/en/')||path==='/'?1:path.startsWith('/fr/')?2:0;
  return card.replace(/(<div class="card-image">)[\s\S]*?(<span class="round-arrow")/,'$1'+`<img src="${esc(item.cover)}" alt="${esc(c.name[lang])}" loading="lazy" width="900" height="562">`+'$2');
 });
 html=sorted(html,/<a\b[^>]*class="category-card(?: [^"]*)?"[^>]*>[\s\S]*?<\/a>/g);
 // Keep “all categories” first when sorting the filter options.
 html=html.replace(/(<select\b[^>]*data-work-category[^>]*>)([\s\S]*?)(<\/select>)/g,(_,open,body,close)=>{const all=body.match(/<option value="all">[\s\S]*?<\/option>/)?.[0]||'';return open+all+sorted(body.replace(all,''),/<option\b[^>]*>[\s\S]*?<\/option>/g)+close;});
 html=html.replace(/(<div class="(?:category-switch|capability-links)">)([\s\S]*?)(<\/div>)/g,(_,open,body,close)=>open+sorted(body,/<a\b[^>]*>[\s\S]*?<\/a>/g)+close);
 if(current&&byId.get(current)?.cover)html=html.replace(/(<figure class="chapter-visual[^"]*"[^>]*>[\s\S]*?<img\b[^>]*\bsrc=")[^"]*(")/,'$1'+esc(byId.get(current).cover)+'$2');
 return html;
}
