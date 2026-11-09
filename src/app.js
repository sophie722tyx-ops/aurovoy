// Limit the normal browser save actions on public video players only.
// Public playback still exposes media bytes; this is not DRM.
for(const video of document.querySelectorAll('video')){
 video.controlsList?.add('nodownload');
 video.draggable=false;
}
for(const type of ['contextmenu','dragstart']){
 document.addEventListener(type,event=>{
  if(event.target instanceof HTMLVideoElement)event.preventDefault();
 });
}
const menu=document.querySelector('.menu-toggle');
const nav=document.querySelector('#nav');
const language=document.querySelector('.language');
function closeMenu(){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);if(open)language.open=false;});
document.addEventListener('click',event=>{if(!language.contains(event.target))language.open=false;});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(language.open){language.open=false;language.querySelector('summary').focus();}else if(nav.classList.contains('is-open')){closeMenu();menu.focus();}}});
