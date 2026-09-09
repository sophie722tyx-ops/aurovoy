export function logoExplorer(body,file,{t,asset}){
 if(file!=='about.html')return body;
 // Bound the colour key to the source image so transparent filter margins stay transparent.
 const mark=`<div class="anatomy-mark logo-complete"><p class="eyebrow">THE AUROVOY SYMBOL</p><svg class="complete-logo" viewBox="0 0 265 279" role="img" aria-label="${t(['元启程完整品牌标志','The complete AUROVOY brand symbol','Le symbole complet de la marque AUROVOY'])}"><defs><filter id="logo-paper-removal" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -5 -5 -5 0 13.5"></feColorMatrix><feComposite in2="SourceAlpha" operator="in"></feComposite></filter></defs><image href="${asset('logo-explorer-mark.webp')}" width="265" height="279" filter="url(#logo-paper-removal)"></image></svg><p>${t(['启程　探索　连接　成长','Departure　Exploration　Connection　Growth','Départ　Exploration　Lien　Progression'])}</p></div>`;
 return body.replace(/<div class="anatomy-mark">[\s\S]*?<\/div>/,mark);
}

