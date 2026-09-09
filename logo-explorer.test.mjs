import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('Logo selection links open explanation, highlighted region and source diagram',()=>{
 const items=Array.from({length:5},(_,i)=>({open:i===0,selected:false,classList:{toggle(name,on){items[i].selected=on;}},addEventListener(name,fn){this.toggle=fn;}}));
 const regions=items.map(()=>({style:{}})),fragments=items.map((_,i)=>({hidden:i!==0,alt:`Part ${i}`})),label={};
 const lab={dataset:{},querySelectorAll:selector=>selector==='[data-logo-region]'?regions:fragments,querySelector:()=>label};
 const document={querySelector:()=>lab,querySelectorAll:()=>items};
 vm.runInNewContext(fs.readFileSync('src/logo-explorer.js','utf8'),{document});
 for(const index of [3,1,4,2,0]){
  items[index].open=true;items[index].toggle();
  assert.equal(lab.dataset.activePart,String(index));assert.equal(label.textContent,`Part ${index}`);
  assert.deepEqual(items.map(x=>x.open),items.map((_,i)=>i===index));
  assert.deepEqual(regions.map(x=>x.style.opacity),items.map((_,i)=>i===index?'1':'0'));
  assert.deepEqual(fragments.map(x=>x.hidden),items.map((_,i)=>i!==index));
 }
 items[0].open=false;items[0].toggle();assert.equal(label.textContent,'Part 0');
});
