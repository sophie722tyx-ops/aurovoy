export function logoExplorer(body,file,{t,asset}){
 if(file!=='about.html')return body;
 const labels=t([['圆形外框','山峰元素','中心圆点','海浪与鲸形','橙蓝配色'],['Circular frame','Mountain forms','Central point','Wave and whale','Orange and blue'],['Cadre circulaire','Montagnes','Point central','Vague et baleine','Orange et bleu']]);
 const current=body.match(/<div class="anatomy-mark">[\s\S]*?<\/div>/)?.[0];
 if(!current)return body;
 const regions=[
  '<path d="M7 75C6 42 26 21 56 16L60 22C32 24 15 45 15 74Z M67 17C98 20 119 43 119 74L111 74C111 46 94 27 71 23Z"></path>',
  '<path d="M28 68L39 52L50 52L57 45L65 43L74 53L82 54L101 72L89 69L76 61L65 68L54 59L43 65L35 73Z"></path>',
  '<circle cx="63" cy="52" r="8"></circle>',
  '<path d="M7 72L120 71L115 98L96 120L65 132L39 123L15 105Z"></path>',
  '<path d="M0 0H127V133H0Z"></path>'
 ];
 const diagram=`<div class="anatomy-mark logo-lab" data-logo-lab data-active-part="0"><p class="eyebrow">EXPLORE THE SYMBOL</p><div class="logo-stage"><svg viewBox="0 0 127 133" role="img" aria-label="${t(['品牌标志及所选元素的位置示意','Brand symbol with the selected element highlighted','Symbole de marque et élément sélectionné'])}"><defs>${regions.map((shape,i)=>`<clipPath id="logo-region-${i}" clipPathUnits="userSpaceOnUse">${shape}</clipPath>`).join('')}</defs><image class="logo-base-image" href="${asset('logo-explorer-mark.webp')}" width="127" height="133"></image>${regions.map((_,i)=>`<image class="logo-region-image" data-logo-region="${i}" href="${asset('logo-explorer-mark.webp')}" width="127" height="133" clip-path="url(#logo-region-${i})" style="opacity:${i===0?1:0}"></image>`).join('')}</svg><span class="logo-position-label">${t(['整体位置','IN THE SYMBOL','DANS LE SYMBOLE'])}</span></div><div class="logo-fragment"><span>${t(['结构示意','ELEMENT STUDY','ÉTUDE DE L’ÉLÉMENT'])}</span><div class="logo-fragment-image">${labels.map((label,i)=>`<img src="${asset(`logo-part-${i}.webp`)}" alt="${label}" data-logo-fragment="${i}"${i===0?'':' hidden'} width="300" height="240">`).join('')}</div><strong data-logo-label aria-live="polite">${labels[0]}</strong></div><p class="logo-hint">${t(['选择右侧条目 查看标志中的对应位置','Choose an element to locate it within the symbol','Choisir un élément pour le situer dans le symbole'])}</p></div>`;
 body=body.replace(current,diagram);
 let index=0;
 body=body.replace(/<details class="symbol-detail"(?: open)?>/g,()=>`<details class="symbol-detail" data-logo-choice="${index}"${index++===0?' open':''}>`);
 return body;
}
