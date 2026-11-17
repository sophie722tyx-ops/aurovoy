import test from 'node:test';
import assert from 'node:assert/strict';
import './src/adaptive-video.js';

const {createPlayback,parseVariants}=globalThis.AurovoyVideoCore;
class Video extends EventTarget{
 constructor(native=false){super();this.src='';this.paused=true;this.currentTime=0;this.duration=100;this.readyState=1;this.native=native;this.plays=0;this.loads=0;}
 play(){this.paused=false;this.plays++;return Promise.resolve();}
 pause(){this.paused=true;}
 load(){this.loads++;}
 removeAttribute(name){if(name==='src')this.src='';}
 canPlayType(){return this.native?'maybe':'';}
}
function fixture(options={}){
 const instances=[],states=[],levels=[],video=new Video(options.native);
 class Hls{
  static Events={MEDIA_ATTACHED:'attached',MANIFEST_PARSED:'manifest',ERROR:'error'};
  static isSupported(){return options.supported!==false;}
  constructor(config){this.config=config;this.events=new Map();this.levels=[{width:854,height:480},{width:720,height:1280}];instances.push(this);}
  on(event,fn){this.events.set(event,fn);}
  emit(event,data){this.events.get(event)?.(event,data);}
  attachMedia(v){this.video=v;this.emit('attached');}
  loadSource(url){this.url=url;}
  destroy(){this.destroyed=true;}
 }
 let calls=0;
 const controller=createPlayback({video,source:'/media/movie',manifest:'/playback/movie/master.m3u8',loadHls:options.loadHls||(()=>{calls++;return Promise.resolve(Hls);}),onState:s=>states.push(s),onLevels:l=>levels.push(l),fetchManifest:options.fetchManifest});
 return {controller,video,instances,states,levels,Hls,get calls(){return calls;}};
}
test('opening a prepared player does not fetch or start a video; HLS starts on explicit play',async()=>{
 const f=fixture();assert.equal(f.calls,0);assert.equal(f.video.plays,0);assert.equal(f.instances.length,0);
 await f.controller.play();assert.equal(f.calls,1);assert.equal(f.instances[0].url,'/playback/movie/master.m3u8');assert.equal(f.video.src,'');
 f.instances[0].emit('manifest');await Promise.resolve();
 assert.equal(f.video.paused,false);assert.equal(f.instances[0].currentLevel,-1);assert.equal(f.instances[0].config.startLevel,0);
 assert.deepEqual(f.levels[0],[{value:'0',label:'480p'},{value:'1',label:'720p'}]);
 f.video.currentTime=17;f.controller.select('1');assert.equal(f.instances[0].nextLevel,1);assert.equal(f.video.currentTime,17);
 f.controller.select('auto');assert.equal(f.instances[0].nextLevel,-1);
 f.controller.destroy();assert(f.instances[0].destroyed);assert.equal(f.video.src,'');assert(f.video.paused);
});
test('closing while the lazy player script is loading never attaches an engine or resumes playback',async()=>{
 let resolve;const waiting=new Promise(r=>resolve=r),f=fixture({loadHls:()=>waiting});
 const task=f.controller.play();f.controller.destroy();resolve(f.Hls);await task;
 assert.equal(f.instances.length,0);assert.equal(f.video.plays,0);assert.equal(f.video.src,'');
});
test('fatal HLS failure falls back once to original and retains the current position',async()=>{
 const f=fixture();await f.controller.play();f.instances[0].emit('manifest');f.video.currentTime=23;
 f.instances[0].emit('error',{fatal:true});assert(f.instances[0].destroyed);assert.equal(f.controller.mode,'original');assert.equal(f.video.src,'/media/movie');
 f.video.currentTime=0;f.video.dispatchEvent(new Event('loadedmetadata'));assert.equal(f.video.currentTime,23);
 f.video.dispatchEvent(new Event('error'));assert.equal(f.states.at(-1),'error');assert.equal(f.instances.length,1);
 f.controller.destroy();
});
test('switching Original to adaptive preserves a paused position without forcing playback',async()=>{
 const f=fixture();f.controller.select('original');await f.controller.play();assert.equal(f.calls,0);assert.equal(f.video.src,'/media/movie');
 f.video.dispatchEvent(new Event('loadedmetadata'));f.video.pause();f.video.currentTime=42;const plays=f.video.plays;
 await f.controller.select('auto');f.video.readyState=0;f.instances[0].emit('manifest');
 assert.equal(f.video.plays,plays);f.video.currentTime=0;f.video.readyState=1;f.video.dispatchEvent(new Event('loadedmetadata'));
 assert.equal(f.video.currentTime,42);assert(f.video.paused);f.controller.destroy();
});
test('native HLS remains available without MSE and variant fetch is cancelled when preview closes',async()=>{
 let signal;const f=fixture({supported:false,native:true,fetchManifest:async(_url,s)=>{signal=s;return [{value:'native:https://aurovoy.cn/playback/movie/720p/index.m3u8',label:'720p'}];}});
 await f.controller.play();assert.equal(f.controller.mode,'native');assert.equal(f.video.src,'/playback/movie/master.m3u8');assert.equal(f.levels[0][0].label,'720p');
 f.video.currentTime=12;f.controller.select('native:https://aurovoy.cn/playback/movie/720p/index.m3u8');assert.equal(f.video.src,'https://aurovoy.cn/playback/movie/720p/index.m3u8');
 assert(signal.aborted);f.controller.destroy();assert(f.video.paused);
});
test('unsupported HLS and failed vendor loading retain original MP4 playback',async()=>{
 for(const options of [{supported:false},{loadHls:()=>Promise.reject(Error('offline'))}]){
  const f=fixture(options);await f.controller.play();assert.equal(f.controller.mode,'original');assert.equal(f.video.src,'/media/movie');assert(f.states.includes('fallback'));f.controller.destroy();
 }
});
test('native quality choices accept only same-origin playback variants and preserve portrait labels',()=>{
 const variants=parseVariants('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=900000,RESOLUTION=480x854\n480p/index.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720\nhttps://evil.test/video.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1920x1080\n/admin\n','https://aurovoy.cn/playback/movie/master.m3u8');
 assert.deepEqual(variants,[{value:'native:https://aurovoy.cn/playback/movie/480p/index.m3u8',label:'480p'}]);
});
