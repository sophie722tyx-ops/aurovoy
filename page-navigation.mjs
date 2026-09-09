export function addParentNavigation(body,file,{t}){
 if(file==='index.html')return body;
 return body.replace(/<nav class="breadcrumbs"[\s\S]*?<\/nav>/,breadcrumbs=>{
  const links=[...breadcrumbs.matchAll(/<a href="([^"]+)">([\s\S]*?)<\/a>/g)];
  if(!links.length)throw new Error(`No parent route for ${file}`);
  const parent=links.at(-1),label=t(['返回上一级','Back to parent','Retour au niveau précédent']);
  return `<div class="page-route"><a class="parent-back" href="${parent[1]}" aria-label="${label}"><span aria-hidden="true">←</span>${label}</a>${breadcrumbs}</div>`;
 });
}
