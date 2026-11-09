import {entries,entry} from './content-store.mjs';
import {esc,ORIGIN} from './views.mjs';
import {addParentNavigation} from '../page-navigation.mjs';
const lineList=s=>s.split('\n').map(x=>x.trim()).filter(Boolean);
const response=(body,status=200)=>new Response(body,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(status===404?{'X-Robots-Tag':'noindex'}:{})}});
const unavailable=(lang,parent)=>response(`<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><main class="section"><h1>${{zh:'该内容暂未公开',en:'This content is not currently available',fr:'Ce contenu n’est pas disponible'}[lang]}</h1><a class="parent-back" href="${lang==='zh'?'':`/${lang}`}/${parent}">← ${ {zh:'返回上一级',en:'Back to parent',fr:'Retour'}[lang]}</a></main></html>`,404);
function documentWithBody(template,body,name,description){return template.replace(/<main id="main">[\s\S]*?<\/main>/,`<main id="main">${body}</main>`).replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(name)} | AUROVOY 元启程</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${esc(description)}">`);}
export async function contentPublic(pathname,env,pages){
 const match=pathname.match(/^\/(?:(en|fr)\/)?(mentors|mentor-[a-z0-9-]+)(?:\.html)?\/?$/);if(!match)return null;
 const lang=match[1]||'zh',li={zh:0,en:1,fr:2}[lang],file=match[2]+'.html',prefix=lang==='zh'?'':lang+'/',t=values=>values[li]||values[0];
 if(file==='mentors.html'){
  const items=await entries(env,'mentors');let html=pages[prefix+file];
  const cards=items.map(m=>`<a class="mentor-link" href="mentor-${m.id}.html"><div class="mentor-photo"><img src="${esc(m.photo)}" alt="${esc(t(m.name))}" width="1080" height="1440" loading="lazy"></div><div class="mentor-card-copy"><h3>${esc(t(m.name))}</h3><p>${esc(t(m.role))}</p><span class="gateway-link">${t(['了解导师','Meet the instructor','Découvrir'])} ↗</span></div></a>`).join('');
  html=html.replace(/<section class="section"><div class="mentor-grid">[\s\S]*?<\/section>/,`<section class="section"><div class="mentor-grid">${cards||`<p>${t(['导师信息更新中','Instructor information is being updated','Présentation des intervenants en cours de mise à jour'])}</p>`}</div></section>`);return response(html);
 }
 if(file.startsWith('mentor-')){
  const id=match[2].slice(7),m=await entry(env,'mentors',id);if(!m||m.status!=='published')return unavailable(lang,'mentors.html');
  const tags=lineList(t(m.tags)).map(s=>`<span>${esc(s)}</span>`).join(''),paragraphs=t(m.biography).split(/\n\s*\n/).filter(Boolean).map(s=>`<p style="white-space:pre-line">${esc(s)}</p>`).join('');
  let body=`<section class="section mentor-profile"><nav class="breadcrumbs"><a href="index.html">${t(['首页','Home','Accueil'])}</a><span>/</span><a href="training.html">${t(['培训','Training','Formation'])}</a><span>/</span><a href="mentors.html">${t(['导师团队','Instructors','Intervenants'])}</a><span>${esc(t(m.name))}</span></nav><div class="mentor-profile-grid"><div class="mentor-profile-photo"><img src="${esc(m.photo)}" alt="${esc(t(m.name))}" width="1080" height="1440" fetchpriority="high"></div><div class="mentor-profile-copy"><p class="eyebrow">AUROVOY INSTRUCTOR</p><h1>${esc(t(m.name))}</h1><p class="mentor-role">${esc(t(m.role))}</p><div class="tags">${tags}</div><div class="mentor-biography"><h2>${t(['导师介绍','About the instructor','Présentation'])}</h2>${m.bio.some(Boolean)?`<p>${esc(t(m.bio))}</p>`:''}${paragraphs}</div></div></div><div class="mentor-profile-bottom">${[['highlights',['专业经历','Professional background','Parcours professionnel']],['teaching',['核心授课方向','Teaching areas','Domaines d’enseignement']]].map(([k,labels])=>`<section><h2>${t(labels)}</h2><ul>${lineList(t(m[k])).map(s=>`<li>${esc(s)}</li>`).join('')}</ul></section>`).join('')}</div></section>`;
  body=addParentNavigation(body,file,{t});let html=pages[prefix+'mentor-sophie.html'].replaceAll('mentor-sophie.html',file);return response(documentWithBody(html,body,t(m.name),t(m.bio)||t(m.role)));
 }
 return null;
}
export async function contentSitemap(env){
 const mentors=await entries(env,'mentors');
 return mentors.flatMap(m=>['','en/','fr/'].map(prefix=>`<url><loc>${ORIGIN}/${prefix}mentor-${m.id}.html</loc></url>`)).join('');
}
