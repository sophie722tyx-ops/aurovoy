import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
// Reassemble the unchanged video from bounded source-upload parts.
const videoManifest=JSON.parse(fs.readFileSync('source-media/global-pt.json','utf8'));
const videoBytes=Buffer.concat(videoManifest.parts.map(name=>{if(!/^global-pt-\d{2}\.bin$/.test(name))throw new Error('Invalid video part');return fs.readFileSync(path.join('source-media',name));}));
if(videoBytes.length!==videoManifest.size||createHash('sha256').update(videoBytes).digest('hex')!==videoManifest.sha256)throw new Error('Video integrity check failed');
fs.writeFileSync('src/assets/global-pt.mp4',videoBytes);
await import('./generate.mjs');
// Remove only the resolved build directory inside this checkout before changing its layout.
const output=path.resolve('dist');if(path.dirname(output)!==process.cwd())throw new Error('Unsafe build output');
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync('dist/client',{recursive:true});fs.cpSync('src','dist/client',{recursive:true});
// Keep HTML in the Worker so every portfolio request observes publication state.
// This also prevents asset routing from skipping the database-backed page handler.
const templates={};
for(const prefix of ['', 'en/', 'fr/'])for(const file of fs.readdirSync(path.join('src',prefix)).filter(f=>f.endsWith('.html'))){
 templates[prefix+file]=fs.readFileSync(path.join('src',prefix,file),'utf8');
 const target=path.resolve('dist/client',prefix,file);if(!target.startsWith(path.resolve('dist/client')+path.sep))throw new Error('Unsafe template path');fs.unlinkSync(target);
}
fs.writeFileSync('worker/pages.generated.json',JSON.stringify(templates));

console.log('Public pages and protected content studio built');
