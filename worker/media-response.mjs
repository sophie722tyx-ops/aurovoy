// File keys are immutable: replacing a work's media creates a new upload/key.
// Callers must check current publication and media ownership before calling this helper.
export const MEDIA_CACHE_PREFIX='/.media-cache/';
export const CACHEABLE_BYTES=2*1024*1024;
const cacheControl='private, no-cache, must-revalidate';
function rangeFor(raw,size){
 if(!raw)return null;
 const match=/^bytes=(\d*)-(\d*)$/.exec(raw);
 if(!match||(!match[1]&&!match[2]))throw Error('range');
 const first=match[1]?Number(match[1]):null,last=match[2]?Number(match[2]):null;
 if((first!==null&&!Number.isSafeInteger(first))||(last!==null&&!Number.isSafeInteger(last)))throw Error('range');
 const start=first??Math.max(0,size-last),end=first!==null?(last===null?size-1:Math.min(last,size-1)):size-1;
 if(start<0||start>end||start>=size)throw Error('range');
 return {offset:start,length:end-start+1};
}
async function versionOf(key,size){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key+'\n'+size));
 return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
}
export async function storedMedia(request,env,objectKey,contentType,options={}){
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 // Completed uploads have an audited length in D1. Other callers still verify R2 metadata.
 let size=options.size;
 if(!Number.isSafeInteger(size)||size<1){const head=await env.FILES.head(objectKey);if(!head)return new Response('Not found',{status:404});size=head.size;}
 const version=await versionOf(objectKey,size),etag='"'+version+'"';
 const headers=new Headers({'Content-Type':contentType,'Accept-Ranges':'bytes','Cache-Control':options.published?cacheControl:'private, no-store',ETag:etag,'X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'});
 const validators=request.headers.get('if-none-match');
 if(options.published&&validators?.split(',').some(x=>x.trim()==='*'||x.trim().replace(/^W\//,'')===etag))return new Response(null,{status:304,headers});
 const ifRange=request.headers.get('if-range');
 let range;try{range=rangeFor(!ifRange||ifRange===etag?request.headers.get('range'):null,size);}catch{return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`,'Cache-Control':'no-store'}});}
 const length=range?.length??size,status=range?206:200;
 headers.set('Content-Length',String(length));
 if(range)headers.set('Content-Range',`bytes ${range.offset}-${range.offset+range.length-1}/${size}`);
 if(request.method==='HEAD')return new Response(null,{status,headers});
 // Keep cached bytes private behind the Worker. Never cache permission decisions or
 // pre-download a large movie just to fill the cache. Small ranges also cover MP4 indexes.
 const cache=options.published&&length<=CACHEABLE_BYTES?globalThis.caches?.default:null;
 const cacheKey=cache?new Request(new URL(MEDIA_CACHE_PREFIX+'v1/'+version+'/'+(range?.offset??0)+'-'+length,new URL(request.url).origin),{method:'GET'}):null;
 if(cache){
  try{const hit=await cache.match(cacheKey);if(hit){headers.set('Server-Timing','media;desc="edge-hit"');return new Response(hit.body,{status,headers});}}catch{/* A cache failure must not prevent playback. */}
 }
 const storageStart=performance.now();
 const object=await env.FILES.get(objectKey,range?{range}:undefined);
 const storageMs=performance.now()-storageStart;
 if(!object)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 const result=new Response(object.body,{status,headers});
 if(cache&&options.context?.waitUntil){
  const copy=result.clone();
  options.context.waitUntil(cache.put(cacheKey,new Response(copy.body,{status:200,headers:{'Content-Type':contentType,'Content-Length':String(length),'Cache-Control':'public, max-age=86400'}})).catch(()=>{}));
 }
 result.headers.set('Server-Timing','media;desc="storage";dur='+storageMs.toFixed(1));
 return result;
}
