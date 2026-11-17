import catalog from '../playback-catalog.json' with {type:'json'};
import quality from '../video-quality.json' with {type:'json'};
import {getWork} from './repository.mjs';
import {isAdmin} from './auth.mjs';
import {sitePaused} from './maintenance.mjs';
import {storedMedia} from './media-response.mjs';

const types={m3u8:'application/vnd.apple.mpegurl',ts:'video/mp2t',m4s:'video/mp4',mp4:'video/mp4'};
const safeFile=/^(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:m3u8|ts|m4s|mp4)$/;
const denied=(request,status=404)=>new Response(request.method==='HEAD'?null:status===503?'Temporarily unavailable':'Not found',{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(status===405?{Allow:'GET, HEAD'}:{})}});

// Catalog entries only become available after every derived file has been uploaded
// and checked. Original upload IDs and playback version prefixes are immutable.
export async function playback(request,env,context,entries=catalog){
 if(!['GET','HEAD'].includes(request.method))return denied(request,405);
 const match=new URL(request.url).pathname.match(/^\/playback\/([a-z0-9-]{1,160})\/(.+)$/);
 if(!match)return denied(request);
 const [,id,tail]=match;
 if(!Object.hasOwn(entries,id))return denied(request);
 const entry=entries[id];
 if(!entry||!/^playback\/v1\/[a-z0-9-]{1,160}\/[a-zA-Z0-9_-]+$/.test(entry.prefix)||!entry.prefix.startsWith('playback/v1/'+id+'/'))return denied(request);
 const version=entry.prefix.split('/').pop(),legacy=tail==='master.m3u8';
 if(!legacy&&!tail.startsWith(version+'/'))return denied(request);
 const file=legacy?tail:tail.slice(version.length+1);
 if(!safeFile.test(file))return denied(request);
 // These two editorial videos have no work row. Their original URL, object key
 // and byte length must match the existing trusted showcase inventory exactly.
 const showcaseKey=id==='showcase-global-en'?'global-en':id==='showcase-global-pt'?'global-pt':null;
 const original=showcaseKey?quality[showcaseKey]:null;
 const showcase=!!original?.showcase&&entry.workId===id&&entry.source===original.video&&entry.sourceObjectKey===original.objectKey&&entry.sourceSize===original.size;
 if(id.startsWith('showcase-')?!showcase:entry.source!=='/media/'+id)return denied(request);
 if(!entry.files||!Object.hasOwn(entry.files,file))return denied(request);
 const metadata=entry.files[file];
 if(!Number.isSafeInteger(metadata?.size)||metadata.size<1)return denied(request);
 const admin=isAdmin(request,env),paused=sitePaused(env);
 if(paused&&!admin)return denied(request,503);
 // Never cache this decision: replacing, deleting or unpublishing a work must
 // also revoke already cached manifests, segments and conditional responses.
 const start=performance.now(),work=showcase?null:await getWork(env,entry.workId);
 if(!showcase&&(!work||work.video!==entry.source||!(work.status==='published'||work.status==='draft'&&admin)))return denied(request);
 // Older pages may still request the pilot's unversioned master. Resolve it
 // only after live authorization. Never reinterpret old variant byte offsets
 // against a newer encoding of the same original upload.
 if(legacy)return new Response(null,{status:302,headers:{Location:`/playback/${id}/${version}/master.m3u8`,'Cache-Control':'no-store'}});
 const accessMs=performance.now()-start;
 const result=await storedMedia(request,env,entry.prefix+'/'+file,types[file.split('.').pop()],{size:metadata.size,published:(showcase||work.status==='published')&&!paused,context});
 result.headers.append('Server-Timing','access;dur='+accessMs.toFixed(1));
 return result;
}
