import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {categories,films,mentors} from './content.mjs';
import {mentorDetails} from './mentor-details.mjs';
const site=path.dirname(fileURLToPath(import.meta.url)),src=path.join(site,'src');
const layout=JSON.parse(fs.readFileSync(path.join(site,'media-layout.json'),'utf8'));
assert.equal(films.length,56);
assert.equal(new Set(categories.flatMap(c=>c.films)).size,56);
assert.equal(categories.flatMap(c=>c.films).length,56);
for(const [id,expected] of Object.entries({22:'brand',45:'brand',35:'cinema',54:'cinema',50:'cinema',39:'animation',51:'brand'}))assert.equal(films.find(f=>f.id===+id).category,expected);
assert.deepEqual(mentors.map(m=>m.name[0]),['Sophie','姜老师','贝尔','子飞','火火']);
assert.equal(films.find(f=>f.id===12).name[0],'三十岁 我们接着来');
for(const lang of ['','en','fr']){
 const dir=path.join(src,lang);
 for(const id of [11,23,55])assert(!fs.existsSync(path.join(dir,`work-${id}.html`)));
 for(const c of categories){
  const html=fs.readFileSync(path.join(dir,`works-${c.id}.html`),'utf8');
  const hasPortrait=c.films.some(id=>layout[id].portrait),hasLandscape=c.films.some(id=>!layout[id].portrait);
  assert.equal(html.includes('format-group format-portrait'),hasPortrait);
  assert.equal(html.includes('format-group format-landscape'),hasLandscape);
  if(hasPortrait&&hasLandscape)assert(html.indexOf('format-group format-landscape')<html.indexOf('format-group format-portrait'));
  const gallery=html.match(/class="section gallery-section">([\s\S]*?)<div class="category-switch"/)[1];
  for(const f of films)assert.equal(gallery.includes(`href="work-${f.id}.html"`),c.films.includes(f.id));
 }
 for(const f of films){
  const html=fs.readFileSync(path.join(dir,`work-${f.id}.html`),'utf8');
  assert(html.includes(`player-shell player-${layout[f.id].portrait?'portrait':'landscape'}`));
  assert(html.includes(`cover-${f.id}.webp`)&&html.includes(`film-${f.id}.mp4`));
  assert(!/href="work-(11|23|55)\.html"/.test(html));
 }
 for(const m of mentors){
  const html=fs.readFileSync(path.join(dir,`mentor-${m.id}.html`),'utf8');
  assert(html.includes(`mentor-${m.id}.webp`));
  assert(mentorDetails[m.id].paragraphs.length>=3);
  assert(!/姜深智|杨子飞|彭老师/.test(html));
  assert(html.includes('mentor-profile-bottom')&&html.includes('mentor-biography'));
 }
}
console.log('PASS: revised categories, removals, native portrait layouts, grouped galleries and all instructor profiles in three languages.');
