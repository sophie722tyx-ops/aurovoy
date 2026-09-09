// Generated editorial pages also contain related films and selected work links.
// Filter those references using the same records used by the public galleries.
export function synchronizeEditorial(html,works){
 const published=new Map(works.filter(w=>w.status==='published').map(w=>[w.id,w]));
 const unavailable=new Set(works.filter(w=>w.status!=='published').map(w=>w.id));
 const isHidden=markup=>{const id=markup.match(/href="(?:\.\.\/)?(?:(?:en|fr)\/)?work-(\d+)\.html"/);return id&&unavailable.has('legacy-'+id[1]);};
 html=html.replace(/<article class="film-tile"[\s\S]*?<\/article>/g,tile=>isHidden(tile)?'':tile);
 html=html.replace(/<a\b[^>]*href="(?:\.\.\/)?(?:(?:en|fr)\/)?work-(\d+)\.html"[^>]*>[\s\S]*?<\/a>/g,(anchor,id)=>unavailable.has('legacy-'+id)?'':anchor);
 return html.replace(/(?:\.\.\/)?assets\/cover-(\d+)\.webp/g,(original,id)=>{
  if(!unavailable.has('legacy-'+id))return original;
  const category=works.find(w=>w.id==='legacy-'+id)?.category;
  return [...published.values()].find(w=>w.category===category)?.poster||'/assets/mark.png';
 });
}
