import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
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
// HTTP permits an origin to ignore Range and return the complete representation.
// Workers Assets currently uses that valid 200 response for some static videos.
assert([200,206].includes(video.status),'video delivery');
const videoBytes=Buffer.from(await video.arrayBuffer());
const sourceVideo=fs.readFileSync('src/assets/global-en.mp4');
if(video.status===206){assert.equal(videoBytes.byteLength,1024);assert(videoBytes.equals(sourceVideo.subarray(0,1024)));}
else assert.equal(createHash('sha256').update(videoBytes).digest('hex'),createHash('sha256').update(sourceVideo).digest('hex'),'complete video integrity');
const image=await request('/assets/mark.png');assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/^image\//);await image.arrayBuffer();
const sitemap=await request('/sitemap.xml');assert.equal(sitemap.status,200);assert((await sitemap.text()).includes(origin));
console.log(`Live verification passed: ${pages.length} pages, three language homes, admin access protection, video integrity (HTTP ${video.status}), image and sitemap.`);

