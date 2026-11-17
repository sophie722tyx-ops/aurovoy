(()=>{
 'use strict';
 // This controller is shared by detail pages and the reusable preview dialog.
 function createPlayback({video,source,manifest,loadHls,preferNative=false,onState=()=>{},onLevels=()=>{},fetchManifest}){
  let engine=null,choice='auto',mode='',started=false,dead=false,generation=0,wantsPlay=false,playedThisSource=false,position=0,abort=null,pendingMetadata=null;
  const valid=token=>!dead&&token===generation;
  const state=value=>{if(!dead)onState(value);};
  const savePosition=()=>{if(Number.isFinite(video.currentTime)&&video.currentTime>0)position=video.currentTime;};
  function detach(){
   abort?.abort();abort=null;
   if(pendingMetadata)video.removeEventListener('loadedmetadata',pendingMetadata);pendingMetadata=null;
   engine?.destroy();engine=null;
  }
  async function resume(token){
   if(!valid(token)||!wantsPlay)return;
   try{await video.play();if(valid(token)){playedThisSource=true;state('playing');}}catch{if(valid(token))state('ready');}
  }
  function restore(token){
   if(!valid(token))return;
   if(position>0&&video.readyState<1){
    if(!pendingMetadata){pendingMetadata=()=>{pendingMetadata=null;restore(token);};video.addEventListener('loadedmetadata',pendingMetadata,{once:true});}
    resume(token);return;
   }
   if(position>0){try{video.currentTime=Number.isFinite(video.duration)?Math.min(position,Math.max(0,video.duration-.1)):position;}catch{}}
   resume(token);
  }
  function nativeSource(url,token){
   playedThisSource=false;
   pendingMetadata=()=>{pendingMetadata=null;restore(token);};
   video.addEventListener('loadedmetadata',pendingMetadata,{once:true});
   video.src=url;video.load();resume(token);
  }
  function original(token,fallback=false){
   if(!valid(token))return;
   // After playback has begun, native controls own the user's pause intent.
   // Before the first frame, keep the pending Play request through a fallback.
   if(fallback&&playedThisSource)wantsPlay=!video.paused;
   playedThisSource=false;
   detach();mode='original';choice='original';
   state(fallback?'fallback':'loading');nativeSource(source,token);
  }
  async function startNative(token){
   mode='native';nativeSource(choice.startsWith('native:')?choice.slice(7):manifest,token);
   if(fetchManifest){
    abort=new AbortController();
    try{const variants=await fetchManifest(manifest,abort.signal);if(valid(token)&&mode==='native')onLevels(variants);}catch{/* Native automatic playback remains available. */}
   }
  }
  async function start(){
   if(dead)return;
   savePosition();const token=++generation;mode='loading';playedThisSource=false;detach();started=true;video.controls=true;video.pause();state('loading');
   if(choice==='original'){original(token);return;}
   // Native Safari playback must begin inside the original click, before loading
   // a library or fetching a manifest can consume the user activation.
   if(preferNative&&video.canPlayType('application/vnd.apple.mpegurl'))return startNative(token);
   let Hls;try{Hls=await loadHls();}catch{}
   if(!valid(token))return;
   if(Hls?.isSupported()){
    mode='hls';
    const instance=engine=new Hls({startLevel:0,maxBufferLength:16,maxMaxBufferLength:24,maxBufferSize:16*1024*1024,backBufferLength:8,capLevelToPlayerSize:true});
    instance.on(Hls.Events.MEDIA_ATTACHED,()=>{if(valid(token)&&engine===instance)instance.loadSource(manifest);});
    instance.on(Hls.Events.MANIFEST_PARSED,()=>{
     if(!valid(token)||engine!==instance)return;
     onLevels(instance.levels.map((level,index)=>({value:String(index),label:level.name||`${Math.min(level.width||level.height,level.height)}p`})));
     // Leave automatic mode untouched so startLevel=0 can deliver the first
     // frame before bandwidth-based upshifts. Setting currentLevel here flushes it.
     if(choice!=='auto'&&/^\d+$/.test(choice)){instance.capLevelToPlayerSize=false;instance.currentLevel=Number(choice);}
     restore(token);
    });
    instance.on(Hls.Events.ERROR,(_event,data)=>{if(valid(token)&&engine===instance&&data.fatal){savePosition();original(token,true);}});
    instance.attachMedia(video);
   }else if(video.canPlayType('application/vnd.apple.mpegurl'))return startNative(token);
   else original(token,true);
  }
  const onError=()=>{if(!dead&&started&&mode==='native'){savePosition();original(generation,true);}else if(!dead&&started&&mode==='original')state('error');};
  const onPlaying=()=>{if(!dead&&started)playedThisSource=true;};
  video.addEventListener('error',onError);
  video.addEventListener('playing',onPlaying);
  return {
   play(){if(dead)return Promise.resolve();wantsPlay=true;if(!started)return start();return resume(generation);},
   select(value){
    if(dead)return;
    if(!['auto','original'].includes(value)&&!/^\d+$/.test(value)&&!value.startsWith('native:'))return;
    const resumePlayback=started&&!video.paused;choice=value;
    if(!started)return;
    wantsPlay=resumePlayback;
    if(mode==='hls'&&value!=='original'&&!value.startsWith('native:')){engine.capLevelToPlayerSize=value==='auto';engine.nextLevel=value==='auto'?-1:Number(value);return;}
    if(mode==='native'&&value!=='original'){
     savePosition();const token=++generation;detach();video.pause();state('loading');nativeSource(value==='auto'?manifest:value.slice(7),token);return;
    }
    return start();
   },
   destroy(){if(dead)return;dead=true;generation++;detach();video.removeEventListener('error',onError);video.removeEventListener('playing',onPlaying);video.pause();video.removeAttribute('src');video.load();},
   get mode(){return mode;},get choice(){return choice;}
  };
 }
 function parseVariants(text,manifest){
  const lines=text.split(/\r?\n/),base=new URL(manifest,globalThis.location?.href||'https://aurovoy.cn/'),out=[];
  for(let i=0;i<lines.length;i++){
   const resolution=/^#EXT-X-STREAM-INF:.*RESOLUTION=(\d+)x(\d+)/.exec(lines[i]);if(!resolution)continue;
   const next=lines.slice(i+1).find(line=>line.trim()&&!line.startsWith('#'));if(!next)continue;
   const url=new URL(next.trim(),base);if(url.origin!==base.origin||!url.pathname.startsWith('/playback/'))continue;
   out.push({value:'native:'+url.href,label:Math.min(Number(resolution[1]),Number(resolution[2]))+'p'});
  }
  return out;
 }
 function preferNativeHls(video,client=globalThis.navigator){
  if(!client||!video.canPlayType('application/vnd.apple.mpegurl'))return false;
  const ua=client.userAgent||'',platform=client.platform||'',apple=client.vendor==='Apple Computer, Inc.';
  const ios=/^(iPhone|iPad|iPod)$/.test(platform)||(platform==='MacIntel'&&client.maxTouchPoints>1&&apple);
  const safari=apple&&/Safari\//.test(ua)&&!/Chrome|Chromium|CriOS|Edg|OPR|Android|FxiOS/.test(ua);
  return ios||safari;
 }
 globalThis.AurovoyVideoCore={createPlayback,parseVariants,preferNativeHls};
 if(typeof document==='undefined')return;
 const locale=document.documentElement.lang.split('-')[0],li={zh:0,en:1,fr:2}[locale]??0,t=list=>list[li];
 let sources={};try{sources=JSON.parse(document.getElementById('playback-sources')?.textContent||'{}');}catch{}
 const states=new WeakMap(),active=new Set();let vendorPromise;
 const loadHls=()=>{
  if(globalThis.Hls)return Promise.resolve(globalThis.Hls);
  if(!vendorPromise)vendorPromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='/vendor/hls.min.js';script.async=true;
   const timeout=setTimeout(()=>{script.remove();reject(Error('Player unavailable'));},12000);
   script.onload=()=>{clearTimeout(timeout);globalThis.Hls?resolve(globalThis.Hls):reject(Error('Player unavailable'));};
   script.onerror=()=>{clearTimeout(timeout);reject(Error('Player unavailable'));};document.head.append(script);
  });
  return vendorPromise;
 };
 function cleanup(video){
  const current=states.get(video);if(!current)return;
  states.delete(video);active.delete(video);current.controller.destroy();video.controls=true;current.stage.before(video);current.stage.remove();current.tools.remove();delete video.dataset.adaptiveVideo;
 }
 function prepare(video,source){
  cleanup(video);
  let path;try{const url=new URL(source,location.href);if(url.origin===location.origin)path=url.pathname;}catch{}
  const manifest=sources[path];
  if(!manifest){video.src=source;return false;}
  video.pause();video.controls=false;video.preload='none';video.removeAttribute('src');video.querySelectorAll('source').forEach(item=>item.remove());video.load();
  video.dataset.adaptiveVideo='true';video.controlsList?.add('nodownload');video.draggable=false;
  const stage=document.createElement('div');stage.className='adaptive-stage';video.before(stage);stage.append(video);
  const playButton=document.createElement('button');playButton.type='button';playButton.className='adaptive-play';playButton.textContent='▶';playButton.setAttribute('aria-label',t(['播放视频','Play video','Lire la vidéo']));stage.append(playButton);
  const tools=document.createElement('div');tools.className='adaptive-tools';
  const label=document.createElement('label');label.textContent=t(['画质','Quality','Qualité']);
  const select=document.createElement('select');label.append(select);
  const message=document.createElement('span');message.className='adaptive-status';message.setAttribute('role','status');message.setAttribute('aria-live','polite');tools.append(label,message);stage.after(tools);
  const option=(value,text)=>{const item=document.createElement('option');item.value=value;item.textContent=text;return item;};
  const fill=levels=>{const selected=select.value||'auto';select.replaceChildren(option('auto',t(['自动','Auto','Auto'])),...levels.map(level=>option(level.value,level.label)),option('original',t(['原片','Original','Original'])));select.value=[...select.options].some(item=>item.value===selected)?selected:'auto';};fill([]);
  const controller=createPlayback({video,source,manifest,loadHls,preferNative:preferNativeHls(video),onLevels:fill,fetchManifest:async(url,signal)=>{const r=await fetch(url,{signal});if(!r.ok)throw Error('Manifest unavailable');return parseVariants(await r.text(),url);},onState:state=>{
   playButton.disabled=state==='loading';playButton.hidden=state==='playing';playButton.textContent=state==='loading'?'…':'▶';
   message.textContent=state==='loading'?t(['正在准备播放','Preparing playback','Préparation de la lecture']):state==='fallback'?t(['已切换到原片','Switched to original','Lecture de l’original']):state==='error'?t(['暂时无法播放，请刷新重试','Unable to play. Please refresh and retry.','Lecture indisponible. Actualisez et réessayez.']):'';
   if(state==='fallback')select.value='original';
  }});
  const play=()=>controller.play();playButton.addEventListener('click',play);select.addEventListener('change',()=>controller.select(select.value));
  states.set(video,{controller,stage,tools,source});active.add(video);return true;
 }
 function play(video){return states.get(video)?.controller.play()??video.play();}
 globalThis.AurovoyVideo={prepare,play,cleanup};
 document.querySelectorAll('video').forEach(video=>{const source=video.getAttribute('src')||video.querySelector('source')?.getAttribute('src');if(source)prepare(video,source);});
 let suspended=[];
 window.addEventListener('pagehide',()=>{suspended=[...active].map(video=>({video,source:states.get(video).source}));for(const {video}of suspended)cleanup(video);});
 window.addEventListener('pageshow',event=>{if(event.persisted){for(const {video,source}of suspended)prepare(video,source);suspended=[];}});
})();
