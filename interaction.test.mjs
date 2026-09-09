import test from 'node:test';
import assert from 'node:assert/strict';
import './src/interaction-core.js';
const {matchesFilm,nextTab,makeBrief,mailDraft}=globalThis.AurovoyInteraction;
test('Film search combines translated names, accents and orientation without changing categories',()=>{
 const film={category:'brand',format:'portrait',search:'听见内心的宁静 Écouter le calme intérieur Listen to the Stillness Within'};
 assert(matchesFilm(film,{query:'ecouter interieur',category:'brand',format:'portrait'}));
 assert(matchesFilm(film,{query:'内心',category:'all',format:'all'}));
 assert(!matchesFilm(film,{query:'内心',category:'cinema',format:'portrait'}));
 assert(!matchesFilm(film,{query:'内心',category:'brand',format:'landscape'}));
 assert(matchesFilm(film,{query:'   ',category:'all',format:'all'}));
 assert(!matchesFilm(film,{query:'missing title'}));
});
test('Keyboard tab navigation wraps and supports first and last panels',()=>{
 assert.equal(nextTab(2,'ArrowDown',3),0);assert.equal(nextTab(0,'ArrowUp',3),2);
 assert.equal(nextTab(2,'ArrowRight',3),0);assert.equal(nextTab(0,'ArrowLeft',3),2);
 assert.equal(nextTab(1,'Home',3),0);assert.equal(nextTab(1,'End',3),2);assert.equal(nextTab(1,'Tab',3),1);
});
test('Mail drafts retain multilingual text and cannot inject extra recipients or parameters',()=>{
 const idea='品牌影片 &bcc=someone@example.com\nCulture 科技 café';
 const body=makeBrief({type:'内容制作',idea,timing:''},'fr');
 assert(body.includes('Idée du projet\n'+idea));assert(!body.includes('Échéance souhaitée'));
 const url=new URL(mailDraft(body,'fr'));
 assert.equal(url.pathname,'tangy38722@163.com');assert.equal(url.searchParams.get('body'),body);
 assert.equal(url.searchParams.has('bcc'),false);assert.equal([...url.searchParams].length,2);
});
test('Draft generation bounds text and omits optional empty timing',()=>{
 const body=makeBrief({type:'Training',idea:'x'.repeat(5000),timing:'  '},'en');
 assert.equal(body.match(/x/g).length,3000);assert(!body.includes('Target timing'));
});
