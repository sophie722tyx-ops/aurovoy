(()=>{
const normalise=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/\s+/g,' ').trim();
function matchesFilm(film,{query='',category='all',format='all'}={}){
 return (category==='all'||film.category===category)&&(format==='all'||film.format===format)&&normalise(query).split(' ').filter(Boolean).every(word=>normalise(film.search).includes(word));
}
function nextTab(current,key,length){
 if(key==='Home')return 0;if(key==='End')return length-1;
 if(key==='ArrowRight'||key==='ArrowDown')return(current+1)%length;if(key==='ArrowLeft'||key==='ArrowUp')return(current-1+length)%length;return current;
}
function makeBrief({type,idea,timing},lang='zh'){
 const labels={zh:['合作方向','项目想法','期望时间'],en:['Project type','Project idea','Target timing'],fr:['Type de projet','Idée du projet','Échéance souhaitée']}[lang]??['Project type','Project idea','Target timing'];
 return [[labels[0],String(type??'').slice(0,160)],[labels[1],String(idea??'').trim().slice(0,3000)],[labels[2],String(timing??'').trim().slice(0,120)]].filter(([,v])=>v).map(([k,v])=>`${k}\n${v}`).join('\n\n');
}
function mailDraft(body,lang='zh'){
 const subject={zh:'元启程项目合作咨询',en:'AUROVOY project enquiry',fr:'Demande de projet AUROVOY'}[lang]??'AUROVOY project enquiry';
 return `mailto:tangy38722@163.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
globalThis.AurovoyInteraction={normalise,matchesFilm,nextTab,makeBrief,mailDraft};
})();
