import {entries,entry} from './content-store.mjs';
import {esc,ORIGIN} from './views.mjs';
import {refineLearning} from '../learning-pages.mjs';
import {courseCases} from '../course-details.mjs';
import {addParentNavigation} from '../page-navigation.mjs';
const lineList=s=>s.split('\n').map(x=>x.trim()).filter(Boolean);
const escapeTree=value=>Array.isArray(value)?value.map(escapeTree):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,escapeTree(v)])):typeof value==='string'?esc(value):value;
const response=(body,status=200)=>new Response(body,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(status===404?{'X-Robots-Tag':'noindex'}:{})}});
const unavailable=(lang,parent)=>response(`<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><main class="section"><h1>${{zh:'该内容暂未公开',en:'This content is not currently available',fr:'Ce contenu n’est pas disponible'}[lang]}</h1><a class="parent-back" href="${lang==='zh'?'':`/${lang}`}/${parent}">← ${ {zh:'返回上一级',en:'Back to parent',fr:'Retour'}[lang]}</a></main></html>`,404);
function documentWithBody(template,body,name,description){return template.replace(/<main id="main">[\s\S]*?<\/main>/,`<main id="main">${body}</main>`).replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(name)} | AUROVOY 元启程</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${esc(description)}">`);}
export async function contentPublic(pathname,env,pages){
 const match=pathname.match(/^\/(?:(en|fr)\/)?(training|mentors|mentor-[a-z0-9-]+|course-[a-z0-9-]+)(?:\.html)?\/?$/);if(!match)return null;
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
 const items=await entries(env,'courses');
 if(file.startsWith('course-')&&!items.some(c=>file===`course-${c.id}.html`))return unavailable(lang,'training.html');
 const courses=items.map(c=>escapeTree({...c,results:c.results.map(s=>lineList(s))}));
 const curricula=Object.fromEntries(courses.map(c=>[c.id,c.modules.map(m=>[0,1,2].map(l=>['title','lesson','exercise','outcome'].map(k=>m[k][l]||m[k][0])))]));
 const asset=name=>{const c=items.find(c=>name===`case-${courseCases[c.id].asset}.webp`);return c?c.photo:'/assets/'+name;};
 let html=pages[prefix+file],body=html.match(/<main id="main">([\s\S]*?)<\/main>/)[1];
 body=refineLearning(body,file,{t,u:()=>'',asset,courses,curricula});
 if(file.startsWith('course-')){
  const c=items.find(c=>file===`course-${c.id}.html`);body=body.replace(/(<nav class="breadcrumbs"[\s\S]*?<span aria-current="page">)[\s\S]*?(<\/span>)/,(_,a,b)=>a+esc(t(c.name))+b);body=addParentNavigation(body,file,{t});
  // Time-specific introductory copy must follow the editable course duration.
  body=body.replace(/<div class="syllabus-heading">[\s\S]*?<\/div>/,block=>block.replace(/<p>([\s\S]*?)<\/p>/,`<p>${esc(t(c.time))}　${t(['按以下模块开展学习与实操','Learning and practice follow the modules below','Apprentissage et pratique selon les modules ci-dessous'])}</p>`));
  return response(documentWithBody(html,body,t(c.name),t(c.desc)));
 }
 // Selectors follow the courses that remain public, including their current order.
 body=body.replace(/<div class="goal-menu js-only"[\s\S]*?<\/div>/,()=>`<div class="goal-menu js-only" role="tablist" aria-orientation="vertical">${courses.map((c,i)=>`<button class="goal-choice" type="button" role="tab" id="learning-path-tab-${i}" aria-controls="learning-path-panel-${i}" aria-selected="${i===0}" tabindex="${i===0?0:-1}"><span class="goal-number">0${i+1}</span><span><strong>${t(c.name)}</strong><small>${t(c.time)}</small></span><b aria-hidden="true">↗</b></button>`).join('')}</div>`);
 if(!courses.length)body=body.replace(/<section class="section goal-studio">[\s\S]*?<\/section>/,`<section class="section"><p>${t(['课程安排更新中 欢迎联系咨询','Programmes are being updated Please contact us','Programmes en cours de mise à jour Contactez-nous'])}</p></section>`);
 return response(documentWithBody(html,body,t(['培训','Training','Formation']),t(['元启程 AI 创作培训','AUROVOY AI creative training','Formation créative IA AUROVOY'])));
}
export async function contentSitemap(env){const [mentors,courses]=await Promise.all([entries(env,'mentors'),entries(env,'courses')]);return [...mentors.map(m=>`mentor-${m.id}.html`),...courses.map(c=>`course-${c.id}.html`)].flatMap(file=>['','en/','fr/'].map(prefix=>`<url><loc>${ORIGIN}/${prefix}${file}</loc></url>`)).join('');}
