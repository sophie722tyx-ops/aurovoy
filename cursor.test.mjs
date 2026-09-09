import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync('src/experience.js','utf8').split(' // Short, bounded effects')[1].split(" document.querySelectorAll('[data-tabs]')")[0];
function harness({reduced=false,fine=true}={}){
 const listeners={},timers=[],layers=[];let now=1000;
 const make=()=>({children:[],style:{setProperty(){}},setAttribute(){},addEventListener(){},append(node){node.parent=this;this.children.push(node);},remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);},replaceChildren(){this.children=[];},get childElementCount(){return this.children.length;}});
 const doc={hidden:false,body:{append:x=>layers.push(x)},createElement:make,addEventListener:(name,fn)=>(listeners[name]??=[]).push(fn)};
 const ctx={document:doc,window:{addEventListener:doc.addEventListener},root:{},motion:true,whale:true,reduced:{matches:reduced,addEventListener(){}},fine:{matches:fine},performance:{now:()=>now},setTimeout:fn=>timers.push(fn),MutationObserver:class{observe(){}},Math};
 vm.runInNewContext(' // Short, bounded effects'+code,ctx);
 return {ctx,layer:layers[0],flush:()=>timers.splice(0).forEach(fn=>fn()),send(name,values={}){now+=250;for(const fn of listeners[name]??[])fn({pointerType:'mouse',button:0,clientX:100,clientY:100,target:{closest:()=>true},...values});}};
}
test('Mouse clicks produce a bounded splash and all effects expire',()=>{const h=harness();h.send('pointerup');assert(h.layer.childElementCount>0);for(let i=0;i<40;i++)h.send('pointerup');assert(h.layer.childElementCount<=20);h.flush();assert.equal(h.layer.childElementCount,0);});
test('Reduced motion and disabled preferences suppress all pointer effects',()=>{for(const key of ['reduced','motion','whale']){const h=harness({reduced:key==='reduced'});if(key!=='reduced')h.ctx[key]=false;h.send('pointermove');h.send('pointerup');h.send('scroll');assert.equal(h.layer.childElementCount,0);}});
test('Touch scrolling never produces a splash while a deliberate control tap does',()=>{const h=harness({fine:false});h.send('pointerdown',{pointerType:'touch'});h.send('pointerup',{pointerType:'touch',clientY:180});assert.equal(h.layer.childElementCount,0);h.send('pointerdown',{pointerType:'touch'});h.send('pointerup',{pointerType:'touch'});assert(h.layer.childElementCount>0);});
test('Touching ordinary text and hidden documents stays quiet',()=>{const h=harness({fine:false});h.send('pointerdown',{pointerType:'touch'});h.send('pointerup',{pointerType:'touch',target:{closest:()=>false}});assert.equal(h.layer.childElementCount,0);h.ctx.document.hidden=true;h.send('pointerup');assert.equal(h.layer.childElementCount,0);});
