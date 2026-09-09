(()=>{
 'use strict';
 const lab=document.querySelector('[data-logo-lab]');if(!lab)return;
 const items=[...document.querySelectorAll('[data-logo-choice]')],regions=[...lab.querySelectorAll('[data-logo-region]')],fragments=[...lab.querySelectorAll('[data-logo-fragment]')],label=lab.querySelector('[data-logo-label]');
 const select=index=>{
  lab.dataset.activePart=String(index);
  regions.forEach((region,i)=>{region.style.opacity=i===index?'1':'0';});
  fragments.forEach((fragment,i)=>{fragment.hidden=i!==index;});
  label.textContent=fragments[index].alt;
  items.forEach((item,i)=>{item.classList.toggle('symbol-selected',i===index);if(i!==index)item.open=false;});
 };
 items.forEach((item,index)=>item.addEventListener('toggle',()=>{if(item.open)select(index);}));
 select(0);
})();
