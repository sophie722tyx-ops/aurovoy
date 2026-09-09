import fs from 'node:fs';
import assert from 'node:assert/strict';
import {films} from './content.mjs';
for(const lang of ['','en','fr']){
 const base='src/'+(lang?lang+'/':'');
 for(const file of fs.readdirSync(base).filter(x=>x.endsWith('.html'))){
  const html=fs.readFileSync(base+file,'utf8'),back=[...html.matchAll(/class="parent-back" href="([^"]+)"/g)];
  if(file==='index.html'){assert.equal(back.length,0);continue;}
  assert.equal(back.length,1,file);
  let parent='index.html';
  if(file.startsWith('works-'))parent='works.html';
  else if(file.startsWith('work-'))parent='works-'+films.find(f=>`work-${f.id}.html`===file).category+'.html';
  else if(file.startsWith('mentor-'))parent='mentors.html';
  else if(file.startsWith('course-')||file==='mentors.html'||file==='partnership.html')parent='training.html';
  assert.equal(back[0][1],parent,file);assert(fs.existsSync(base+parent));
 }
 const about=fs.readFileSync(base+'about.html','utf8');
 assert(about.includes('logo-complete')&&about.includes('logo-paper-removal'));
 assert(!about.includes('data-logo-region')&&!about.includes('logo-explorer.js'));
 assert.equal((about.match(/class="symbol-detail"/g)||[]).length,5);
}
console.log('PASS: every child page returns to its correct parent in all three languages; full logo and expandable explanations retained.');
