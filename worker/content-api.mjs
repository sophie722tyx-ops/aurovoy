import {entries,entry,writeEntry,validateEntry,failure} from './content-store.mjs';
import {db} from './repository.mjs';
import {localize} from './localize.mjs';
import {identity,isAdmin,assertWrite} from './auth.mjs';
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
async function input(r){const len=Number(r.headers.get('content-length'));if(len>200000)failure('内容过长',413);const text=await r.text();if(text.length>200000)failure('内容过长',413);try{return JSON.parse(text);}catch{failure('表单格式无效');}}
export async function contentApi(request,env){
 if(!isAdmin(request,env))return json({error:'请使用管理员账号登录'},identity(request,env)?403:401);if(request.method!=='GET')assertWrite(request);
 const m=new URL(request.url).pathname.match(/^\/api\/admin\/content\/(mentors|courses)(?:\/([a-z0-9-]+))?(?:\/(photo|status))?$/);if(!m)return json({error:'请求不存在'},404);
 const [,kind,id,action]=m,user=identity(request,env).id;
 if(!id&&request.method==='GET')return json({items:await entries(env,kind,true)});
 if(!id&&kind==='mentors'&&request.method==='POST'){const blank=()=>['','',''];return json(await writeEntry(env,{id:crypto.randomUUID(),kind,name:['新导师','',''],role:blank(),bio:blank(),tags:blank(),biography:blank(),highlights:blank(),teaching:blank(),photo:'',status:'draft',order:0},user),201);}
 const current=id?await entry(env,kind,id):null;if(!current||current.status==='deleted')return json({error:'内容不存在'},404);
 if(action==='photo'&&request.method==='PUT'){
  if(request.headers.get('x-content-revision')!==current.revision)failure('资料已更新 请重新打开后上传',409);
  const type=request.headers.get('content-type'),size=Number(request.headers.get('content-length'));if(!['image/jpeg','image/png','image/webp'].includes(type)||!Number.isInteger(size)||size<12||size>10*1024*1024)failure('请上传 10 MB 以内的 JPG PNG 或 WebP 图片');
  const bytes=new Uint8Array(await request.arrayBuffer()),str=(a,n)=>String.fromCharCode(...bytes.slice(a,a+n));
  const valid=type==='image/png'?bytes[0]===137&&str(1,3)==='PNG':type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:str(0,4)==='RIFF'&&str(8,4)==='WEBP';if(bytes.length!==size||!valid)failure('图片内容与文件格式不匹配');
  const imageId=crypto.randomUUID(),key=`content/${kind}/${id}/${imageId}`;
  await env.FILES.put(key,bytes,{httpMetadata:{contentType:type}});
  try{await db(env).prepare('INSERT INTO content_images(id,entry_key,object_key,content_type) VALUES(?,?,?,?)').bind(imageId,`${kind}:${id}`,key,type).run();return json(await writeEntry(env,{...current,photo:`/content-media/${imageId}`},user,current.revision));}
  catch(error){await env.FILES.delete(key);await db(env).prepare('DELETE FROM content_images WHERE id=?').bind(imageId).run();throw error;}
 }
 if(request.method==='PUT'||request.method==='PATCH'||request.method==='DELETE'){
  const data=await input(request);if(data.revision!==current.revision)failure('内容已更新 请重新打开后编辑',409);
  if(request.method==='DELETE'){if(kind!=='mentors')failure('课程可隐藏 不能移除');return json(await writeEntry(env,{...current,status:'deleted'},user,current.revision));}
  let item=validateEntry(action==='status'?{...current,status:data.status}:data,current);if(!action&&data.autoTranslate===true)item=validateEntry(await localize(item,current,env),current);return json(await writeEntry(env,item,user,current.revision));
 }
 return json({error:'请求不存在'},404);
}
export async function contentImage(request,env,id){
 const image=await db(env).prepare('SELECT * FROM content_images WHERE id=?').bind(id).first();if(!image)return new Response('Not found',{status:404});const [kind,entryId]=image.entry_key.split(':');const item=await entry(env,kind,entryId);
 if(!item||item.status==='deleted'||item.photo!==`/content-media/${id}`||(item.status!=='published'&&!isAdmin(request,env)))return new Response('Not found',{status:404});
 const object=await env.FILES.get(image.object_key);if(!object)return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:object.body,{headers:{'Content-Type':image.content_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'}});
}
