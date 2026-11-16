(()=>{'use strict';
const types={mp4:'video/mp4',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
function prepareFile(files,kind){
 if(files.length!==1)throw Error('每个上传区一次只能上传一个文件，请分别拖入视频和封面');
 const file=files[0],type=file.type&&file.type!=='application/octet-stream'?file.type:types[file.name.split('.').pop().toLowerCase()];
 if(!(kind==='video'?['video/mp4']:['image/jpeg','image/png','image/webp']).includes(type))throw Error(kind==='video'?'视频请使用 MP4 格式':'封面请使用 JPG、PNG 或 WebP 图片');
 if(file.size<12)throw Error('文件为空或不完整，请重新选择');
 if(file.size>(kind==='video'?500:10)*1024*1024)throw Error(kind==='video'?'视频最大 500 MB':'封面最大 10 MB');
 return file.type===type?file:new File([file],file.name,{type,lastModified:file.lastModified});
}
const hasFiles=transfer=>Array.from(transfer?.types||[]).includes('Files')||!!transfer?.files?.length;
function bindDropZone({zone,input,kind,blocked,onFile,onError}){
 let depth=0;
 const reset=()=>{depth=0;zone.classList.remove('is-dragging');};
 function receive(files,items=[]){
  try{
   const reason=blocked();if(reason)throw Error(reason);
   if(Array.from(items).some(item=>item.webkitGetAsEntry?.()?.isDirectory))throw Error('请拖入文件，不支持文件夹');
   const file=prepareFile(files,kind);onFile(file);
  }catch(error){onError(error.message);}
 }
 input.addEventListener('change',()=>{const files=Array.from(input.files||[]);input.value='';if(files.length)receive(files);});
 zone.addEventListener('dragenter',event=>{if(!hasFiles(event.dataTransfer))return;event.preventDefault();depth++;if(!blocked())zone.classList.add('is-dragging');});
 zone.addEventListener('dragover',event=>{if(!hasFiles(event.dataTransfer))return;event.preventDefault();event.dataTransfer.dropEffect=blocked()?'none':'copy';});
 zone.addEventListener('dragleave',()=>{depth=Math.max(0,depth-1);if(!depth)reset();});
 zone.addEventListener('drop',event=>{if(!hasFiles(event.dataTransfer))return;event.preventDefault();event.stopPropagation();reset();receive(Array.from(event.dataTransfer.files),event.dataTransfer.items);});
 return reset;
}
globalThis.AurovoyUploads={prepareFile,hasFiles,bindDropZone};
})();
