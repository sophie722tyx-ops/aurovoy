import {entries,entry} from './content-store.mjs';
import {allWorks} from './repository.mjs';
import {esc,ORIGIN,localText,filmGroups} from './views.mjs';
import {TEAM,TEAM_ID,creditedCreators} from './creator-team.mjs';
const index={zh:0,en:1,fr:2};
const prefix=lang=>lang==='zh'?'':`/${lang}`;
export const creatorPath=(c,lang='zh')=>`${prefix(lang)}/creator/${c.id}`;
const copy={title:['创作者','Creators','Créateurs'],heading:['让作品背后的创意被看见。','Meet the minds behind the films.','Rencontrez les talents derrière les films.'],intro:['不同的视角，共同完成每一次创作。通过作品，认识我们的创作者。','Different perspectives. Shared craft. Discover our creators through their work.','Des regards singuliers, une création collective. Découvrez nos créateurs à travers leurs films.'],skills:['擅长方向','Specialties','Spécialités'],works:['参与作品','Selected work','Films réalisés'],profile:['查看创作者主页','View creator profile','Voir le profil'],bio:['关于创作者','About the creator','À propos'],empty:['创作者资料正在整理中。欢迎先浏览我们的作品。','Creator profiles are on their way. Explore our films in the meantime.','Les profils arrivent bientôt. Découvrez nos films en attendant.'],back:['返回作品','Explore films','Voir les films'],noWork:['关联作品即将展示。','Selected work will appear here soon.','Les films associés seront bientôt présentés ici.']};
const text=(key,lang)=>copy[key][index[lang]];
const value=(v,lang)=>localText(v||['','',''],index[lang]);
const tags=(c,lang)=>`<ul class="creator-tags">${value(c.tags,lang).split('\n').map(s=>s.trim()).filter(Boolean).map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`;
export function creatorCards(creators,lang){return `<div class="creator-grid">${creators.map((c,n)=>`<article class="creator-card" data-card-number="${String(n+1).padStart(2,'0')}"><a href="${creatorPath(c,lang)}"><img src="${esc(c.photo)}" alt="${esc(value(c.name,lang))}" width="400" height="400" loading="lazy"><div><p class="eyebrow">${esc(value(c.role,lang))}</p><h3>${esc(value(c.name,lang))}</h3><p class="creator-short-bio">${esc(value(c.bio,lang))}</p>${tags(c,lang)}<span class="text-link">${text('profile',lang)} ↗</span></div></a></article>`).join('')}</div>`;}
export async function workCreators(env,w,lang){
 const creators=creditedCreators(w,await entries(env,'creators'));
 const byline=`<div class="work-author-line"><span>${['作品作者','Created by','Création'][index[lang]]}</span>${creators.map(c=>`<a href="${creatorPath(c,lang)}">${esc(value(c.name,lang))} ↗</a>`).join('')}</div>`;
 const section=`<section class="section work-creator-section"><div class="section-head"><h2>${text('title',lang)}</h2><a class="text-link" href="${prefix(lang)}/creators.html">${text('profile',lang)} ↗</a></div>${creatorCards(creators,lang)}</section>`;
 return {byline,section};
}
function document(template,body,title,description,path,lang){
 const localized=l=>`${prefix(l)}${path}`;
 return template.replace('page-about','page-creators').replace(/<main id="main">[\s\S]*?<\/main>/,`<main id="main">${body}</main>`)
 .replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(title)} | AUROVOY</title>`)
 .replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${esc(description)}">`)
 .replace(/<link rel="canonical" href="[^"]*">/,`<link rel="canonical" href="${ORIGIN}${localized(lang)}">`)
 .replace(/<link rel="alternate" hreflang="([^"]+)" href="[^"]*">/g,(_,l)=>`<link rel="alternate" hreflang="${l}" href="${ORIGIN}${localized(l==='zh-CN'?'zh':l)}">`)
 .replace(/href="[^"]*" lang="(zh|en|fr)"/g,(_,l)=>`href="${localized(l)}" lang="${l}"`)
 .replace('class="active" aria-current="page"','')
 .replace(/((?:src|href)=["'])(?!https?:|mailto:|tel:|#|\/|data:)([^"']+)(["'])/g,(_,a,url,b)=>a+(url.startsWith('../')?'/'+url.slice(3):url.startsWith('assets/')||/\.(?:css|js)$/.test(url)?'/'+url:`${prefix(lang)}/`+url)+b);
}
export async function creatorPublic(path,env,pages){
 const match=path.match(/^\/(?:(en|fr)\/)?(creators\.html|creator\/([a-z0-9-]+))\/?$/);if(!match)return null;
 const lang=match[1]||'zh',p=prefix(lang),id=match[3],template=pages[`${lang==='zh'?'':lang+'/'}about.html`];
 let body,title,description;
 if(id){
  const c=id===TEAM_ID?TEAM:await entry(env,'creators',id);if(!c||c.status!=='published')return new Response('Not found',{status:404,headers:{'X-Robots-Tag':'noindex','Cache-Control':'no-store'}});
  const published=await entries(env,'creators');const works=(await allWorks(env)).filter(w=>creditedCreators(w,published).some(creator=>creator.id===c.id));title=value(c.name,lang);description=value(c.bio,lang);
  body=`<section class="section creator-profile"><a class="parent-back" href="${p}/creators.html">← ${text('title',lang)}</a><div class="creator-profile-grid"><img class="creator-portrait" src="${esc(c.photo)}" alt="${esc(title)}" width="640" height="640"><div><p class="eyebrow">${esc(value(c.role,lang)||'AUROVOY CREATOR')}</p><h1>${esc(title)}</h1><p class="creator-intro">${esc(description)}</p><h2 class="creator-label">${text('skills',lang)}</h2>${tags(c,lang)}</div></div>${value(c.biography,lang)?`<div class="creator-biography"><h2>${text('bio',lang)}</h2><p>${esc(value(c.biography,lang))}</p></div>`:''}</section><section class="section creator-works"><div class="section-head"><h2>${text('works',lang)}</h2><a class="text-link" href="${p}/contact.html">${['讨论合作','Start a project','Parlons de votre projet'][index[lang]]} ↗</a></div>${works.length?filmGroups(works,lang):`<p>${text('noWork',lang)}</p>`}</section>`;
 }else{
  const creators=[...await entries(env,'creators'),TEAM];title=text('title',lang);description=text('intro',lang);
  body=`<section class="section creators-directory-head"><a class="parent-back" href="${p}/works.html">← ${text('back',lang)}</a><div class="creators-heading-layout"><div><p class="eyebrow">AUROVOY / CREATIVE PEOPLE</p><h1>${text('heading',lang)}</h1><p class="creators-heading-intro">${description}</p></div><div class="creators-count"><span class="creators-count-number">${String(creators.length).padStart(2,'0')}</span><span>${text('title',lang)}</span></div></div></section><section class="section creator-directory"><div class="creators-directory-label"><span>${['认识我们的创作者','Discover our creators','Découvrez nos créateurs'][index[lang]]}</span><span>AUROVOY COLLECTIVE</span></div>${creators.length?creatorCards(creators,lang):`<div class="creator-empty"><p>${text('empty',lang)}</p><a class="button" href="${p}/works.html">${text('back',lang)} ↗</a></div>`}</section>`;
 }
 return new Response(document(template,body,title,description,id?'/creator/'+id:'/creators.html',lang),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
export async function creatorSitemap(env){const creators=[...await entries(env,'creators'),TEAM];return ['zh','en','fr'].flatMap(lang=>[`${prefix(lang)}/creators.html`,...creators.map(c=>creatorPath(c,lang))]).map(path=>`<url><loc>${ORIGIN}${path}</loc></url>`).join('');}
export async function creatorExtras(html,path,env){
 if(!html.includes('<main id="main">'))return html;
 const lang=path.match(/^\/(en|fr)(?:\/|$)/)?.[1]||'zh',p=prefix(lang);
 const isHome=/^\/(?:(en|fr)\/)?(?:index\.html)?\/?$/.test(path);
 html=html.replace('</head>','<link rel="stylesheet" href="/creators.css"></head>');
 if(!isHome)html=html.replace('</footer>',`<a class="creators-footer-link" href="${p}/creators.html">${text('title',lang)}</a></footer>`);
 if(!isHome&&html.includes('class="header-tools"')){
  const label=['分享','Share','Partager'][index[lang]];
  const share=`<button type="button" class="page-share" data-copy-page aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4M13 3h8v8M21 3 10 14"/></svg><span>${label}</span></button>`;
  html=html.replace('class="header"','class="header public-share-header"').replace('<div class="header-tools">','<div class="header-tools">'+share).replace('</body>','<div class="share-feedback" role="status" aria-live="polite" hidden></div><script src="/share.js" defer></script></body>');
 }
 if(isHome){
  html=html.replace(/<a class="brand-explore" href="[^"]*">[\s\S]*?<\/a>/,link=>`<div class="brand-home-actions">${link}<a class="brand-explore brand-creators" href="${p}/creators.html">${['认识创作者','Meet the creators','Nos créateurs'][index[lang]]}<span aria-hidden="true">↗</span></a></div>`);
 }
 if(/^\/(?:(en|fr)\/)?works(?:-[a-z]+)?\.html$/.test(path))html=html.replace('<main id="main">',`<main id="main"><div class="creators-discovery"><a class="text-link" href="${p}/creators.html">${text('heading',lang)} ↗</a></div>`);
 return html;
}
