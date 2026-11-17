import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

// Offline only: never encode inside a request or overwrite the uploaded original.
const recipeBase='hls-ts-range-v4-4s-480-720-1080';
const installed='C:/Users/tangy/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin';
function executable(name,override){return override||process.env[name.toUpperCase()+'_PATH']||(fs.existsSync(path.join(installed,name+'.exe'))?path.join(installed,name+'.exe'):name);}
function run(command,args){return new Promise((resolve,reject)=>{const child=spawn(command,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let out='',err='';child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>{err=(err+x).slice(-10000);});child.on('error',reject);child.on('close',code=>code===0?resolve(out):reject(new Error(`${path.basename(command)} failed (${code}): ${err}`)));});}
async function sha256(file){const hash=createHash('sha256');for await(const bytes of fs.createReadStream(file))hash.update(bytes);return hash.digest('hex');}
const even=n=>Math.max(2,Math.floor(n/2)*2);
export function ladderFor(width,height){
 const short=Math.min(width,height),levels=[{name:'480p',side:480,rate:600,max:750},{name:'720p',side:720,rate:1400,max:1800},{name:'1080p',side:1080,rate:3000,max:3200,buffer:1600}].filter(x=>x.side<=short);
 if(!levels.length)levels.push({name:even(short)+'p',side:even(short),rate:500,max:650});
 const unique=new Map();
 for(const level of levels){const scale=Math.min(level.side/short,1920/Math.max(width,height)),w=even(width*scale),h=even(height*scale);unique.set(w+'x'+h,{...level,nominalName:level.name,name:Math.min(w,h)+'p',width:w,height:h});}
 return [...unique.values()];
}
export function inspectPlaylist(text,bytes,expectedDuration){
 const lines=text.trim().split(/\r?\n/);let duration=0,pendingDuration=null,offset=0;const segments=[];
 if(!lines.includes('#EXT-X-ENDLIST')||!lines.includes('#EXT-X-INDEPENDENT-SEGMENTS'))throw Error('Incomplete or dependent playlist');
 for(const line of lines){
  if(line.startsWith('#EXTINF:'))pendingDuration=Number(line.slice(8).split(',')[0]);
  if(line.startsWith('#EXT-X-BYTERANGE:')){
   const match=/^#EXT-X-BYTERANGE:(\d+)@(\d+)$/.exec(line);if(!match||!pendingDuration||pendingDuration>4.15)throw Error('Invalid HLS segment');
   const length=Number(match[1]),start=Number(match[2]);if(start!==offset||length<1||length>2*1024*1024)throw Error('Oversized or noncontiguous segment');
   segments.push({offset:start,length,duration:pendingDuration});offset+=length;duration+=pendingDuration;pendingDuration=null;
  }
 }
 if(!segments.length||offset!==bytes||Math.abs(duration-expectedDuration)>.3)throw Error(`Incomplete duration or bytes (${duration} vs ${expectedDuration})`);
 return {segments,duration};
}
export async function preparePlayback(job,options={}){
 const {inputFile,mediaId,workId,sourceObjectKey,sourceSize}=job;
 if(!/^[-a-zA-Z0-9]{1,150}$/.test(mediaId)||!/^[-a-zA-Z0-9]{1,150}$/.test(workId)||!sourceObjectKey)throw Error('Invalid source identity');
 const input=path.resolve(inputFile),stat=fs.statSync(input);if(stat.size!==sourceSize)throw Error(`Source length mismatch for ${mediaId}: ${stat.size} vs ${sourceSize}`);
 const ffmpeg=executable('ffmpeg',options.ffmpeg),ffprobe=executable('ffprobe',options.ffprobe),preset=options.preset||'veryfast',recipe=recipeBase+'-'+preset;
 const sourceHash=await sha256(input),version=createHash('sha256').update(recipe+'\n'+sourceHash).digest('hex').slice(0,16);
 const base=path.resolve(options.out||'.wrangler/playback/prepared',mediaId),output=path.join(base,version),report=path.join(base,'catalog-entry.json');
 if(input===output||input.startsWith(output+path.sep))throw Error('Source must be outside rendition directory');
 const prior=fs.existsSync(report)?JSON.parse(fs.readFileSync(report,'utf8')):null;
 if(prior?.sourceSha256===sourceHash&&prior.recipe===recipe&&prior.workId===workId&&prior.sourceObjectKey===sourceObjectKey&&Object.entries(prior.files).every(([file,meta])=>fs.existsSync(path.join(output,file))&&fs.statSync(path.join(output,file)).size===meta.size))return prior;
 const probe=JSON.parse(await run(ffprobe,['-v','error','-show_format','-show_streams','-of','json',input]));
 const video=probe.streams.find(x=>x.codec_type==='video'),audio=probe.streams.find(x=>x.codec_type==='audio');
 if(!video)throw Error('No video stream');
 const duration=Number(video.duration||probe.format.duration);if(!Number.isFinite(duration)||duration<=0)throw Error('Invalid source duration');
 const rotation=Math.abs(Number(video.side_data_list?.find(x=>x.rotation!==undefined)?.rotation||0))%180;
 const sar=(video.sample_aspect_ratio||'1:1').split(':').map(Number),ratio=sar[0]/sar[1],aspect=Number.isFinite(ratio)&&ratio>0?ratio:1;
 const width=rotation===90?video.height:Math.round(video.width*aspect),height=rotation===90?Math.round(video.width*aspect):video.height;
 const rate=(video.avg_frame_rate||video.r_frame_rate||'25/1').split('/').map(Number),fps=Math.min(30,rate[0]/rate[1]||25),fpsText=fps.toFixed(6),gop=Math.ceil(fps*4);
 const files={},variants=[];fs.mkdirSync(output,{recursive:true});
 for(const level of ladderFor(width,height)){
  const folder=path.join(output,level.name);fs.mkdirSync(folder,{recursive:true});
  const playlist=path.join(folder,'index.m3u8');
  // Reuse only unchanged encoding settings from audited earlier recipes, then
  // validate again. v4 also labels the actual short side and removes duplicate sizes.
  const previousVersion=prior?.prefix?.match(/\/([a-f0-9]{16})$/)?.[1];
  const priorRecipe=prior?.recipe?.match(/^hls-ts-range-v([123])-4s-480-720-1080-(.+)$/),priorLevel=prior?.variants?.find(v=>v.name===level.nominalName&&v.width===level.width&&v.height===level.height);
  const reusable=prior?.sourceSha256===sourceHash&&priorRecipe?.[2]===preset&&(Number(priorRecipe[1])>=2||level.side<=720)&&previousVersion&&priorLevel&&['index.m3u8','stream.ts'].every(file=>{const source=path.join(base,previousVersion,priorLevel.name,file);return fs.existsSync(source)&&fs.statSync(source).size===prior.files[priorLevel.name+'/'+file]?.size;});
  if(reusable)for(const file of ['index.m3u8','stream.ts'])fs.copyFileSync(path.join(base,previousVersion,priorLevel.name,file),path.join(folder,file));
  else await run(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-y','-threads','2','-filter_threads','2','-i',input,'-map','0:v:0',...(audio?['-map','0:a:0']:[]),'-vf',`scale=${level.width}:${level.height}:flags=lanczos,setsar=1,fps=${fpsText}`,'-c:v','libx264','-preset',preset,'-threads','2','-profile:v','high','-level:v','4.1','-pix_fmt','yuv420p','-b:v',level.rate+'k','-maxrate',level.max+'k','-bufsize',(level.buffer||level.max)+'k','-g',String(gop),'-keyint_min',String(gop),'-sc_threshold','0','-force_key_frames','expr:gte(t,n_forced*4)','-flags','+cgop',...(audio?['-c:a','aac','-b:a',level.side<=480?'64k':'96k','-ac','2','-ar','48000']:[]),'-max_muxing_queue_size','2048','-f','hls','-hls_time','4','-hls_playlist_type','vod','-hls_list_size','0','-hls_segment_type','mpegts','-hls_flags','single_file+independent_segments','-hls_segment_filename',path.join(folder,'stream.ts'),playlist]);
  const stream=path.join(folder,'stream.ts'),streamBytes=fs.statSync(stream).size,playlistText=fs.readFileSync(playlist,'utf8');
  const checked=inspectPlaylist(playlistText,streamBytes,duration);
  const encoded=JSON.parse(await run(ffprobe,['-v','error','-show_streams','-show_packets','-select_streams','v:0','-show_entries','stream=codec_name,width,height,profile,level:packet=pos,flags','-of','json',stream]));
  const actual=encoded.streams[0];if(actual?.codec_name!=='h264'||actual.width!==level.width||actual.height!==level.height)throw Error('Unexpected rendition format');
  for(const segment of checked.segments){const first=encoded.packets.find(packet=>Number(packet.pos)>=segment.offset&&Number(packet.pos)<segment.offset+segment.length);if(!first?.flags?.includes('K'))throw Error('Segment does not start with a key frame');}
  if(audio){const sound=JSON.parse(await run(ffprobe,['-v','error','-show_streams','-select_streams','a:0','-of','json',stream]));if(sound.streams[0]?.codec_name!=='aac')throw Error('Missing rendition audio');const sourceAudioDuration=Number(audio.duration),outputAudioDuration=Number(sound.streams[0].duration);if(sourceAudioDuration>0&&outputAudioDuration>0&&Math.abs(sourceAudioDuration-outputAudioDuration)>.3)throw Error('Rendition audio duration changed');}
  files[level.name+'/index.m3u8']={size:fs.statSync(playlist).size,type:'application/vnd.apple.mpegurl'};
  files[level.name+'/stream.ts']={size:streamBytes,type:'video/mp2t'};
  variants.push({name:level.name,width:level.width,height:level.height,bandwidth:Math.ceil(Math.max(...checked.segments.map(x=>x.length*8/x.duration))),averageBandwidth:Math.ceil(streamBytes*8/checked.duration),duration:checked.duration,segments:checked.segments.length,maxSegmentBytes:Math.max(...checked.segments.map(x=>x.length))});
 }
 const master=['#EXTM3U','#EXT-X-VERSION:4','#EXT-X-INDEPENDENT-SEGMENTS',...variants.flatMap(v=>[`#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},AVERAGE-BANDWIDTH=${v.averageBandwidth},RESOLUTION=${v.width}x${v.height},FRAME-RATE=${fps.toFixed(3)},CODECS="avc1.640029${audio?',mp4a.40.2':''}",NAME="${v.name}"`,v.name+'/index.m3u8']),''].join('\n');
 fs.writeFileSync(path.join(output,'master.m3u8'),master);files['master.m3u8']={size:Buffer.byteLength(master),type:'application/vnd.apple.mpegurl'};
 const result={workId,source:job.source||'/media/'+mediaId,sourceObjectKey,sourceSize,sourceSha256:sourceHash,recipe,duration,width,height,fps,hasAudio:!!audio,prefix:`playback/v1/${mediaId}/${version}`,files,variants};
 const staged=report+'.tmp';fs.writeFileSync(staged,JSON.stringify(result,null,2));fs.renameSync(staged,report);return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args={};for(let i=2;i<process.argv.length;i+=2){if(!process.argv[i].startsWith('--')||!process.argv[i+1])throw Error('Use --job <job.json> [--out directory] [--ffmpeg path] [--ffprobe path]');args[process.argv[i].slice(2)]=process.argv[i+1];}
 if(!args.job)throw Error('Missing --job JSON file');
 const job=JSON.parse(fs.readFileSync(args.job,'utf8'));const result=await preparePlayback(job,args);console.log(JSON.stringify({mediaId:job.mediaId,prefix:result.prefix,variants:result.variants,duration:result.duration}));
}
