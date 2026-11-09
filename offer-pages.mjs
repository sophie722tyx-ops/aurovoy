import {email} from './content.mjs';

const serviceRows = [
 ['国内精品AI短剧','Premium AI short drama for China','Mini-série IA pour la Chine',1000,0],
 ['海外精品AI短剧','Premium AI short drama for overseas audiences','Mini-série IA pour l’international',1000,0],
 ['短剧出海译制＋人物转绘','Short-drama localisation and character restyling','Localisation et refonte visuelle des personnages',500,0],
 ['广告创意视频','Creative advertising video','Vidéo publicitaire créative',1200,1],
 ['电商带货视频','E-commerce sales video','Vidéo de vente en ligne',200,2],
 ['个人／宠物故事、纪念微电影、纪实故事长片','Personal and pet stories, tribute films and documentaries','Histoires personnelles ou animalières, films souvenirs et documentaires',1500,0],
 ['政企文化宣传／科普视频','Institutional culture and science communication','Communication culturelle et scientifique institutionnelle',800,0],
 ['政企剧情宣教视频','Narrative public-awareness video','Vidéo narrative de sensibilisation',1000,0],
 ['企业宣传片','Corporate film','Film d’entreprise',1200,0],
 ['线下大屏／异形屏视觉视频','Event and custom-screen visuals','Visuels événementiels et pour écrans spéciaux',120,3],
 ['品牌IP基础设计包','Brand character design package','Pack de création de personnage de marque',1200,4],
 ['IP宣传／故事视频','Brand character story video','Vidéo narrative de personnage de marque',1000,0],
 ['IP表情包／动作延展','Character stickers and poses','Stickers et poses de personnage',400,5],
 ['数字人口播','Digital presenter video','Vidéo avec présentateur virtuel',150,6],
];
const samples = [
 [
  11,
  "古装短剧参考片",
  "Period drama sample",
  "Extrait de fiction historique"
 ],
 [
  10,
  "海外精品AI短剧",
  "AI drama for overseas audiences",
  "Fiction IA pour l’international"
 ],
 [
  1,
  "短剧出海 · 中转英",
  "Short drama · Chinese to English",
  "Fiction · du chinois vers l’anglais"
 ],
 [
  9,
  "TCL · 创意短片",
  "TCL · Creative film",
  "TCL · Film créatif"
 ],
 [
  17,
  "Demora家具 · 跨境口播带货",
  "Demora Furniture · E-commerce video",
  "Demora · Vidéo e-commerce"
 ],
 [
  5,
  "把一生，留给童年",
  "A Lifetime for Childhood",
  "Toute une vie pour l’enfance"
 ],
 [
  6,
  "中国电建 · 廉洁宣传",
  "POWERCHINA · Integrity campaign",
  "POWERCHINA · Sensibilisation à l’intégrité"
 ],
 [
  2,
  "广东连平农商银行 · 金融反诈",
  "Lianping Rural Commercial Bank · Fraud prevention",
  "Banque rurale de Lianping · Prévention des fraudes"
 ],
 [
  16,
  "炎阳健康科技 · 品牌合作宣传片",
  "Yanyang Health Technology · Brand film",
  "Yanyang Health Technology · Film de marque"
 ],
 [
  3,
  "华发开幕式",
  "Huafa · Opening ceremony",
  "Huafa · Cérémonie d’ouverture"
 ],
 null,
 [
  15,
  "IP宣传／故事视频",
  "Brand character story film",
  "Film narratif de personnage de marque"
 ],
 [
  18,
  "启启鲸表情包",
  "Qiqi Whale stickers",
  "Stickers Qiqi"
 ]
];
const units = [
 ['分钟','min','min'], ['30 秒','30 seconds','30 secondes'],
 ['条 · 30 秒以内','video, up to 30 seconds','vidéo, 30 secondes max.'],
 ['有效制作秒 · 10 秒起接','second produced, 10-second minimum','seconde produite, minimum 10 secondes'],
 ['套','package','pack'], ['组 · 9 张静态图','set of 9 stills','lot de 9 images'],
 ['条 · 60 秒以内','video, up to 60 seconds','vidéo, 60 secondes max.'],
];
const studentCourses = [
 {name:['3 天线上体验','3-day online introduction','Initiation en ligne · 3 jours'], price:980,
  format:['6 小时直播 · 1 次作业反馈','6 hours live · one assignment review','6 h en direct · un retour sur exercice'],
  summary:['适合零基础。从五类应用认识 AI 创作，完成一份图像或短视频练习。','Explore five uses of AI creation and complete a simple image or video exercise. No experience required.','Découvrir cinq usages de l’IA créative et réaliser un exercice d’image ou de vidéo. Accessible aux débutants.'],
  included:['1 万平台积分 · 6 个基础 SKILL · 30 天回放','10,000 credits · 6 core SKILL packs · 30-day replay','10 000 crédits · 6 packs SKILL · replay 30 jours']},
 {name:['7 天线下漫剧实战','7-day in-person AI drama workshop','Atelier présentiel de fiction IA · 7 jours'], price:8800,
  format:['42 小时面授 · 含标准教学场地','42 hours in person · classroom included','42 h en présentiel · salle comprise'],
  summary:['从剧本、角色资产和分镜做到剪辑精修，目标是完成 60–90 秒漫剧样片。','Go from script and character assets to a polished edit, aiming for a 60–90 second AI drama sample.','Du scénario au montage final, avec pour objectif un extrait de fiction IA de 60 à 90 secondes.'],
  included:['5 万平台积分 · 16 个 SKILL · 阶段点评和结课评审','50,000 credits · 16 SKILL packs · progress reviews and final assessment','50 000 crédits · 16 packs SKILL · bilans d’étape et évaluation finale']},
 {name:['30 天混合陪跑','30-day hybrid project coaching','Accompagnement hybride · 30 jours'], price:14800,
  format:['前 7 天线下＋后 23 天线上 · 共 53 小时指导','7 days in person + 23 days online · 53 hours of instruction','7 jours en présentiel + 23 en ligne · 53 h encadrées'],
  summary:['围绕同一项主作品持续推进，含集体复盘和一对一指导。套餐已含前 7 天面授。','Develop one project through group reviews and one-to-one coaching. The first seven in-person days are included.','Faire avancer un projet avec des bilans collectifs et un suivi individuel. Les sept jours en présentiel sont inclus.'],
  included:['全程 12 万平台积分 · 24 个 SKILL · 4 次集体复盘和 4 次一对一','120,000 total credits · 24 SKILL packs · 4 group and 4 individual sessions','120 000 crédits au total · 24 packs SKILL · 4 bilans collectifs et 4 séances individuelles']},
 {name:['3 天线下专题','3-day specialist workshop','Atelier thématique · 3 jours'], price:3800,
  format:['18 小时面授 · 每期选择一个方向','18 hours in person · one topic per session','18 h en présentiel · un thème par session'],
  summary:['漫剧进阶、品牌广告、人物定制微电影与纪录片、数字人、电商内容，五个方向可选。','Choose advanced AI drama, brand advertising, personal short films and documentaries, digital presenters, or e-commerce content.','Choisir parmi fiction IA avancée, publicité, films personnels et documentaires, présentateurs virtuels ou contenu e-commerce.'],
  included:['5 万平台积分 · 16 个 SKILL · 含标准教学场地','50,000 credits · 16 SKILL packs · classroom included','50 000 crédits · 16 packs SKILL · salle comprise']},
];

function emailLink(subject, fields = []) {
 const query = new URLSearchParams({subject, ...(fields.length ? {body: fields.map(field => field + '：').join('\n')} : {})});
 return 'mailto:' + email + '?' + query.toString().replaceAll('+', '%20').replaceAll('&', '&amp;');
}

export function offerPages({t, title, button, asset}) {
 const formatPrice = amount => t(['¥' + amount.toLocaleString('en-US') + ' 起','From ¥' + amount.toLocaleString('en-US'),'Dès ' + amount.toLocaleString('fr-FR') + ' ¥']);
 const quoteName = t(['服务报价','Get a quote','Demander un devis']);
 const partnerName = t(['机构与校企合作','Training partnerships','Partenariats de formation']);
 const enquire = t(['获取项目报价','Request a project quote','Demander un devis']);
 const partnerCta = t(['联系获取合作方案与优惠','Ask about partnership terms and discounts','Demander une offre et les tarifs partenaires']);
 const projectEmail = emailLink(t(['AUROVOY 项目报价咨询','AUROVOY project quote','Demande de devis AUROVOY']),t([['项目类型','时长与交付内容','预算范围','预计交付时间'],['Project type','Duration and deliverables','Budget range','Deadline'],['Type de projet','Durée et livrables','Budget','Date souhaitée']]));
 const partnerEmail = emailLink(partnerName,t([['机构名称','合作方式','人数','城市与期望时间'],['Organisation','Partnership type','Group size','Location and preferred dates'],['Organisme','Type de partenariat','Effectif','Lieu et dates souhaitées']]));
 const escape = value => value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 function videoPreview(src, poster, name, portrait = false) {
  const label = escape(t(['播放 ','Play ','Lire ']) + name);
  return `<button type="button" class="offer-sample" data-preview data-title="${escape(name)}" data-src="${src}" data-poster="${poster}" data-format="${portrait?'portrait':'landscape'}" aria-label="${label}" hidden><span class="offer-thumb"><img src="${poster}" loading="lazy" width="160" height="90" alt=""><span aria-hidden="true">▶</span></span><span>${escape(name)}</span></button>`;
 }
 function sampleCell(index) {
  const sample = samples[index];
  if (!sample) return index === 10
   ? t(['角色设定、主形象、三视图与应用示意','Character concept, main artwork, turnaround and mockups','Concept, illustration, vues du personnage et exemples d’application'])
   : '<span aria-hidden="true">—</span>';
  const [id, ...names] = sample;
  const name = t(names);
  if (id === 18) {
   const poster = asset('pricing/stickers.png');
   return `<a class="offer-sample" href="${poster}" target="_blank" rel="noopener"><span class="offer-thumb"><img src="${poster}" loading="lazy" width="160" height="90" alt=""></span><span>${name} ↗</span></a>`;
  }
  return videoPreview(asset(`pricing/v${id}.mp4`),asset(`pricing/v${id}.jpg`),name,[10,9,17].includes(id));
 }
 const courseExamples = [
  ['case-tea',t(['霸王茶姬 · 学员练习作品','CHAGEE · Learner exercise','CHAGEE · Exercice d’apprenant'])],
  ['case-awakening',t(['雷羽觉醒 · 学员案例','Thunder Feather Awakening · Learner work','L’Éveil des plumes de foudre · Réalisation d’apprenant'])],
  ['pricing/v5',t(['把一生，留给童年 · 制作案例','A Lifetime for Childhood · Production example','Toute une vie pour l’enfance · Exemple de production'])],
  ['pricing/v9',t(['TCL · 品牌广告参考','TCL · Advertising example','TCL · Exemple publicitaire'])],
 ];
 const courseNumber = index => '0' + (index + 1);
 const tabs = studentCourses.map((course,i)=>`<button class="goal-choice" type="button" role="tab" id="course-option-${i}" aria-controls="course-panel-${i}" aria-selected="${i===0}" tabindex="${i===0?0:-1}"><span class="goal-number">${courseNumber(i)}</span><span><strong>${t(course.name)}</strong><small>${t(course.format)}</small></span><b aria-hidden="true">↗</b></button>`).join('');
 const panels = studentCourses.map((course,i)=>`<div class="goal-panel" role="tabpanel" id="course-panel-${i}" aria-labelledby="course-option-${i}" tabindex="0"><div class="goal-course-meta"><span>${t(['个人课程','FOR INDIVIDUALS','COURS INDIVIDUELS'])}</span><span>${formatPrice(course.price)} / ${t(['人','person','personne'])}</span></div><h3>${t(course.name)}</h3><p class="goal-audience">${t(course.summary)}</p><p>${t(course.included)}</p><div class="goal-panel-bottom"><a class="text-link" href="#programme-${i+1}">${t(['课程详情与案例','Course details and example','Détails et exemple'])} ↗</a></div></div>`).join('');
 const rows = studentCourses.map((course,i)=>{
  const [media,name] = courseExamples[i];
  const poster = asset(media+(i<2?'.webp':'.jpg'));
  const subject = t(['报名咨询：','Enrolment: ','Inscription : ']) + t(course.name);
  return `<article class="programme-row" id="programme-${i+1}"><div class="programme-video">${videoPreview(asset(media+'.mp4'),poster,name,i===3)}</div><div class="programme-summary"><p class="programme-meta"><span>${courseNumber(i)}</span><span>${t(course.format)}</span></p><h3>${t(course.name)}</h3><p>${t(course.summary)}</p><p>${t(course.included)}</p><div class="programme-bottom"><strong>${formatPrice(course.price)} / ${t(['人','person','personne'])}</strong><a class="text-link" href="${emailLink(subject)}">${t(['咨询班期与报名','Ask about dates and enrolment','Dates et inscriptions'])} ↗</a></div>${i===0?`<small class="case-disclosure">${t(['学员练习作品，非商业合作','Learner exercise, no commercial collaboration','Exercice d’apprenant, sans collaboration commerciale'])}</small>`:''}</div></article>`;
 }).join('');
 const training = `<section id="training-options" class="section goal-studio"><div class="goal-heading"><div><p class="eyebrow">AUROVOY TRAINING</p><h2>${t(['选择你的学习起点','Choose your starting point','Choisir votre point de départ'])}</h2></div><p>${t(['按你的创作目标选择课程','Find a course that fits your creative goals','Choisissez selon vos objectifs créatifs'])}</p></div><div class="goal-board" data-tabs><div class="goal-menu js-only" role="tablist" aria-orientation="vertical" aria-label="${t(['课程选择','Course selection','Choix du cours'])}">${tabs}</div>${panels}</div></section><section class="section programme-catalogue"><div class="section-head"><div><p class="eyebrow">COURSES & PRACTICE</p><h2>${t(['课程详情与案例','Course details and examples','Détails des cours et exemples'])}</h2></div></div><div class="programme-list">${rows}</div></section>`;
 const partnership = `<section class="section contact-band" id="training-partnership"><p class="eyebrow">TRAINING PARTNERSHIPS</p><div><div><h2>${partnerName}</h2><p>${t(['支持渠道送培、机构包班、校企共建及企业内训。欢迎联系获取合作方案与优惠报价。','Referral, private cohorts, school partnerships and corporate training are available. Contact us for terms and partner rates.','Orientation, sessions dédiées, partenariats scolaires et formations en entreprise. Contactez-nous pour une offre partenaire.'])}</p></div>${button(partnerEmail,partnerCta)}</div></section>`;
 const note = content => '<p class="offer-note">' + content + '</p>';
 const quotes = title('AUROVOY / PRICING',t(['服务报价与项目咨询','Service pricing and quotes','Tarifs et devis']),t(['查看常见制作服务的人民币起步价，按项目需求获取正式报价。','Browse starting prices in CNY and request a quote for your project.','Consultez les tarifs de départ en CNY et demandez un devis adapté.']),[[quoteName]],button(projectEmail,enquire)) +
  `<section class="section offer-pricing"><h2>${t(['内容制作起步价','Content production rates','Tarifs de production de contenu'])}</h2>
  <p class="offer-pricing-hint">${t(['人民币 · 点击封面播放样片','CNY · Select a thumbnail to play','CNY · Sélectionnez une vignette pour lancer la vidéo'])}</p>
  <table class="offer-table"><thead><tr><th scope="col">${t(['服务类别','Service','Prestation'])}</th><th scope="col">${t(['起步价','Starting price','Tarif de départ'])}</th><th scope="col">${t(['参考案例','Sample work','Exemple'])}</th></tr></thead><tbody>
  ${serviceRows.map(([zh,en,fr,price,unit],i)=>`<tr><th scope="row">${t([zh,en,fr])}</th><td class="offer-price"><strong>${formatPrice(price)}</strong><small>/ ${t(units[unit])}</small></td><td class="offer-example">${sampleCell(i)}</td></tr>`).join('')}
  </tbody></table>
  ${note(t(['标准范围含一个确认方向、一个交付版本与两轮集中小修改。分钟类 1 分钟起计，超出按 30 秒递增。实拍、现场执行、额外屏幕适配、复杂三维、源文件和税费按正式报价单确认。','Standard scope covers one approved direction, one delivery version and two rounds of minor revisions. Per-minute work starts at one minute, then increases in 30-second steps. Live filming, on-site work, extra screen adaptations, complex 3D, source files and taxes are specified in the quote.','L’offre standard comprend une direction validée, une version livrée et deux séries de retouches mineures. Les prestations à la minute sont facturées à partir d’une minute, puis par tranches de 30 secondes. Tournage, interventions sur site, adaptations d’écran, 3D complexe, fichiers sources et taxes sont précisés au devis.']))}
  <div class="offer-actions"><a class="text-link" href="works.html">${t(['查看官网作品','Browse our portfolio','Voir nos réalisations'])} ↗</a></div></section>`;
 return {quoteName, training, partnership, quotes};
}
