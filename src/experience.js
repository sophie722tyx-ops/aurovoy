(()=>{
 'use strict';
 const {matchesFilm,nextTab,makeBrief,mailDraft}=globalThis.AurovoyInteraction;
 const root=document.documentElement,lang=root.lang.split('-')[0],li={zh:0,en:1,fr:2}[lang]??0;
 const t=values=>values[li];
 const readPreference=key=>{try{return localStorage.getItem(key);}catch{return null;}};
 const writePreference=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
 const fine=matchMedia('(hover:hover) and (pointer:fine)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let motion=readPreference('aurovoy-motion')==='off'?false:!reduced.matches;
 let whale=readPreference('aurovoy-cursor')!=='off';
 const motionButton=document.querySelector('[data-motion-toggle]'),cursorButton=document.querySelector('[data-cursor-toggle]');
 const updatePreferences=()=>{
  root.classList.toggle('motion-off',!motion);
  root.classList.toggle('whale-cursor',whale&&fine.matches);
  if(motionButton){motionButton.setAttribute('aria-pressed',String(motion));motionButton.querySelector('span').textContent=motion?t(['已开启','On','Activés']):t(['已关闭','Off','Désactivés']);}
  if(cursorButton){cursorButton.hidden=!fine.matches;cursorButton.setAttribute('aria-pressed',String(whale));cursorButton.querySelector('span').textContent=whale?t(['已开启','On','Activé']):t(['已关闭','Off','Désactivé']);}
 };
 motionButton?.addEventListener('click',()=>{motion=!motion;writePreference('aurovoy-motion',motion?'on':'off');updatePreferences();});
 cursorButton?.addEventListener('click',()=>{whale=!whale;writePreference('aurovoy-cursor',whale?'on':'off');updatePreferences();});
 fine.addEventListener('change',updatePreferences);
 reduced.addEventListener('change',()=>{motion=!reduced.matches&&readPreference('aurovoy-motion')!=='off';updatePreferences();});
 updatePreferences();

 // Short, bounded effects never intercept input or run a continuous animation loop.
 const effects=document.createElement('div');effects.className='qiqi-effects';effects.setAttribute('aria-hidden','true');document.body.append(effects);
 const effectsEnabled=()=>motion&&whale&&!reduced.matches&&!document.hidden;
 let lastParticle=0,lastScrollEffect=0,lastClick=0,lastPoint=null,touchStart=null;
 const particle=(kind,x,y,dx=0,dy=0)=>{
  if(effects.childElementCount>=20)return;
  const dot=document.createElement('i');dot.className=`qiqi-${kind}`;
  dot.style.setProperty('--x',`${x}px`);dot.style.setProperty('--y',`${y}px`);
  dot.style.setProperty('--dx',`${dx}px`);dot.style.setProperty('--dy',`${dy}px`);
  effects.append(dot);dot.addEventListener('animationend',()=>dot.remove(),{once:true});setTimeout(()=>dot.remove(),800);
 };
 const splash=(x,y,touch=false)=>{
  if(!effectsEnabled())return;
  particle('ripple',x,y);particle('splash',x+(touch?0:22),y-16);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;particle('droplet',x,y,Math.cos(a)*26,Math.sin(a)*23-8);}
 };
 document.addEventListener('pointermove',event=>{
  if(event.pointerType!=='mouse'||!fine.matches)return;
  const now=performance.now(),previous=lastPoint;lastPoint={x:event.clientX,y:event.clientY};
  if(!effectsEnabled()||!previous||now-lastParticle<90||Math.hypot(lastPoint.x-previous.x,lastPoint.y-previous.y)<2)return;
  lastParticle=now;particle('droplet',event.clientX+21,event.clientY+20,-6,12);
 },{passive:true});
 document.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')touchStart={x:event.clientX,y:event.clientY,time:performance.now()};},{passive:true});
 document.addEventListener('pointerup',event=>{
  if(event.button!==0||!effectsEnabled())return;
  const now=performance.now();if(now-lastClick<230)return;
  if(event.pointerType==='touch'){
   const start=touchStart;touchStart=null;
   if(!start||now-start.time>550||Math.hypot(event.clientX-start.x,event.clientY-start.y)>12||!event.target.closest('a,button,summary'))return;
  }else if(!fine.matches)return;
  lastClick=now;splash(event.clientX,event.clientY,event.pointerType==='touch');
 },{passive:true});
 document.addEventListener('pointercancel',()=>{touchStart=null;},{passive:true});
 document.addEventListener('pointerleave',()=>{lastPoint=null;},{passive:true});
 window.addEventListener('scroll',()=>{
  const now=performance.now();if(!effectsEnabled()||!fine.matches||!lastPoint||now-lastScrollEffect<170)return;
  lastScrollEffect=now;particle('droplet',lastPoint.x+25,lastPoint.y+20,8,-25);
 },{passive:true});
 const clearEffects=()=>{if(!effectsEnabled())effects.replaceChildren();};
 new MutationObserver(clearEffects).observe(root,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{lastPoint=null;effects.replaceChildren();});
 reduced.addEventListener('change',clearEffects);

 document.querySelectorAll('[data-tabs]').forEach(group=>{
  const list=group.querySelector('[role=tablist]'),buttons=[...list.querySelectorAll('[role=tab]')];
  if(group.classList.contains('goal-board')){const compact=matchMedia('(max-width:700px)');const orient=()=>list.setAttribute('aria-orientation',compact.matches?'horizontal':'vertical');orient();compact.addEventListener('change',orient);}
  const panels=buttons.map(button=>document.getElementById(button.getAttribute('aria-controls')));
  const select=index=>{buttons.forEach((button,i)=>{button.setAttribute('aria-selected',String(index===i));button.tabIndex=index===i?0:-1;panels[i].hidden=index!==i;});};
  buttons.forEach((button,i)=>{button.addEventListener('click',()=>select(i));button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End',...(group.classList.contains('goal-board')?['ArrowUp','ArrowDown']:[])].includes(event.key))return;event.preventDefault();const index=nextTab(i,event.key,buttons.length);select(index);buttons[index].focus();});});
  select(0);
 });

 document.querySelectorAll('[data-work-browser]').forEach(browser=>{
  const search=browser.querySelector('[data-work-search]'),category=browser.querySelector('[data-work-category]'),format=browser.querySelector('[data-work-format]');
  const items=[...browser.querySelectorAll('.film-tile')];
  const update=()=>{
   let any=false;
   items.forEach(item=>{const visible=matchesFilm(item.dataset,{query:search.value,category:category.value,format:format.value});item.hidden=!visible;any||=visible;});
   browser.querySelectorAll('.format-group').forEach(group=>{group.hidden=![...group.querySelectorAll('.film-tile')].some(item=>!item.hidden);});
   browser.querySelector('[data-work-empty]').hidden=any;
   browser.querySelector('[data-work-status]').textContent=any?t(['筛选结果已更新','Results updated','Résultats actualisés']):t(['未找到匹配作品','No matching films','Aucun film correspondant']);
  };
  search.addEventListener('input',update);category.addEventListener('change',update);format.addEventListener('change',update);
  browser.querySelector('[data-work-reset]').addEventListener('click',()=>{search.value='';category.value='all';format.value='all';update();search.focus();});
 });

 const dialog=document.querySelector('[data-preview-dialog]');
 if(dialog&&typeof dialog.showModal==='function'){
  const player=dialog.querySelector('video'),heading=dialog.querySelector('h2'),link=dialog.querySelector('[data-preview-link]');let opener;
  document.addEventListener('click',event=>{
   const trigger=event.target.closest('[data-preview]');if(!trigger)return;
   opener=trigger;heading.textContent=trigger.dataset.title;player.poster=trigger.dataset.poster;player.src=trigger.dataset.src;
   dialog.classList.toggle('preview-portrait',trigger.dataset.format==='portrait');link.href=trigger.dataset.href;
   dialog.showModal();root.classList.add('preview-open');player.play().catch(()=>{});
  });
  dialog.querySelector('[data-preview-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{player.pause();player.removeAttribute('src');player.load();root.classList.remove('preview-open');opener?.focus({preventScroll:true});});
  document.querySelectorAll('[data-preview]').forEach(button=>{button.hidden=false;});
 }

 document.querySelectorAll('.detail-steps,.process ol').forEach((container,groupIndex)=>{
  const items=[...container.children];container.classList.add('step-accordion');
  items.forEach((item,index)=>{
   const heading=item.querySelector('h3'),paragraph=item.querySelector('p');if(!heading||!paragraph)return;
   const button=document.createElement('button'),indicator=document.createElement('span');button.type='button';button.textContent=heading.textContent;indicator.textContent='+';indicator.setAttribute('aria-hidden','true');button.append(indicator);
   paragraph.id=`step-description-${groupIndex}-${index}`;button.setAttribute('aria-controls',paragraph.id);button.setAttribute('aria-expanded',String(index===0));paragraph.hidden=index!==0;heading.replaceChildren(button);item.classList.toggle('step-open',index===0);
   button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));paragraph.hidden=!open;item.classList.toggle('step-open',open);});
  });
 });

 const form=document.querySelector('[data-brief-form]');
 if(form){
  const status=form.querySelector('[data-brief-status]');
  const body=()=>makeBrief({type:form.elements.projectType.value,idea:form.elements.idea.value,timing:form.elements.timing.value},lang);
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;window.location.href=mailDraft(body(),lang);status.textContent=t(['已请求打开邮件应用 请确认草稿后发送','Your email app has been requested Review the draft before sending','Ouverture de votre messagerie demandée Vérifiez le brouillon avant l’envoi']);});
  form.querySelector('[data-copy-brief]').addEventListener('click',async()=>{if(!form.reportValidity())return;try{await navigator.clipboard.writeText(body());status.textContent=t(['项目需求已复制','Project brief copied','Demande copiée']);}catch{status.textContent=t(['当前环境不支持自动复制 可使用打开邮件草稿','Automatic copying is unavailable Use Open email draft','La copie automatique est indisponible Utilisez Ouvrir le brouillon']);}});
 }


 document.querySelectorAll('[data-client-carousel]').forEach(carousel=>{
  const track=carousel.querySelector('.client-track'),prev=carousel.querySelector('[data-client-prev]'),next=carousel.querySelector('[data-client-next]');
  const update=()=>{prev.disabled=track.scrollLeft<2;next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-2;};
  const move=direction=>track.scrollBy({left:direction*(track.clientWidth+18),behavior:motion?'smooth':'auto'});
  prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));track.addEventListener('scroll',update,{passive:true});
  if('ResizeObserver'in window)new ResizeObserver(update).observe(track);else window.addEventListener('resize',update,{passive:true});
  update();
 });
 root.classList.add('experience-ready');
 const targets=document.querySelectorAll('.category-card,.film-tile,.mentor-link,.gateway,.split-content,.experience-heading,.mentor-profile-bottom,.brand-paths>a');
 if('IntersectionObserver'in window){
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target);}});},{threshold:.05,rootMargin:'0px 0px 20px 0px'});
  targets.forEach((element,index)=>{element.classList.add('reveal-item');element.style.setProperty('--reveal-delay',`${Math.min(index%3,2)*55}ms`);observer.observe(element);});
 }
 const progress=document.querySelector('.reading-progress');let scrollTick=false;
 const onScroll=()=>{if(scrollTick)return;scrollTick=true;requestAnimationFrame(()=>{const max=root.scrollHeight-innerHeight;progress?.style.setProperty('--progress',String(max>0?scrollY/max:0));root.classList.toggle('has-scrolled',scrollY>24);scrollTick=false;});};
 window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onScroll,{passive:true});onScroll();
 const hero=document.querySelector('.brand-home');let pointerTick=false,pointerX=0,pointerY=0;
 hero?.addEventListener('pointermove',event=>{if(!fine.matches||!motion)return;const rect=hero.getBoundingClientRect();pointerX=(event.clientX-rect.left)/rect.width-.5;pointerY=(event.clientY-rect.top)/rect.height-.5;if(pointerTick)return;pointerTick=true;requestAnimationFrame(()=>{hero.style.setProperty('--scene-x',`${pointerX*16}px`);hero.style.setProperty('--scene-y',`${pointerY*10}px`);pointerTick=false;});});
 hero?.addEventListener('pointerleave',()=>{hero.style.setProperty('--scene-x','0px');hero.style.setProperty('--scene-y','0px');});
 document.addEventListener('pointermove',event=>{if(!fine.matches||!motion)return;const card=event.target.closest('.category-card,.film-tile,.gateway,.course-card');if(!card)return;const rect=card.getBoundingClientRect();card.style.setProperty('--light-x',`${event.clientX-rect.left}px`);card.style.setProperty('--light-y',`${event.clientY-rect.top}px`);},{passive:true});
})();
