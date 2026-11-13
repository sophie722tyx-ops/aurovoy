import {isAdmin} from './auth.mjs';

// Keep the content and its publication state intact so reopening is reversible.
export const sitePaused=env=>String(env.PUBLIC_SITE_PAUSED).toLowerCase()==='true';
export function retiredWorldResponse(request){
 let p=new URL(request.url).pathname;try{p=decodeURIComponent(p);}catch{}
 if(!/^\/(?:(?:en|fr)\/)?world(?:\/|\.html(?:\/|$)|$)/i.test(p))return null;
 return new Response(request.method==='HEAD'?null:'This page is no longer available.',{status:410,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});
}
const adminAssets=new Set(['/admin.css','/content-admin.css','/creators.css','/admin.js','/content-admin.js','/members.js','/creator-works.js','/media-frame.js','/assets/mark.png','/assets/brand-sans.woff2']);
const notice=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>AUROVOY · 暂未开放</title><style>*{box-sizing:border-box}body{margin:0;min-height:100svh;background:#f8f2e5;color:#253d68;font-family:Arial,"Microsoft YaHei",sans-serif;display:grid;place-items:center;padding:28px}main{width:min(100%,620px);padding:64px 0;border-top:1px solid #c9c8c3;border-bottom:1px solid #c9c8c3}.brand{font-size:20px;font-weight:700;letter-spacing:.2em;margin:0 0 76px}.line{width:44px;height:3px;background:#d6aa5e;margin-bottom:28px}h1{font-size:clamp(30px,6vw,48px);letter-spacing:.02em;margin:0 0 22px;line-height:1.3}p{line-height:1.8;color:#60708a;margin:0 0 12px}.en{font-size:14px;letter-spacing:.02em}footer{font-size:11px;letter-spacing:.18em;margin-top:72px;color:#738098}@media(max-width:480px){main{padding:40px 0}.brand{margin-bottom:52px}footer{margin-top:48px}}</style></head><body><main><p class="brand">AUROVOY</p><div class="line"></div><h1>官网暂未开放</h1><p>我们正在整理新的内容，感谢你的关注。</p><p class="en" lang="en">Our website is temporarily unavailable.<br>Thank you for your interest.</p><footer>CULTURE &amp; TECHNOLOGY</footer></main></body></html>`;

export function maintenanceResponse(request,env){
 if(!sitePaused(env)||isAdmin(request,env))return null;
 const p=new URL(request.url).pathname;
 // These endpoints retain their existing authentication and role checks.
 if(/^\/admin(?:\/(?:mentors|training|creators|members))?\/?$/.test(p)||p.startsWith('/api/admin/')||adminAssets.has(p))return null;
 const robots=p==='/robots.txt';
 return new Response(request.method==='HEAD'?null:robots?'User-agent: *\nDisallow: /\n':notice,{
  status:robots?200:503,
  headers:{'Content-Type':robots?'text/plain; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'private, no-store, max-age=0','Cloudflare-CDN-Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff','Retry-After':'3600','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"},
 });
}

export function privateDuringPause(result,env){
 if(!sitePaused(env))return result;
 const headers=new Headers(result.headers);
 headers.set('Cache-Control','private, no-store, max-age=0');
 headers.set('Cloudflare-CDN-Cache-Control','no-store');
 headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
 return new Response(result.body,{status:result.status,statusText:result.statusText,headers});
}
