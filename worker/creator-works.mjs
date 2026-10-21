import {allWorks,categories,db} from './repository.mjs';
import {entries,entry,failure} from './content-store.mjs';
import {TEAM,TEAM_ID} from './creator-team.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const ids=w=>w.creatorIds?.length?[...w.creatorIds]:[TEAM_ID];
const summary=w=>({id:w.id,titles:w.titles,poster:w.poster,category:w.category,status:w.status,creatorIds:ids(w),updatedAt:w.updatedAt});
export async function creatorWorksApi(request,env,id,user){
 const creator=id===TEAM_ID?TEAM:await entry(env,'creators',id);
 if(!creator||creator.status==='deleted')failure('创作者不存在或已移除',404);
 if(request.method==='GET'){
  const [works,creators]=await Promise.all([allWorks(env,true),entries(env,'creators',true)]);
  return json({creator:{id,name:creator.name,status:creator.status,revision:creator.revision},creators:[TEAM,...creators].map(c=>({id:c.id,name:c.name,status:c.status})),works:works.map(summary),categories:categories.map(c=>({id:c.id,name:c.name[0]}))});
 }
 if(request.method!=='PUT')return json({error:'请求方法无效'},405);
 const raw=await request.text();if(raw.length>200000)failure('一次提交内容过多',413);
 let data;try{data=JSON.parse(raw);}catch{failure('无法读取关联作品设置');}
 if(!data||data.creatorRevision!==creator.revision)failure('创作者资料已更新，请重新读取后再保存',409);
 if(typeof data.replaceOthers!=='boolean'||!Array.isArray(data.items)||data.items.length>1000||data.items.some(x=>!x||typeof x.id!=='string'||typeof x.updatedAt!=='string'||typeof x.selected!=='boolean')||new Set(data.items.map(x=>x.id)).size!==data.items.length)failure('请检查批量关联的作品设置');
 // The initial snapshot plus one guarded SQL statement keeps the entire batch atomic.
 const {results:snapshot}=await db(env).prepare('SELECT id,updated_at FROM works').all();
 const works=await allWorks(env,true),byId=new Map(works.map(w=>[w.id,w])),changed=[];
 for(const item of data.items){
  const w=byId.get(item.id);if(!w)failure('所选作品不存在，请重新读取',404);
  if(w.updatedAt!==item.updatedAt)failure('部分作品已在其他窗口修改，尚未保存任何更改。请重新读取后再试',409);
  const before=ids(w);let next;
  if(item.selected)next=id===TEAM_ID||data.replaceOthers?[id]:[...new Set([...before.filter(x=>x!==TEAM_ID),id])];
  else{if(id===TEAM_ID&&before.includes(id))failure('团队是默认归属，请在个人创作者处为这些作品重新分配作者');next=before.filter(x=>x!==id);if(!next.length)next=[TEAM_ID];}
  if(next.length>12)failure('部分作品的共同作者超过 12 位，尚未保存任何更改');
  if(JSON.stringify(before)!==JSON.stringify(next))changed.push({...w,creatorIds:next});
 }
 if(!changed.length)return json({updated:0});
 const now=new Date().toISOString(),records=changed.map(w=>({...w,updatedAt:now})),snap=JSON.stringify(snapshot);
 const result=await db(env).prepare(`INSERT INTO works(id,data,status,updated_at,updated_by)
 SELECT json_extract(value,'$.id'),value,json_extract(value,'$.status'),?,? FROM json_each(?)
 WHERE (SELECT COUNT(*) FROM works)=json_array_length(?) AND NOT EXISTS (
 SELECT 1 FROM works w LEFT JOIN json_each(?) old ON json_extract(old.value,'$.id')=w.id
 WHERE old.value IS NULL OR json_extract(old.value,'$.updated_at')<>w.updated_at)
 AND (?=? OR EXISTS (SELECT 1 FROM content_entries WHERE key=? AND revision=? AND json_extract(data,'$.status')<>'deleted'))
 ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status,updated_at=excluded.updated_at,updated_by=excluded.updated_by`)
 .bind(now,user,JSON.stringify(records),snap,snap,id,TEAM_ID,'creators:'+id,creator.revision).run();
 if((result.meta?.changes??result.changes)!==records.length)failure('作品或创作者资料刚刚发生变化，尚未保存任何更改。请重新读取后再试',409);
 return json({updated:records.length});
}
export const creatorWorksDialog=`<dialog id="creator-works-dialog" aria-labelledby="creator-works-title"><form id="creator-works-form"><div class="creator-works-heading"><div><p class="eyebrow">CREATOR / WORKS</p><h2 id="creator-works-title">管理关联作品</h2></div><button type="button" id="creator-works-close" aria-label="关闭关联作品">×</button></div><p class="admin-tip">批量勾选或取消关联，保存后同步到作品管理与官网。</p><label>当前创作者<select id="creator-works-person"></select></label><div class="creator-works-filters"><label>查找作品<input type="search" id="creator-works-search" placeholder="输入作品名称"></label><label>作品分区<select id="creator-works-category"><option value="all">全部分区</option></select></label><label>关联情况<select id="creator-works-filter"><option value="all">全部作品</option><option value="selected">已关联</option><option value="unselected">未关联</option></select></label></div><div class="creator-works-tools"><button type="button" id="creator-works-select">全选当前结果</button><button type="button" id="creator-works-clear">取消当前结果</button><button type="button" id="creator-works-reload">重新读取</button><span id="creator-works-count" role="status"></span></div><div id="creator-works-list" class="creator-works-list"></div><label class="creator-works-replace"><input type="checkbox" id="creator-works-replace"> 将勾选作品设为仅此创作者（移除其他共同作者）</label><p id="creator-works-note" class="admin-tip"></p><p id="creator-works-status" role="status" aria-live="polite"></p><div class="publication-actions"><button type="button" id="creator-works-cancel">取消</button><button class="primary" id="creator-works-save" type="submit">保存关联并同步</button></div></form></dialog><script src="/creator-works.js" defer></script>`;
