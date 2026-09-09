import {mentors,courses} from '../content.mjs';
import {mentorDetails} from '../mentor-details.mjs';
import {curricula,courseCases} from '../course-details.mjs';
import {db} from './repository.mjs';
export const baselineContent={
 mentors:mentors.map((m,i)=>({id:m.id,kind:'mentors',name:m.name,role:m.role,bio:m.bio,tags:m.tags.map(a=>a.join('\n')),biography:[0,1,2].map(l=>mentorDetails[m.id].paragraphs.map(p=>p[l]).join('\n\n')),highlights:mentorDetails[m.id].highlights.map(a=>a.join('\n')),teaching:mentorDetails[m.id].teaching.map(a=>a.join('\n')),photo:`/assets/mentor-${m.id}.webp`,status:'published',order:i,revision:'baseline'})),
 courses:courses.map((c,i)=>({...c,kind:'courses',results:c.results.map(a=>a.join('\n')),photo:`/assets/case-${courseCases[c.id].asset}.webp`,modules:curricula[c.id].map(row=>Object.fromEntries(['title','lesson','exercise','outcome'].map((k,n)=>[k,[0,1,2].map(l=>row[l][n])]))),status:'published',order:i,revision:'baseline'}))
};
export const failure=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export async function entries(env,kind,all=false){
 const map=new Map(baselineContent[kind].map(x=>[x.id,x]));const {results}=await db(env).prepare('SELECT data,revision,updated_at FROM content_entries WHERE kind=?').bind(kind).all();
 for(const row of results){const item=JSON.parse(row.data);map.set(item.id,{...item,revision:row.revision,updatedAt:row.updated_at});}
 return [...map.values()].filter(x=>all?x.status!=='deleted':x.status==='published').sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
}
export async function entry(env,kind,id){const row=await db(env).prepare('SELECT data,revision,updated_at FROM content_entries WHERE key=?').bind(`${kind}:${id}`).first();return row?{...JSON.parse(row.data),revision:row.revision,updatedAt:row.updated_at}:baselineContent[kind].find(x=>x.id===id);}
export async function writeEntry(env,item,user,expected){
 const revision=crypto.randomUUID(),now=new Date().toISOString(),key=`${item.kind}:${item.id}`,record={...item,revision,updatedAt:now};
 const result=await db(env).prepare('INSERT INTO content_entries(key,kind,data,revision,updated_at,updated_by) VALUES(?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,revision=excluded.revision,updated_at=excluded.updated_at,updated_by=excluded.updated_by WHERE content_entries.revision=?').bind(key,item.kind,JSON.stringify(record),revision,now,user,expected??'new').run();
 if((result.meta?.changes??result.changes)!==1)failure('内容已在其他窗口更新 请重新打开后编辑',409);return record;
}
const tri=(v,max,required=false)=>{if(!Array.isArray(v)||v.length!==3||v.some(s=>typeof s!=='string'||s.length>max))failure('请检查三语内容长度');const a=v.map(s=>s.trim());if(required&&!a[0])failure('请填写中文名称');return a;};
export function validateEntry(data,current){
 if(!['draft','published'].includes(data.status))failure('请选择显示状态');if(!Number.isInteger(data.order)||Math.abs(data.order)>999999)failure('排序应为整数');
 const item={...current,name:tri(data.name,180,true),status:data.status,order:data.order};
 if(current.kind==='mentors'){
  for(const [key,max] of Object.entries({role:300,bio:1500,tags:1000,biography:12000,highlights:4000,teaching:4000}))item[key]=tri(data[key],max);
  if(item.status==='published'&&(!item.photo||!item.role[0]||!item.biography[0]))failure('公开导师前请补充照片 职务和中文详细介绍');
 }else{
  for(const [key,max] of Object.entries({time:150,desc:3000,audience:3000,results:5000}))item[key]=tri(data[key],max);
  if(!Array.isArray(data.modules)||data.modules.length>40)failure('大纲最多可包含 40 个模块');
  item.modules=data.modules.map(m=>Object.fromEntries(['title','lesson','exercise','outcome'].map(k=>[k,tri(m[k],k==='title'?200:4000,k==='title')])));
  if(item.status==='published'&&(!item.desc[0]||!item.modules.length))failure('公开课程前请填写简介和至少一个大纲模块');
 }
 return item;
}
