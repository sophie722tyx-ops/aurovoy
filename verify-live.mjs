import quality from './video-quality.json' with {type:'json'};
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const origin=process.env.VERIFY_ORIGIN||'https://aurovoy.cn';
const request=(p,options={})=>fetch(origin+p,{redirect:'manual',signal:AbortSignal.timeout(30000),...options});
const release=JSON.parse(fs.readFileSync('portfolio-release.json','utf8'));
const hidden=[36,37,38].flatMap(id=>['','en/','fr/'].map(pre=>pre+'work-'+id+'.html'));
const pages=Object.keys(JSON.parse(fs.readFileSync('worker/pages.generated.json','utf8'))).filter(p=>!hidden.includes(p));
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
const www=await fetch('https://www.aurovoy.cn/',{redirect:'manual',signal:AbortSignal.timeout(30000)});
assert.equal(www.status,200,'www custom domain');assert((await www.text()).includes('AUROVOY'));
console.log(`Live verification passed for ${origin}: ${pages.length} pages, three language homes, admin access protection, video integrity (HTTP ${video.status}), image, sitemap and www domain.`);

for(const path of hidden){const r=await request('/'+path);assert.equal(r.status,404,'retired digital presenter '+path);await r.arrayBuffer();}
for(const original of release){const w={...original,video:quality[original.id]?.video||original.video};
 for(const lang of ['','/en','/fr']){const r=await request(lang+'/work/'+w.id);assert.equal(r.status,200,w.id);const html=await r.text();assert(html.includes(w.video));assert(html.includes(w.poster));assert(html.includes('film-information'));}
 const v=await request(w.video,{headers:{Range:'bytes=0-1023'}});assert.equal(v.status,206,w.video);const bytes=new Uint8Array(await v.arrayBuffer());assert.equal(bytes.length,1024);assert.equal(String.fromCharCode(...bytes.slice(4,8)),'ftyp');
 const poster=await request(w.poster);assert.equal(poster.status,200,w.poster);await poster.arrayBuffer();
}
const science=await(await request('/works-science.html')).text();assert(science.includes('release-20260910-new-6'));assert(science.includes('科普类'));
const about=await(await request('/about.html')).text();assert(about.includes('client-10.webp'));assert(about.includes('懂车帝'));
const avatar=await(await request('/works-avatar.html')).text();assert.equal((avatar.match(/class="film-tile"/g)||[]).length,12);
console.log('Release verification: 19 complete videos with seek support, 19 covers, all new trilingual pages, 3 retired works, science category and Dongchedi logo.');

for(const [id,q] of Object.entries(quality)){
 const r=await request(q.video,{method:'HEAD'});assert.equal(r.status,200,id+' full-quality video');assert.equal(Number(r.headers.get('content-length')),q.size,id+' full file size');
 const tail=await request(q.video,{headers:{Range:'bytes='+Math.max(0,q.size-1024)+'-'}});assert.equal(tail.status,206,id+' end seek');assert.equal((await tail.arrayBuffer()).byteLength,Math.min(1024,q.size));
}
console.log('Full-quality verification: '+Object.keys(quality).length+' videos with full size and end seek support');
