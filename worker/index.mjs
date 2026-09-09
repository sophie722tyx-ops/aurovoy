import {allWorks,getWork,workPath} from './repository.mjs';
import {isAdmin,identity,authenticate,loginURL} from './auth.mjs';
import {adminApi,media,json} from './api.mjs';
import {filmGroups,detailPage,adminPage,ORIGIN,esc} from './views.mjs';
import pages from './pages.generated.json' with {type:'json'};
import {synchronizeEditorial} from './publication.mjs';
import {contentApi,contentImage} from './content-api.mjs';
import {contentAdminPage,adminNavigation} from './content-admin.mjs';
import {contentPublic,contentSitemap} from './content-public.mjs';
const response=(html,status=200,extra={})=>new Response(html,{status,headers:{'Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store',...extra}});
const denied=()=>response('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>管理权限 | AUROVOY</title><link rel="stylesheet" href="/admin.css"><main class="admin-main"><h1>此账号没有管理权限</h1><p>请使用已授权的管理员邮箱登录</p><a href="/cdn-cgi/access/logout">切换账号</a>　<a href="/">返回网站</a></main></html>',403);
const handler={async fetch(request,env){
 try{
  const url=new URL(request.url);let p=url.pathname;
  // Accept older clean URLs while retaining the established .html canonical links.
  if(/^\/(?:en\/|fr\/)?(?:works(?:-[a-z]+)?|work-\d+)\/?$/.test(p))p=p.replace(/\/$/,'')+'.html';
  if(p.startsWith('/api/admin/content/'))return await contentApi(request,env);
  if(p.startsWith('/api/admin/'))return await adminApi(request,env);
  if(/^\/admin(?:\/(?:mentors|training))?\/?$/.test(p)){
   if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD||!env.ADMIN_EMAIL)return response('<h1>管理员登录尚未配置</h1><p>请先完成 Cloudflare Access 设置。</p>',503,{'X-Robots-Tag':'noindex'});
   if(!identity(request,env))return new Response(null,{status:302,headers:{Location:loginURL(request,env),'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
   if(!isAdmin(request,env))return denied();
   return response(p.includes('/mentors')?contentAdminPage('mentors'):p.includes('/training')?contentAdminPage('courses'):adminNavigation(adminPage()),200,{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});
  }
  if(p.startsWith('/media/')){if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});return await media(request,env,p.slice(7));}
  if(p.startsWith('/content-media/')){if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});return await contentImage(request,env,p.slice(15));}
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});
  if(p==='/robots.txt')return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /cdn-cgi/\nSitemap: ${ORIGIN}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain; charset=utf-8'}});
  if(p==='/sitemap.xml'){
   const xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(pages).filter(f=>!/(?:^|\/)(?:work-\d|mentor-|course-)/.test(f)).map(f=>`<url><loc>${ORIGIN}/${f.replace(/index.html$/,'')}</loc></url>`).join('')}${await contentSitemap(env)}</urlset>`;const works=await allWorks(env);
   const urls=works.flatMap(w=>['zh','en','fr'].map(l=>`<url><loc>${ORIGIN}${workPath(w,l)}</loc><lastmod>${esc(w.updatedAt.slice(0,10))}</lastmod></url>`)).join('');
   return new Response(xml.replace('</urlset>',urls+'</urlset>'),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-cache'}});
  }
  const editorialResponse=await contentPublic(p,env,pages);if(editorialResponse)return editorialResponse;
  const matched=p.match(/^\/(?:(en|fr)\/)?(work-(\d+)\.html|work\/([a-z0-9-]+))$/);
  if(matched){const lang=matched[1]||'zh',work=await getWork(env,matched[3]?`legacy-${matched[3]}`:matched[4]);if(!work||work.status!=='published')return response('<h1>作品暂未公开</h1><a href="/works.html">返回作品</a>',404,{'X-Robots-Tag':'noindex'});
   if(matched[3]&&work.updatedAt==='2026-09-08T00:00:00Z')return response(synchronizeEditorial(pages[p.slice(1)],await allWorks(env,true)));
   return response(detailPage(pages[`${lang==='zh'?'':lang+'/'}work-3.html`],work,lang));
  }
  const gallery=p.match(/^\/(?:(en|fr)\/)?works(?:-([a-z]+))?\.html$/);
  if(gallery){const original=pages[p.slice(1)];if(!original)return response('Not found',404);const works=await allWorks(env);const list=gallery[2]?works.filter(w=>w.category===gallery[2]):works;
   return response(synchronizeEditorial(original.replace(/<!--portfolio-start-->[\s\S]*?<!--portfolio-end-->/g,filmGroups(list,gallery[1]||'zh')),await allWorks(env,true)));
  }
  if(p.startsWith('/.openai')||p.startsWith('/server/'))return new Response('Not found',{status:404});
  const pageKey=p==='/'?'index.html':/^\/(en|fr)\/?$/.test(p)?p.slice(1).replace(/\/$/,'')+'/index.html':p.slice(1);
  if(pages[pageKey])return response(synchronizeEditorial(pages[pageKey],await allWorks(env,true)));
  if(pages[pageKey+'.html'])return new Response(null,{status:301,headers:{Location:'/'+pageKey+'.html'}});
  const asset=await env.ASSETS.fetch(request);const result=new Response(asset.body,asset);result.headers.set('X-Content-Type-Options','nosniff');return result;
 }catch(error){console.error('Request failed',error?.status||500,error?.message);return json({error:error.status?error.message:'暂时无法完成操作 请稍后重试'},error.status||500);}
}};


// Identity is verified at the only Worker entry point. Never trust caller-supplied identity headers.
export default {async fetch(request,env){
 env=await authenticate(request,env);
 const result=await handler.fetch(request,env);
 const type=result.headers.get('content-type')||'';
 if(type.includes('text/html')||type.includes('application/xml')||new URL(request.url).pathname==='/robots.txt'){
  const configured=env.PUBLIC_ORIGIN||new URL(request.url).origin;
  let publicOrigin;try{const u=new URL(configured);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw Error();publicOrigin=u.origin;}catch{return new Response('Invalid PUBLIC_ORIGIN configuration',{status:503});}
  const headers=new Headers(result.headers);headers.delete('content-length');
  return new Response(request.method==='HEAD'?null:(await result.text()).replaceAll(ORIGIN,publicOrigin),{status:result.status,headers});
 }
 return request.method==='HEAD'?new Response(null,{status:result.status,headers:result.headers}):result;
}};
