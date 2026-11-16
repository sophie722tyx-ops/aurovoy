import test from 'node:test';
import assert from 'node:assert/strict';
import './src/upload-drop.js';

const {prepareFile,hasFiles,bindDropZone}=globalThis.AurovoyUploads;
const MB=1024*1024;
const file=(name='cover.png',type='image/png',size=32)=>new File([new Uint8Array(size)],name,{type,lastModified:123456});

class Element extends EventTarget {
 constructor(){
  super();
  const classes=new Set();
  this.classList={add:value=>classes.add(value),remove:value=>classes.delete(value),contains:value=>classes.has(value)};
  this.files=[];
  this.value='';
 }
}
function transfer(files=[],options={}){
 return {files,types:['Files'],items:files.map(()=>({kind:'file'})),dropEffect:'none',...options};
}
function dispatch(target,name,dataTransfer){
 const event=new Event(name,{bubbles:true,cancelable:true});
 Object.defineProperty(event,'dataTransfer',{value:dataTransfer});
 target.dispatchEvent(event);
 return event;
}
function fixture(kind='poster',blocked=()=>'',onFile){
 const zone=new Element(),input=new Element(),received=[],errors=[];
 const reset=bindDropZone({zone,input,kind,blocked,onFile:value=>{received.push(value);onFile?.(value);},onError:value=>errors.push(value)});
 return {zone,input,received,errors,reset,drop:(files,options)=>dispatch(zone,'drop',transfer(files,options)),choose(files){input.files=files;input.value='C:\\fakepath\\selected';input.dispatchEvent(new Event('change'));}};
}

test('dropping and choosing use the same validation and accept only supported media',()=>{
 for(const [kind,name,type]of [['poster','cover.jpg','image/jpeg'],['poster','cover.png','image/png'],['poster','cover.webp','image/webp'],['video','film.mp4','video/mp4']]){
  const f=fixture(kind),media=file(name,type);
  assert.equal(f.drop([media]).defaultPrevented,true);
  f.choose([media]);
  assert.deepEqual(f.received,[media,media]);
  assert.deepEqual(f.errors,[]);
  assert.equal(f.input.value,'');
  // Clearing the input permits selecting the same file again after a retry.
  f.choose([media]);
  assert.equal(f.received.length,3);
 }
 for(const [kind,media]of [['poster',file('film.mp4','video/mp4')],['video',file()],['poster',file('cover.svg','image/svg+xml')],['video',file('film.mov','video/quicktime')],['video',file('disguised.mp4','text/plain')]]){
  const f=fixture(kind);f.drop([media]);f.choose([media]);
  assert.equal(f.received.length,0);
  assert.equal(f.errors.length,2);
  assert.match(f.errors[0],/MP4|JPG/);
 }
});

test('empty or generic MIME types are inferred without changing file contents',async()=>{
 for(const [kind,name,originalType,expectedType]of [['poster','封面.JPG','','image/jpeg'],['poster','封面.JPEG','application/octet-stream','image/jpeg'],['poster','封面.PNG','','image/png'],['poster','封面.WEBP','','image/webp'],['video','完整原片.MP4','','video/mp4']]){
  const original=file(name,originalType),prepared=prepareFile([original],kind);
  assert.equal(prepared.type,expectedType);
  assert.equal(prepared.name,original.name);
  assert.equal(prepared.size,original.size);
  assert.equal(prepared.lastModified,original.lastModified);
  assert.deepEqual(await prepared.arrayBuffer(),await original.arrayBuffer());
 }
 assert.throws(()=>prepareFile([file('cover.gif','')],'poster'),/JPG/);
 assert.throws(()=>prepareFile([file('no-extension','')],'video'),/MP4/);
});

test('invalid sizes are rejected before upload and exact limits remain accepted',()=>{
 for(const [kind,name,type,limit]of [['poster','cover.png','image/png',10*MB],['video','film.mp4','video/mp4',500*MB]]){
  for(const size of [0,11,limit+1]){
   // Size-only doubles avoid allocating a 500 MB fixture; the callback must never receive them.
   const f=fixture(kind),media={name,type,size};f.drop([media]);f.choose([media]);
   assert.equal(f.received.length,0);
   assert.equal(f.errors.length,2);
   assert.match(f.errors[0],size<12?/为空或不完整/:/最大/);
  }
  for(const size of [12,limit]){const media={name,type,size};assert.equal(prepareFile([media],kind),media);}
 }
});

test('multiple files and folders are rejected as a whole, while a cancelled chooser is silent',()=>{
 const f=fixture(),a=file(),b=file('second.jpg','image/jpeg');
 f.drop([a,b]);f.choose([a,b]);
 assert.equal(f.received.length,0);
 assert.equal(f.errors.length,2);
 assert(f.errors.every(message=>message.includes('一次只能上传一个')));
 f.drop([a],{items:[{kind:'file',webkitGetAsEntry:()=>({isDirectory:true})}]});
 assert.equal(f.received.length,0);
 assert.match(f.errors.at(-1),/不支持文件夹/);
 f.drop([],{items:[{kind:'file',webkitGetAsEntry:()=>({isDirectory:true})}]});
 assert.match(f.errors.at(-1),/不支持文件夹/);
 const errors=f.errors.length;f.choose([]);
 assert.equal(f.errors.length,errors);
 assert.equal(f.input.value,'');
});

test('saving and duplicate uploads block user input, while the other media kind can proceed',()=>{
 const jobs=new Set();let saving=false,open=true;
 const make=kind=>fixture(kind,()=>!open?'请先打开作品编辑窗口':saving?'正在保存，请稍后上传':jobs.has(kind)?'该文件正在上传':'',()=>jobs.add(kind));
 const poster=make('poster'),video=make('video'),image=file(),movie=file('film.mp4','video/mp4');
 poster.drop([image]);video.choose([movie]);
 assert.deepEqual([...jobs],['poster','video']);
 assert.equal(poster.received.length,1);assert.equal(video.received.length,1);
 poster.choose([image]);video.drop([movie]);
 assert.equal(poster.received.length,1);assert.equal(video.received.length,1);
 assert.match(poster.errors.at(-1),/正在上传/);assert.match(video.errors.at(-1),/正在上传/);
 jobs.clear();saving=true;
 poster.drop([image]);video.choose([movie]);
 assert.equal(jobs.size,0);
 assert.match(poster.errors.at(-1),/正在保存/);assert.match(video.errors.at(-1),/正在保存/);
 saving=false;poster.drop([image]);video.drop([movie]);
 assert.equal(poster.received.length,2);assert.equal(video.received.length,2);
 jobs.clear();open=false;poster.drop([image]);
 assert.equal(poster.received.length,2);assert.match(poster.errors.at(-1),/打开作品/);
});

test('file drags prevent navigation and show allowed or blocked drop feedback',()=>{
 let reason='';const f=fixture('poster',()=>reason);
 const allowed=transfer([file()]);
 assert.equal(dispatch(f.zone,'dragenter',allowed).defaultPrevented,true);
 assert.equal(f.zone.classList.contains('is-dragging'),true);
 assert.equal(dispatch(f.zone,'dragover',allowed).defaultPrevented,true);
 assert.equal(allowed.dropEffect,'copy');
 dispatch(f.zone,'dragenter',allowed);dispatch(f.zone,'dragleave',allowed);
 assert.equal(f.zone.classList.contains('is-dragging'),true);
 dispatch(f.zone,'dragleave',allowed);
 assert.equal(f.zone.classList.contains('is-dragging'),false);
 reason='正在保存';const blocked=transfer([file()]);
 assert.equal(dispatch(f.zone,'dragenter',blocked).defaultPrevented,true);
 assert.equal(f.zone.classList.contains('is-dragging'),false);
 assert.equal(dispatch(f.zone,'dragover',blocked).defaultPrevented,true);
 assert.equal(blocked.dropEffect,'none');
 assert.equal(f.drop([file()]).defaultPrevented,true);
 assert.equal(f.received.length,0);assert.deepEqual(f.errors,['正在保存']);
 reason='';dispatch(f.zone,'dragenter',allowed);f.reset();
 assert.equal(f.zone.classList.contains('is-dragging'),false);
 dispatch(f.zone,'dragenter',allowed);f.drop([file()]);
 assert.equal(f.zone.classList.contains('is-dragging'),false);
});

test('text and link drags keep their normal behavior',()=>{
 const f=fixture(),text={types:['text/plain','text/uri-list'],files:[],items:[],dropEffect:'link'};
 assert.equal(hasFiles(text),false);assert.equal(hasFiles(null),false);
 assert.equal(hasFiles({types:['Files'],files:[]}),true);
 assert.equal(hasFiles({types:[],files:[file()]}),true);
 for(const name of ['dragenter','dragover','drop'])assert.equal(dispatch(f.zone,name,text).defaultPrevented,false);
 assert.equal(text.dropEffect,'link');
 assert.equal(f.zone.classList.contains('is-dragging'),false);
 assert.deepEqual(f.received,[]);assert.deepEqual(f.errors,[]);
});
