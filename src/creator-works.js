(()=>{'use strict';
 const $=s=>document.querySelector(s),dialog=$('#creator-works-dialog'),form=$('#creator-works-form');if(!dialog)return;
 let creator=null,works=[],selected=new Set(),replacing=false,loading=false,saving=false,sequence=0,controller=null,requestedId=null;
 const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),team='aurovoy-team';
 const status=(text,error=false)=>{const e=$('#creator-works-status');e.textContent=text;e.classList.toggle('error',error);};
 const original=w=>w.creatorIds.includes(creator.id);
 const delta=()=>!creator?[]:works.filter(w=>selected.has(w.id)!==original(w)||(selected.has(w.id)&&(replacing||creator.id===team)&&(w.creatorIds.length!==1||w.creatorIds[0]!==creator.id))).map(w=>({id:w.id,updatedAt:w.updatedAt,selected:selected.has(w.id)}));
 const dirty=()=>delta().length>0;
 function visible(){const q=$('#creator-works-search').value.trim().toLowerCase(),cat=$('#creator-works-category').value,mode=$('#creator-works-filter').value;return works.filter(w=>(!q||w.titles.join(' ').toLowerCase().includes(q))&&(cat==='all'||w.category===cat)&&(mode==='all'||(mode==='selected')===selected.has(w.id)));}
 const fixed=w=>creator?.id===team&&original(w);
 function render(){
  const focused=document.activeElement?.dataset.creatorWork;
  const rows=visible();$('#creator-works-list').innerHTML=rows.map(w=>`<label class="creator-work-row"><input type="checkbox" data-creator-work="${esc(w.id)}" ${selected.has(w.id)?'checked':''} ${loading||saving||fixed(w)?'disabled':''}><img src="${esc(w.poster||'/assets/mark.png')}" alt="" loading="lazy"><span><strong>${esc(w.titles[0])}</strong><small>${esc(w.zoneName)} · ${w.status==='published'?'已上架':'未上架'}</small></span></label>`).join('')||'<p class="admin-tip">没有符合条件的作品</p>';
  $('#creator-works-count').textContent=`已选 ${selected.size} 部 · 当前显示 ${rows.length} 部 · 待保存 ${delta().length} 部`;
  $('#creator-works-save').disabled=loading||saving||!dirty();
  if(focused)[...form.querySelectorAll('[data-creator-work]')].find(e=>e.dataset.creatorWork===focused)?.focus();
 }
 function lock(value){for(const e of form.querySelectorAll('input,select,button'))e.disabled=value;if(!saving){$('#creator-works-close').disabled=false;$('#creator-works-cancel').disabled=false;}if(!value)render();}
 async function api(id,options={}){const r=await fetch('/api/admin/content/creators/'+encodeURIComponent(id)+'/works',{...options,headers:{'Content-Type':'application/json','X-Aurovoy-Admin':'1'}});let data;try{data=await r.json();}catch{throw Error('服务器暂时无法响应，请稍后重试');}if(!r.ok)throw Error(data.error||'操作未完成');return data;}
 async function load(id){
  controller?.abort();controller=new AbortController();const run=++sequence;requestedId=id;creator=null;works=[];selected.clear();replacing=false;loading=true;$('#creator-works-list').innerHTML='';$('#creator-works-count').textContent='';$('#creator-works-title').textContent='管理关联作品';lock(true);status('正在读取作品…');
  try{const data=await api(id,{signal:controller.signal});if(run!==sequence)return;
   creator=data.creator;const zones=new Map(data.categories.map(c=>[c.id,c.name]));works=data.works.map(w=>({...w,zoneName:zones.get(w.category)||w.category}));selected=new Set(works.filter(original).map(w=>w.id));replacing=false;
   $('#creator-works-title').textContent='管理关联作品 · '+creator.name[0];$('#creator-works-person').innerHTML=data.creators.map(c=>`<option value="${esc(c.id)}" ${c.id===id?'selected':''}>${esc(c.name[0])}${c.status==='draft'?'（暂未公开）':''}</option>`).join('');
   $('#creator-works-search').value='';$('#creator-works-filter').value='all';$('#creator-works-category').innerHTML='<option value="all">全部分区</option>'+data.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');$('#creator-works-replace').checked=false;
   $('#creator-works-note').textContent=id===team?'团队为默认归属。已归团队的作品，请在个人创作者处勾选分配；勾选其他作品会改为仅归团队。':creator.status==='draft'?'这位创作者尚未公开，关联会保留；公开创作者资料后，官网才会显示其姓名。':'勾选会保留共同作者；取消只移除当前作者。无个人作者时自动归团队，未上架作品也可以关联。';status('');
  }catch(e){if(e.name!=='AbortError'&&run===sequence)status(e.message,true);}finally{if(run===sequence){loading=false;lock(false);if(!creator)$('#creator-works-save').disabled=true;}}
 }
 function close(){if(saving)return;if(!loading&&dirty()&&!confirm('有关联作品更改尚未保存，确定关闭吗？'))return;sequence++;controller?.abort();loading=false;dialog.close();creator=null;works=[];selected.clear();}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-creator-works]');if(!b)return;if(dialog.open||saving)return;creator=null;works=[];selected.clear();$('#creator-works-list').innerHTML='';$('#creator-works-count').textContent='';$('#creator-works-title').textContent='管理关联作品';dialog.showModal();load(b.dataset.creatorWorks);});
 $('#creator-works-close').addEventListener('click',close);$('#creator-works-cancel').addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 $('#creator-works-person').addEventListener('change',e=>{if(dirty()&&!confirm('当前关联更改尚未保存，确定切换创作者吗？')){e.target.value=creator.id;return;}load(e.target.value);});
 $('#creator-works-reload').addEventListener('click',()=>{if(dirty()&&!confirm('重新读取会放弃尚未保存的关联更改，确定继续吗？'))return;load(requestedId);});
 for(const selector of ['#creator-works-search','#creator-works-category','#creator-works-filter'])$(selector).addEventListener(selector.endsWith('search')?'input':'change',render);
 $('#creator-works-search').addEventListener('keydown',e=>{if(e.key==='Enter')e.preventDefault();});
 $('#creator-works-list').addEventListener('change',e=>{const id=e.target.dataset.creatorWork;if(!id||saving||loading)return;e.target.checked?selected.add(id):selected.delete(id);render();});
 for(const [selector,value] of [['#creator-works-select',true],['#creator-works-clear',false]])$(selector).addEventListener('click',()=>{for(const w of visible())if(!fixed(w))value?selected.add(w.id):selected.delete(w.id);render();});
 $('#creator-works-replace').addEventListener('change',e=>{replacing=e.target.checked;render();});
 let timer;const toast=document.createElement('div');toast.className='save-toast';toast.setAttribute('role','status');toast.hidden=true;document.body.append(toast);
 form.addEventListener('submit',async e=>{e.preventDefault();if(loading||saving||!dirty())return;saving=true;lock(true);status('正在保存关联并同步…');
  try{await api(creator.id,{method:'PUT',body:JSON.stringify({creatorRevision:creator.revision,replaceOthers:replacing,items:delta()})});creator=null;works=[];selected.clear();dialog.close();clearTimeout(timer);toast.textContent='已保存';toast.hidden=false;timer=setTimeout(()=>{toast.hidden=true;toast.textContent='';},1000);}
  catch(err){status(err.message,true);}finally{saving=false;lock(false);}
 });
 window.addEventListener('beforeunload',e=>{if(dirty()||saving){e.preventDefault();e.returnValue='';}});
})();
