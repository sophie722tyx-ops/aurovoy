(()=>{'use strict';
 const button=document.querySelector('[data-copy-page]'),feedback=document.querySelector('.share-feedback');if(!button||!feedback)return;
 const lang=document.documentElement.lang.startsWith('fr')?2:document.documentElement.lang.startsWith('en')?1:0;
 const labels={copied:['链接已复制','Link copied','Lien copié'],failed:['复制失败，请复制浏览器地址栏中的链接','Copy failed. Please copy the link from your address bar.','Copie impossible. Copiez le lien dans la barre d’adresse.']};let timer;
 function notify(key){clearTimeout(timer);feedback.textContent=labels[key][lang];feedback.hidden=false;timer=setTimeout(()=>{feedback.hidden=true;feedback.textContent='';},key==='copied'?1000:4000);}
 function fallback(url){const active=document.activeElement,field=document.createElement('textarea');field.value=url;field.setAttribute('readonly','');field.setAttribute('aria-hidden','true');field.style.position='fixed';field.style.left='-9999px';document.body.append(field);field.select();let copied=false;try{copied=document.execCommand('copy');}finally{field.remove();active?.focus();}return copied;}
 button.addEventListener('click',async()=>{if(button.disabled)return;button.disabled=true;const url=document.querySelector('link[rel="canonical"]')?.href||location.origin+location.pathname;try{try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(url);}catch{if(!fallback(url))throw Error('Copy failed');}notify('copied');}catch{notify('failed');}finally{button.disabled=false;}});
})();
