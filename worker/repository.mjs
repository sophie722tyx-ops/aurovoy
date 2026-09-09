import {films,categories} from '../content.mjs';
import layout from '../media-layout.json' with {type:'json'};
export {categories};
export const baseline=films.map(f=>({id:`legacy-${f.id}`,titles:f.name,descriptions:['','',''],category:f.category,status:'published',orientation:layout[f.id].portrait?'portrait':'landscape',video:`/assets/film-${f.id}.mp4`,poster:`/assets/cover-${f.id}.webp`,order:f.id,updatedAt:'2026-09-08T00:00:00Z'}));
export const db=env=>{if(!env.DB)throw new Error('数据库尚未连接');return env.DB;};
export async function allWorks(env,includeDrafts=false){
 const {results}=await db(env).prepare('SELECT data, status, updated_at FROM works').all();
 const records=new Map(baseline.map(w=>[w.id,w]));
 for(const r of results)records.set(JSON.parse(r.data).id,{...JSON.parse(r.data),status:r.status,updatedAt:r.updated_at});
 return [...records.values()].filter(w=>includeDrafts||w.status==='published').sort((a,b)=>a.order-b.order||b.updatedAt.localeCompare(a.updatedAt));
}
export async function getWork(env,id){const row=await db(env).prepare('SELECT data,status,updated_at FROM works WHERE id=?').bind(id).first();return row?{...JSON.parse(row.data),status:row.status,updatedAt:row.updated_at}:baseline.find(w=>w.id===id);}
export async function saveWork(env,work,user){
 const now=new Date().toISOString();
 await db(env).prepare('INSERT INTO works(id,data,status,updated_at,updated_by) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status,updated_at=excluded.updated_at,updated_by=excluded.updated_by').bind(work.id,JSON.stringify(work),work.status,now,user).run();
 return {...work,updatedAt:now};
}
export const workPath=(w,lang='zh')=>`${lang==='zh'?'':`/${lang}`}/${w.id.startsWith('legacy-')?`work-${w.id.slice(7)}.html`:`work/${w.id}`}`;
