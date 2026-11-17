import catalog from '../playback-catalog.json' with {type:'json'};
export function playbackPage(html){
 const sources=Object.fromEntries(Object.entries(catalog).filter(([,value])=>html.includes('="'+value.source+'"')).map(([id,value])=>[value.source,'/playback/'+id+'/master.m3u8']));
 if(!Object.keys(sources).length)return html;
 const prepared=[...html.matchAll(/<video\b[\s\S]*?<\/video>/g)].some(([video])=>Object.keys(sources).some(source=>video.includes('src="'+source+'"')));
 if(prepared){
  html=html.replaceAll('完整样片 · 保留原始分辨率、帧率与原有语言。','完整样片 · 自动适配清晰度，可切换原片。')
   .replaceAll('Full-length film · Original resolution, frame rate and language.','Full-length film · Adaptive quality, with the original available.')
   .replaceAll('Film intégral · Résolution, fréquence d’images et langue d’origine.','Film intégral · Qualité adaptative, original disponible.');
 }
 const data=JSON.stringify(sources).replaceAll('<','\\u003c');
 return html.replace('</head>',`<link rel="stylesheet" href="/adaptive-video.css"><script type="application/json" id="playback-sources">${data}</script><script src="/adaptive-video.js" defer></script></head>`);
}
