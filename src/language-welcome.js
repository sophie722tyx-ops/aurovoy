(()=>{'use strict';
 const dialog=document.querySelector('#language-welcome');if(!dialog)return;
 const key='aurovoy-language',supported=['zh','en','fr'],current=document.documentElement.lang.split('-')[0],home={zh:'/index.html',en:'/en/',fr:'/fr/'};
 function read(){for(const storage of ['localStorage','sessionStorage'])try{const value=window[storage].getItem(key);if(supported.includes(value))return value;}catch{}return null;}
 function remember(lang){for(const storage of ['localStorage','sessionStorage'])try{window[storage].setItem(key,lang);}catch{}}
 function destination(lang){const link=document.querySelector('.language-options a[lang="'+lang+'"]');const url=new URL(link?.getAttribute('href')||home[lang],document.baseURI);if(url.origin!==location.origin)return new URL(home[lang],location.origin);if(/^(?:\/(?:en|fr))?\/(?:index\.html)?$/.test(url.pathname))url.pathname=home[lang];url.search=location.search;url.hash=location.hash;return url;}
 for(const link of dialog.querySelectorAll('[data-welcome-language]'))link.href=destination(link.dataset.welcomeLanguage).href;
 document.addEventListener('click',e=>{const a=e.target.closest('.language-options a[lang], [data-welcome-language]');if(!a||e.defaultPrevented||e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const lang=a.dataset.welcomeLanguage||a.lang;if(!supported.includes(lang))return;remember(lang);if(a.hasAttribute('data-welcome-language')){e.preventDefault();dialog.close();const url=new URL(a.href);if(url.pathname!==location.pathname||url.search!==location.search||url.hash!==location.hash)location.assign(url.href);}});
 dialog.querySelector('[data-language-close]').addEventListener('click',()=>{remember(current);dialog.close();});
 dialog.addEventListener('cancel',()=>remember(current));
 const stored=read();if(stored){if(location.pathname==='/'){const url=new URL(home[stored],location.origin);url.search=location.search;url.hash=location.hash;location.replace(url.href);}return;}
 if(typeof dialog.showModal==='function')dialog.showModal();
})();
