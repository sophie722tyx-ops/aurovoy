const menu=document.querySelector('.menu-toggle');
const nav=document.querySelector('#nav');
const language=document.querySelector('.language');
function closeMenu(){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);if(open)language.open=false;});
document.addEventListener('click',event=>{if(!language.contains(event.target))language.open=false;});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(language.open){language.open=false;language.querySelector('summary').focus();}else if(nav.classList.contains('is-open')){closeMenu();menu.focus();}}});
