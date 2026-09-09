export const clients=[
 {id:1,key:'huafa',name:['华发集团','Huafa Group','Huafa Group']},
 {id:2,key:'expressway',name:['巴广渝高速','Ba-Guang-Yu Expressway','Autoroute Ba-Guang-Yu']},
 {id:3,key:'chinalife',name:['中国人寿','China Life','China Life']},
 {id:4,key:'mini',name:['MINI','MINI','MINI']},
 {id:5,key:'lynk',name:['领克','Lynk & Co','Lynk & Co']},
 {id:6,key:'bank',name:['广东连平农商银行','Lianping Rural Commercial Bank','Banque rurale de Lianping']},
 {id:7,key:'tobacco',name:['中国烟草','China Tobacco','China Tobacco']},
 {id:8,key:'powerchina',name:['中国电建','POWERCHINA','POWERCHINA']},
 {id:9,key:'tennis',name:['国家网球中心','National Tennis Center','Centre national de tennis']}
];
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function pageClass(file){
 if(file==='index.html')return'page-home';
 if(file==='works.html')return'page-portfolio';
 if(file.startsWith('works-'))return'page-collection';
 if(file.startsWith('work-'))return'page-film';
 if(file.startsWith('course-'))return'page-course';
 if(file.startsWith('mentor-'))return'page-mentor';
 return'page-'+file.replace('.html','');
}
export function polishPage(body,file,c){
 const {t,u,asset,categories,courses}=c;
 const clientList=full=>`<ul class="client-list ${full?'client-grid':'client-track'}"${full?'':' id="clients-track" tabindex="0" aria-label="Clients"'}>${clients.map(client=>`<li class="client-tile client-${client.key}"><figure><div class="client-logo"><img src="${asset(`client-${client.id}.webp`)}" alt="" width="1200" height="600" loading="lazy"></div><figcaption${full?'':' class="sr-only"'}>${escape(t(client.name))}</figcaption></figure></li>`).join('')}</ul>`;
 const clientsSection=full=>`<section class="clients-section ${full?'clients-full section':'clients-home'}"${full?' id="clients"':' data-client-carousel'}><div class="clients-heading"><div><p class="eyebrow">SELECTED BRAND EXPERIENCE</p><h2>${t(['部分品牌项目经验','Selected brand experience','Expériences de projets de marque'])}</h2>${full?`<p class="clients-intro">${t(['以不同的行业视角 理解每一次内容需求','A fresh industry perspective for every creative brief','Un regard adapté à chaque secteur et à chaque projet'])}</p>`:''}</div>${full?'':`<div class="clients-actions"><a class="text-link" href="about.html#clients">${t(['了解更多','Learn more','En savoir plus'])} ↗</a><div class="client-controls js-only"><button type="button" data-client-prev aria-controls="clients-track" aria-label="${t(['向前浏览','Previous clients','Clients précédents'])}">←</button><button type="button" data-client-next aria-controls="clients-track" aria-label="${t(['继续浏览','Next clients','Clients suivants'])}">→</button></div></div>`}</div>${clientList(full)}</section>`;
 if(file==='index.html')return body+clientsSection(false);

 const chapter={
  'works.html':{image:'film-31.webp',label:['创意的不同形态','MANY FORMS OF CREATIVITY','LES FORMES DE LA CRÉATIVITÉ'],meta:['商业影像 原创叙事 定制表达','Commercial films Original stories Bespoke expression','Films commerciaux Récits originaux Créations sur mesure']},
  'production.html':{image:'film-3.webp',label:['从创意到成片','FROM CONCEPT TO FILM','DE L’IDÉE AU FILM'],meta:['策划 制作 交付','Concept Production Delivery','Conception Production Réalisation']},
  'training.html':{image:'film-31.webp',label:['元启程作品画面','FROM THE AUROVOY PORTFOLIO','IMAGE DU PORTFOLIO AUROVOY'],meta:['项目方法 实战练习 阶段点评','Project methods Practical work Stage reviews','Méthodes de projet Pratique Retours par étape']},
  'global.html':{image:'film-1.webp',label:['让故事走向世界','STORIES BEYOND BORDERS','DES RÉCITS AU-DELÀ DES FRONTIÈRES'],meta:['目标市场 本地化 专业协作','Target markets Localisation Collaboration','Marchés Localisation Collaboration']},
  'about.html':{image:'brand-horizon.webp',label:['文化与科技共创','CULTURE IN DIALOGUE WITH TECHNOLOGY','CULTURE ET TECHNOLOGIE EN DIALOGUE'],meta:['内容制作 人才成长 国际表达','Content production Creative learning International expression','Production Apprentissage Expression internationale']},
  'mentors.html':{image:'brand-horizon.webp',label:['创作背后的人','THE PEOPLE BEHIND THE WORK','LES PERSONNES DERRIÈRE LES CRÉATIONS'],meta:['制作 工作流 商业交付 内容出海','Production Workflows Delivery International content','Production Workflows Réalisation Contenus internationaux']},
  'partnership.html':{image:'film-3.webp',label:['共同完成学习与交付','LEARNING THROUGH COLLABORATION','APPRENDRE PAR LA COLLABORATION'],meta:['课程协同 导师支持 项目实训','Programmes Instructors Practical projects','Programmes Intervenants Projets pratiques']},
  'contact.html':{image:'brand-horizon.webp',label:['下一次创作从这里开始','THE NEXT CREATION STARTS HERE','LA PROCHAINE CRÉATION COMMENCE ICI'],meta:['深圳 元启程','SHENZHEN AUROVOY','SHENZHEN AUROVOY']}
 };
 let visual=chapter[file];
 if(file.startsWith('works-')){
  const cat=categories.find(cat=>`works-${cat.id}.html`===file);
  if(cat)visual={image:cat.id==='avatar'?'brand-horizon.webp':`cover-${cat.cover}.webp`,label:cat.name,meta:[cat.tags[0].join(' '),cat.tags[1].join(' '),cat.tags[2].join(' ')],contain:cat.id!=='avatar',noMeta:true};
 }
 if(file.startsWith('course-')){
  const course=courses.find(course=>`course-${course.id}.html`===file);
  if(course)visual={image:course.id==='enterprise'?'film-3.webp':'film-31.webp',label:['元启程作品画面','FROM THE AUROVOY PORTFOLIO','IMAGE DU PORTFOLIO AUROVOY'],meta:course.time,course,noMeta:true};
 }
 if(visual){
  if(visual.course)body=body.replace(`<div class="tags"><span>${escape(t(visual.course.time))}</span></div>`,'');
  body=body.replace(/<div class="page-heading">([\s\S]*?)<\/div>/,(_,heading)=>`<div class="chapter-layout"><div class="page-heading">${heading}${visual.noMeta?'':`<div class="chapter-meta">${t(visual.meta)}</div>`}</div><figure class="chapter-visual ${visual.contain?'chapter-contain':''}"><img src="${asset(visual.image)}" alt="${escape(t(visual.label))}" width="960" height="540" fetchpriority="high"><figcaption><span>${escape(t(visual.label))}</span><span aria-hidden="true">↗</span></figcaption>${visual.course?`<div class="chapter-duration"><span>${t(['学习周期','DURATION','DURÉE'])}</span><strong>${t(visual.course.time)}</strong></div>`:''}</figure></div>`);
 }
 if(file==='about.html')body=body.replace('<section class="section brand-dialogue">',clientsSection(true)+'<section class="section brand-dialogue">');
 if(file==='training.html'){
  const practice=`<section class="section practice-story"><div class="practice-visual"><img src="${asset('film-31.webp')}" alt="${t(['微缩纪元作品画面','A frame from The Miniature Era','Image de L’Ère miniature'])}" width="1280" height="720" loading="lazy"><a href="work-31.html">${t(['探索作品中的镜头语言','Explore the film’s visual language','Explorer le langage visuel du film'])}<span aria-hidden="true">↗</span></a></div><div class="practice-copy"><p class="eyebrow">LEARNING THROUGH CREATION</p><h2>${t(['把每一步练习<br>连接成一部作品','Connect each exercise<br>to a finished film','Relier chaque exercice<br>à un film abouti'])}</h2><p>${t(['围绕剧本、角色、场景、镜头、声音和剪辑，让工具练习进入完整创作流程。作品画面来自元启程样片库。','Connect scripts, characters, settings, shots, sound and editing in a complete creative process. The illustrated film comes from AUROVOY’s portfolio.','Relier scénario, personnages, décors, plans, son et montage dans un processus complet. L’image présentée provient du portfolio AUROVOY.'])}</p><ol>${t([[['01','形成创作方案'],['02','积累视觉资产'],['03','完成作品与复盘']],[['01','Develop the concept'],['02','Build visual assets'],['03','Finish and review']],[['01','Concevoir le projet'],['02','Créer les ressources visuelles'],['03','Finaliser et analyser']]]).map(([n,label])=>`<li><span>${n}</span>${label}</li>`).join('')}</ol></div></section>`;
  body=body.replace('<section class="mentor-teaser section">',practice+'<section class="mentor-teaser section">');
 }
 if(file==='global.html'){
  const lenses=[
   [['文化语境','理解受众习惯、叙事节奏和表达方式，明确内容需要适配的部分。'],['Cultural context','Understand audiences, narrative rhythm and expression to identify what needs adapting.'],['Contexte culturel','Comprendre publics, rythme narratif et modes d’expression pour définir les adaptations.']],
   [['视听表达','围绕字幕、配音、画面信息与声音设计，梳理本地化制作范围。'],['Audiovisual expression','Define localisation needs across subtitles, dubbing, on-screen information and sound.'],['Expression audiovisuelle','Définir les besoins de localisation pour sous-titres, doublage, informations visuelles et son.']],
   [['协同交付','明确专业伙伴的分工、素材标准、反馈方式与阶段验收节点。'],['Coordinated delivery','Agree on specialist roles, asset standards, feedback and review milestones.'],['Réalisation coordonnée','Définir rôles, formats des ressources, retours et étapes de validation.']]
  ];
  const section=`<section class="section localisation-lenses"><div class="section-head"><div><p class="eyebrow">LOCALISATION IN PRACTICE</p><h2>${t(['跨越语言<br>也理解语境','Across languages<br>within context','Au-delà des langues<br>au plus près du contexte'])}</h2></div><p>${t(['从内容判断到专业协作 让启动方案有清晰的落点','From creative decisions to specialist collaboration A clear foundation for launch','Des choix créatifs à la collaboration Une base claire pour le lancement'])}</p></div><div class="lens-grid">${lenses.map((lens,i)=>`<article><span class="lens-number">0${i+1}</span><h3>${t(lens)[0]}</h3><p>${t(lens)[1]}</p></article>`).join('')}</div></section>`;
  body=body.replace('<section class="contact-band section">',section+'<section class="contact-band section">');
 }
 return body;
}
