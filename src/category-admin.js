(()=>{
 'use strict';
 const $=selector=>document.querySelector(selector),list=$('#category-list'),status=$('#category-status');
 const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 let items=[],revision='',baseline='',ready=false,loading=false,saving=false,toastTimer,dropResets=[];
 const uploads=new Set(),rowMessages=new Map();
 const signature=()=>JSON.stringify(items.map(item=>({id:item.id,cover:item.customCover||''})));
 const dirty=()=>ready&&signature()!==baseline;
 const busy=()=>loading||saving||uploads.size>0;
 function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
 async function api(path,options={}){
  const response=await fetch('/api/admin/categories'+path,{...options,headers:{'X-Aurovoy-Admin':'1',...options.headers}});
  let data;try{data=await response.json();}catch{throw Error('服务器暂时无法响应，请稍后重试');}
  if(!response.ok)throw Error(data.error||'操作未成功，请重试');return data;
 }
 function accept(data){
  if(!data||typeof data.revision!=='string'||!Array.isArray(data.items)||!data.items.length)throw Error('分区资料不完整，请重新读取');
  items=data.items.map(item=>({...item,customCover:item.customCover||'',defaultCover:item.defaultCover||item.cover}));revision=data.revision;ready=true;baseline=signature();rowMessages.clear();
 }
 function lock(){
  const blocked=busy();$('#category-reload').disabled=blocked;
  $('#category-save').disabled=blocked||!dirty();$('#category-save').textContent=saving?'正在保存…':'保存并同步';
  list.setAttribute('aria-busy',String(loading||saving));
  for(const row of list.children){
   const item=items.find(value=>value.id===row.dataset.categoryId),index=items.indexOf(item);
   row.querySelector('input').disabled=blocked;
   const zone=row.querySelector('.category-cover-drop');zone.setAttribute('aria-disabled',String(blocked));zone.setAttribute('aria-busy',String(uploads.has(item.id)));
   for(const button of row.querySelectorAll('button')){const action=button.dataset.categoryAction;button.disabled=blocked||(action==='default'&&!item.customCover)||(['top','up'].includes(action)&&index===0)||(action==='down'&&index===items.length-1);}
  }
  $('#category-save-summary').textContent=loading?'正在读取':saving?'正在同步':uploads.size?'封面正在上传…':dirty()?'有未保存的修改':ready?`${items.length} 个分区 · 已同步`:'暂未读取分区';
 }
 function render(focusId,action){
  dropResets.forEach(reset=>reset());dropResets=[];
  list.innerHTML=items.map((item,index)=>{
   const note=rowMessages.get(item.id),label=escape(item.name),id=escape(item.id);
   return `<li class="category-row" data-category-id="${id}"><span class="category-position" aria-label="第 ${index+1} 位">${String(index+1).padStart(2,'0')}</span><label class="category-cover-drop media-drop-zone"><img src="${escape(item.cover)}" alt="${label}分区封面"><span>点击或拖入新封面</span><input class="category-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="更换${label}封面"></label><div class="category-row-copy"><h2>${label}</h2><span class="category-cover-kind">${item.customCover?'自定义封面':'默认封面'}</span><p class="category-row-status${note?.error?' error':''}" role="status" aria-live="polite">${escape(note?.text||'')}</p></div><div class="category-row-actions"><div class="category-move-actions">${[['top','置顶'],['up','上移'],['down','下移']].map(([key,text])=>`<button type="button" data-category-action="${key}" aria-label="${text}：${label}">${text}</button>`).join('')}</div><button type="button" data-category-action="default" class="category-restore" aria-label="恢复${label}默认封面">恢复默认封面</button></div></li>`;
  }).join('');
  for(const row of list.children){
   const id=row.dataset.categoryId;
   dropResets.push(globalThis.AurovoyUploads.bindDropZone({zone:row.querySelector('.category-cover-drop'),input:row.querySelector('input'),kind:'poster',blocked:()=>busy()?'正在处理，请稍后再上传':'',onFile:file=>upload(id,file),onError:text=>{rowMessages.set(id,{text,error:true});const note=row.querySelector('.category-row-status');note.textContent=text;note.classList.add('error');}}));
  }
  lock();
  if(focusId){const row=[...list.children].find(row=>row.dataset.categoryId===focusId);(row?.querySelector(`button[data-category-action="${action}"]:not(:disabled)`)||row?.querySelector('button:not(:disabled)')||row?.querySelector('input'))?.focus();}
 }
 async function load(){
  if(busy())return;
  if(dirty()&&!confirm('当前修改尚未保存，重新读取会放弃这些修改。确定继续吗？'))return;
  loading=true;lock();message('正在读取分区…');
  try{accept(await api(''));message('分区已同步，可以调整顺序或更换封面');}
  catch(error){message(error.message,true);}
  finally{loading=false;render();}
 }
 async function upload(id,file){
  if(busy())return;
  uploads.add(id);rowMessages.set(id,{text:'正在上传封面…'});render();
  try{
   const result=await api('/'+encodeURIComponent(id)+'/cover',{method:'POST',headers:{'Content-Type':file.type},body:file});
   if(typeof result.cover!=='string'||!/^\/category-media\/[a-z0-9-]+$/.test(result.cover))throw Error('上传结果无效，请重试');
   const item=items.find(value=>value.id===id);item.customCover=result.cover;item.cover=result.cover;rowMessages.set(id,{text:'新封面已准备好，保存后生效'});message('封面已上传，请点击「保存并同步」完成修改');
  }catch(error){rowMessages.set(id,{text:error.message,error:true});message('封面未能上传，已保留当前修改',true);}
  finally{uploads.delete(id);render(id,'default');}
 }
 list.addEventListener('click',event=>{
  const button=event.target.closest('[data-category-action]');if(!button||busy())return;
  const row=button.closest('[data-category-id]'),index=items.findIndex(item=>item.id===row.dataset.categoryId),action=button.dataset.categoryAction;if(index<0)return;
  const item=items[index];
  if(action==='default'){item.customCover='';item.cover=item.defaultCover;rowMessages.set(item.id,{text:'已恢复默认封面，保存后生效'});}
  else{const target=action==='top'?0:action==='up'?index-1:action==='down'?index+1:-1;if(target<0||target>=items.length||target===index)return;items.splice(index,1);items.splice(target,0,item);message(`「${item.name}」已移至第 ${target+1} 位，保存后生效`);}
  render(item.id,action);
 });
 $('#category-save').addEventListener('click',async()=>{
  if(busy()||!dirty())return;saving=true;lock();message('正在保存并同步分区…');
  try{
   const data=await api('',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,items:items.map(item=>({id:item.id,cover:item.customCover||''}))})});
   accept(data);message('分区顺序与封面已保存，中英法官网已同步');clearTimeout(toastTimer);$('#category-toast').textContent='已保存';$('#category-toast').hidden=false;toastTimer=setTimeout(()=>{$('#category-toast').hidden=true;$('#category-toast').textContent='';},1000);
  }catch(error){message(error.message,true);}
  finally{saving=false;render();}
 });
 $('#category-reload').addEventListener('click',load);
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');if(!link||event.defaultPrevented||link.target==='_blank'||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  if(busy()){event.preventDefault();message('正在上传或保存，请完成后再离开',true);return;}
  // Let the browser's beforeunload prompt protect normal same-tab navigation.
 });
 for(const type of ['dragover','drop'])document.addEventListener(type,event=>{if(!event.defaultPrevented&&globalThis.AurovoyUploads.hasFiles(event.dataTransfer)){event.preventDefault();if(type==='dragover')event.dataTransfer.dropEffect='none';else dropResets.forEach(reset=>reset());}});
 window.addEventListener('blur',()=>dropResets.forEach(reset=>reset()));
 window.addEventListener('beforeunload',event=>{if(dirty()||busy()){event.preventDefault();event.returnValue='';}});
 load();
})();
