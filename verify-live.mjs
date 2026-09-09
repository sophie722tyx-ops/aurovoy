import fs from 'node:fs';
import assert from 'node:assert/strict';
const origin='https://aurovoy.sophie722tyx.workers.dev';
const request=(p,options={})=>fetch(origin+p,{redirect:'manual',signal:AbortSignal.timeout(30000),...options});
const pages=Object.keys(JSON.parse(fs.readFileSync('worker/pages.generated.json','utf8')));
let cursor=0;
await Promise.all(Array.from({length:4},async()=>{
 while(cursor<pages.length){
  const p='/'+pages[cursor++];let r;
  for(let attempt=0;attempt<3;attempt++){r=await request(p);if(r.status!==404)break;await r.arrayBuffer();await new Promise(resolve=>setTimeout(resolve,2000));}
  assert.equal(r.status,200,p);const body=await r.text();
  assert(body.includes('AUROVOY'),p);assert(!body.includes('https://aurovoy.invalid'),p+' placeholder origin');
 }
}));
for(const p of ['/','/en/','/fr/']){const r=await request(p);assert.equal(r.status,200,p);await r.arrayBuffer();}
for(const p of ['/admin','/admin/mentors','/admin/training','/api/admin/works']){
 const r=await request(p,{headers:{'oai-user-email':'sophie722tyx@gmail.com','oai-user-id':'forged'}});
 assert([302,303,401,403].includes(r.status),p+' must reject unauthenticated access');
 if(r.status===302||r.status===303)assert.equal(new URL(r.headers.get('location'),origin).hostname,'aurovoy-sophie722tyx.cloudflareaccess.com');
 await r.arrayBuffer();
}
const video=await request('/assets/global-en.mp4',{headers:{Range:'bytes=0-1023'}});
assert.equal(video.status,206,'video range playback');assert.equal((await video.arrayBuffer()).byteLength,1024);
const image=await request('/assets/mark.png');assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/^image\//);await image.arrayBuffer();
const sitemap=await request('/sitemap.xml');assert.equal(sitemap.status,200);assert((await sitemap.text()).includes(origin));
console.log(`Live verification passed: ${pages.length} pages, three language homes, admin access protection, video range, image and sitemap.`);
