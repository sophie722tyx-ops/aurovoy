import quality from '../video-quality.json' with {type:'json'};
// Generated editorial pages also contain related films and selected work links.
// Filter those references using the same records used by the public galleries.
export function synchronizeEditorial(html,works){
 html=html.replace(/(?:\.\.\/|\/)?assets\/film-(\d+)\.mp4/g,(original,id)=>works.find(w=>w.id==='legacy-'+id)?.video||original);
 for(const q of Object.values(quality).filter(q=>q.showcase)){const file=q.previousVideo.split('/').pop();html=html.replaceAll('../assets/'+file,q.video).replaceAll('/assets/'+file,q.video).replaceAll('assets/'+file,q.video);}
 const published=new Map(works.filter(w=>w.status==='published').map(w=>[w.id,w]));
 const unavailable=new Set(works.filter(w=>w.status!=='published').map(w=>w.id));
 const isHidden=markup=>{const id=markup.match(/href="(?:\.\.\/)?(?:(?:en|fr)\/)?work-(\d+)\.html"/);return id&&unavailable.has('legacy-'+id[1]);};
 html=html.replace(/<article class="film-tile"[\s\S]*?<\/article>/g,tile=>isHidden(tile)?'':tile);
 html=html.replace(/<a\b[^>]*href="(?:\.\.\/)?(?:(?:en|fr)\/)?work-(\d+)\.html"[^>]*>[\s\S]*?<\/a>/g,(anchor,id)=>unavailable.has('legacy-'+id)?'':anchor);
 return html.replace(/(?:\.\.\/)?assets\/cover-(\d+)\.webp/g,(original,id)=>{
  if(!unavailable.has('legacy-'+id))return original;
  const category=works.find(w=>w.id==='legacy-'+id)?.category;
  const choices=[...published.values()].filter(w=>w.category===category);const n=works.filter(w=>w.category===category&&w.status!=='published').findIndex(w=>w.id==='legacy-'+id);return choices.length?choices[Math.max(0,n)%choices.length].poster:'/assets/mark.png';
 });
}
