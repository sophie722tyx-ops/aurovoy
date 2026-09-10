import {allWorks,getWork,saveWork,reorderWorks,categories,db} from './repository.mjs';
import {identity,isAdmin,assertWrite} from './auth.mjs';
import {localize} from './localize.mjs';
export const CHUNK=8*1024*1024,MAX_VIDEO=500*1024*1024,MAX_IMAGE=10*1024*1024;
export const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
async function input(request){const s=await request.text();if(s.length>20000)fail('表单内容过长',413);try{return JSON.parse(s);}catch{fail('无法读取表单');}}
function strings(value,max,required=false){if(!Array.isArray(value)||value.length!==3||value.some(s=>typeof s!=='string'||s.length>max))fail('请检查三语文本长度');const out=value.map(s=>s.trim());if(required&&!out[0])fail('请填写中文标题');return out;}
export function validateWork(data,current){
 const titles=strings(data.titles,160,true),descriptions=strings(data.descriptions,2500);
 if(!categories.some(c=>c.id===data.category))fail('请选择有效的作品分类');
 if(!['landscape','portrait'].includes(data.orientation))fail('请选择画面方向');
 if(!['draft','published'].includes(data.status))fail('发布状态无效');
 if(!Number.isInteger(data.order)||Math.abs(data.order)>999999)fail('排序应为整数');
 if(data.status==='published'&&(!current.video||!current.poster))fail('发布前请上传视频和封面');
 return {...current,titles,descriptions,category:data.category,orientation:data.orientation,status:data.status,order:data.order,hasBeenPublished:!!current.hasBeenPublished||current.status==='published'||data.status==='published'};
}
function mediaSignature(bytes,type){const a=new Uint8Array(bytes),text=(i,n)=>String.fromCharCode(...a.slice(i,i+n));return type==='video/mp4'?text(4,4)==='ftyp':type==='image/png'?a[0]===137&&text(1,3)==='PNG':type==='image/jpeg'?a[0]===255&&a[1]===216&&a[2]===255:type==='image/webp'?text(0,4)==='RIFF'&&text(8,4)==='WEBP':false;}
export async function adminApi(request,env){
 if(!isAdmin(request,env))return json({error:identity(request,env)?'此账号没有管理权限':'请先登录'},identity(request,env)?403:401);
 const user=identity(request,env),url=new URL(request.url),p=url.pathname;
 if(request.method!=='GET')assertWrite(request);
 if(p==='/api/admin/works'&&request.method==='GET')return json({works:await allWorks(env,true),categories:categories.map(c=>({id:c.id,name:c.name[0]})),email:user.email});
 if(p==='/api/admin/works'&&request.method==='POST'){
  const w={id:crypto.randomUUID(),titles:['未命名作品','',''],descriptions:['','',''],category:'brand',orientation:'landscape',video:'',poster:'',status:'draft',order:0};
  return json(await saveWork(env,w,user.id),201);
 }
 if(p==='/api/admin/works/reorder'&&request.method==='PUT'){
  const data=await input(request);
  if(!categories.some(c=>c.id===data.category)||!['landscape','portrait'].includes(data.orientation))fail('请选择有效的分区和画面方向');
  if(!Array.isArray(data.items)||!data.items.length||data.items.some(x=>!x||typeof x.id!=='string'||typeof x.updatedAt!=='string')||new Set(data.items.map(x=>x.id)).size!==data.items.length)fail('作品顺序无效');
  return json({works:await reorderWorks(env,data,user.id)});
 }
 const statusMatch=p.match(/^\/api\/admin\/works\/([a-z0-9-]+)\/status$/);
 if(statusMatch&&request.method==='PATCH'){
  const current=await getWork(env,statusMatch[1]);if(!current)fail('作品不存在',404);
  const data=await input(request);if(data.updatedAt!==current.updatedAt)fail('作品状态已改变 请刷新列表后重试',409);
  return json(await saveWork(env,validateWork({...current,status:data.status,category:data.status==='published'?(data.category??current.category):current.category},current),user.id));
 }
 const categoryMatch=p.match(/^\/api\/admin\/works\/([a-z0-9-]+)\/category$/);
 if(categoryMatch&&request.method==='PATCH'){
  const current=await getWork(env,categoryMatch[1]);if(!current)fail('作品不存在',404);
  const data=await input(request);if(data.updatedAt!==current.updatedAt)fail('作品已更新 请刷新后重试',409);
  return json(await saveWork(env,validateWork({...current,category:data.category},current),user.id,current.updatedAt));
 }
 const workMatch=p.match(/^\/api\/admin\/works\/([a-z0-9-]+)$/);
 if(workMatch&&request.method==='PUT'){
  const current=await getWork(env,workMatch[1]);if(!current)fail('作品不存在',404);
  const data=await input(request);if(data.updatedAt!==current.updatedAt)fail('作品已在其他窗口修改 请刷新后再编辑',409);
  let item=validateWork(data,current);
  if(data.autoTranslate===true)item=validateWork(await localize(item,current,env),current);
  return json(await saveWork(env,item,user.id,current.updatedAt));
 }
 if(p==='/api/admin/uploads'&&request.method==='POST'){
  const data=await input(request),w=await getWork(env,data.workId);if(!w)fail('请先保存作品',404);
  if(w.status!=='draft')fail('请先将作品下架为草稿 再替换文件');
  const types=data.kind==='video'?['video/mp4']:data.kind==='poster'?['image/png','image/jpeg','image/webp']:[];
  if(!types.includes(data.type))fail('视频请使用 MP4 封面请使用 JPG PNG 或 WebP');
  if(!Number.isInteger(data.size)||data.size<12||data.size>(data.kind==='video'?MAX_VIDEO:MAX_IMAGE))fail('视频最大 500 MB 封面最大 10 MB',413);
  const pending=await db(env).prepare("SELECT COUNT(*) AS n FROM uploads WHERE owner=? AND state='pending' AND created_at>?").bind(user.id,new Date(Date.now()-86400000).toISOString()).first();if(pending.n>=15)fail('待完成上传过多 请先完成或取消上传');
  const id=crypto.randomUUID(),key=`works/${data.workId}/${id}`,multi=data.kind==='video'?await env.FILES.createMultipartUpload(key,{httpMetadata:{contentType:data.type}}):null;
  await db(env).prepare('INSERT INTO uploads(id,work_id,kind,object_key,upload_id,content_type,size,owner,state,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,data.workId,data.kind,key,multi?.uploadId??null,data.type,data.size,user.id,'pending',new Date().toISOString()).run();
  return json({id,chunkSize:CHUNK},201);
 }
 const m=p.match(/^\/api\/admin\/uploads\/([a-z0-9-]+)(?:\/(\d+|complete))?$/);
 if(m){
  const upload=await db(env).prepare('SELECT * FROM uploads WHERE id=? AND owner=?').bind(m[1],user.id).first();if(!upload)fail('上传任务不存在',404);
  if(request.method==='DELETE'){
   if(upload.state==='pending'&&upload.upload_id)await env.FILES.resumeMultipartUpload(upload.object_key,upload.upload_id).abort().catch(()=>{});
   if(upload.state==='pending')await env.FILES.delete(upload.object_key);
   await db(env).prepare("UPDATE uploads SET state='cancelled' WHERE id=? AND state='pending'").bind(upload.id).run();return json({ok:true});
  }
  if(upload.state==='complete'&&m[2]==='complete')return json(await getWork(env,upload.work_id));
  if(upload.state!=='pending')fail('上传已结束');
  if(m[2]==='complete'&&request.method==='POST'){
   const work=await getWork(env,upload.work_id);if(!work||work.status!=='draft')fail('请先将作品下架为草稿');
   if(upload.upload_id){
    const {results}=await db(env).prepare('SELECT part_number,etag,size FROM upload_parts WHERE upload_ref=? ORDER BY part_number').bind(upload.id).all();
    if(results.length!==Math.ceil(upload.size/CHUNK)||results.reduce((s,r)=>s+r.size,0)!==upload.size||results.some((r,i)=>r.part_number!==i+1))fail('文件尚未上传完整');
    // A previous completion may have reached R2 before a transient DB failure.
    if(!(await env.FILES.head(upload.object_key)))await env.FILES.resumeMultipartUpload(upload.object_key,upload.upload_id).complete(results.map(r=>({partNumber:r.part_number,etag:r.etag})));
   }
   const object=await env.FILES.head(upload.object_key);if(!object||object.size!==upload.size)fail('文件大小不一致 请重新上传');
   const result=await saveWork(env,{...work,[upload.kind==='video'?'video':'poster']:`/media/${upload.id}`},user.id);
   await db(env).prepare("UPDATE uploads SET state='complete' WHERE id=?").bind(upload.id).run();return json(result);
  }
  if(request.method==='PUT'&&/^\d+$/.test(m[2]||'')){
   const part=Number(m[2]),count=upload.upload_id?Math.ceil(upload.size/CHUNK):1;
   if(part<1||part>count)fail('文件分段无效');
   const expected=upload.upload_id?Math.min(CHUNK,upload.size-(part-1)*CHUNK):upload.size;
   const length=Number(request.headers.get('content-length'));if(length!==expected)fail('分段大小不匹配',413);
   const bytes=await request.arrayBuffer();if(bytes.byteLength!==expected)fail('文件传输不完整');
   if(part===1&&!mediaSignature(bytes,upload.content_type))fail('文件内容与格式不匹配');
   if(upload.upload_id){
    const result=await env.FILES.resumeMultipartUpload(upload.object_key,upload.upload_id).uploadPart(part,bytes);
    await db(env).prepare('INSERT INTO upload_parts(id,upload_ref,part_number,etag,size) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET etag=excluded.etag,size=excluded.size').bind(`${upload.id}:${part}`,upload.id,part,result.etag,bytes.byteLength).run();
   }else await env.FILES.put(upload.object_key,bytes,{httpMetadata:{contentType:upload.content_type}});
   return json({ok:true});
  }
 }
 return json({error:'请求不存在'},404);
}
export async function media(request,env,id){
 const row=await db(env).prepare("SELECT * FROM uploads WHERE id=? AND state='complete'").bind(id).first();if(!row)return new Response('Not found',{status:404});
 const work=await getWork(env,row.work_id),path=`/media/${id}`;
 if(!work||![work.video,work.poster].includes(path)||(work.status!=='published'&&!isAdmin(request,env)))return new Response('Not found',{status:404});
 const head=await env.FILES.head(row.object_key);if(!head)return new Response('Not found',{status:404});
 let range=null;const raw=request.headers.get('range');
 if(raw){const match=raw.match(/^bytes=(\d*)-(\d*)$/);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${head.size}`}});
  const start=match[1]?Number(match[1]):Math.max(0,head.size-Number(match[2]));const end=match[1]?(match[2]?Math.min(Number(match[2]),head.size-1):head.size-1):head.size-1;
  if(start>end||start>=head.size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${head.size}`}});range={offset:start,length:end-start+1};}
 const headers={'Content-Type':row.content_type,'Content-Length':String(range?.length??head.size),'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'};
 if(range)headers['Content-Range']=`bytes ${range.offset}-${range.offset+range.length-1}/${head.size}`;
 if(request.method==='HEAD')return new Response(null,{status:range?206:200,headers});
 const object=await env.FILES.get(row.object_key,range?{range}:undefined);return new Response(object.body,{status:range?206:200,headers});
}
