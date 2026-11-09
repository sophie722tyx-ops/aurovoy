import {email, films} from './content.mjs';

const originalPricing = 'https://aurovoy-services-pricing.sophie722tyx.chatgpt.site/';
const serviceRows = [
 ['国内精品AI短剧','Premium AI short drama for China','Mini-série IA pour la Chine',1000,0],
 ['海外精品AI短剧','Premium AI short drama for overseas audiences','Mini-série IA pour l’international',1000,0],
 ['短剧出海译制＋人物转绘','Short-drama localisation and character restyling','Localisation et refonte visuelle des personnages',500,0],
 ['广告创意视频','Creative advertising video','Vidéo publicitaire créative',1200,1,56],
 ['电商带货视频','E-commerce sales video','Vidéo de vente en ligne',200,2],
 ['个人／宠物故事、纪念微电影、纪实故事长片','Personal and pet stories, tribute films and documentaries','Histoires personnelles ou animalières, films souvenirs et documentaires',1500,0,34],
 ['政企文化宣传／科普视频','Institutional culture and science communication','Communication culturelle et scientifique institutionnelle',800,0,30],
 ['政企剧情宣教视频','Narrative public-awareness video','Vidéo narrative de sensibilisation',1000,0,28],
 ['企业宣传片','Corporate film','Film d’entreprise',1200,0],
 ['线下大屏／异形屏视觉视频','Event and custom-screen visuals','Visuels événementiels et pour écrans spéciaux',120,3,19],
 ['品牌IP基础设计包','Brand character design package','Pack de création de personnage de marque',1200,4],
 ['IP宣传／故事视频','Brand character story video','Vidéo narrative de personnage de marque',1000,0],
 ['IP表情包／动作延展','Character stickers and poses','Stickers et poses de personnage',400,5],
 ['数字人口播','Digital presenter video','Vidéo avec présentateur virtuel',150,6],
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
const partnerModes = [
 [['渠道送培','Referral and enrolment','Orientation et inscription'],['推荐学员进入现有班期，按实际报名人数沟通合作方案。','Refer learners to existing cohorts and discuss terms based on enrolment.','Orienter les apprenants vers des sessions existantes et convenir des conditions selon les inscriptions.']],
 [['机构独立包班','Private cohorts','Sessions dédiées'],['为机构安排专属班期，按人数、专题和场地条件定制。','Arrange a dedicated cohort around group size, topic and venue.','Prévoir une session dédiée selon l’effectif, le thème et le lieu.']],
 [['校企共建','School partnerships','Partenariats avec les établissements'],['按学期或学年开展项目实训，配合教师共备、作品评审和成果展示。','Run term-long or year-long practical programmes with teacher planning, project reviews and showcases.','Organiser des projets sur un semestre ou une année avec préparation pédagogique, évaluations et présentation des travaux.']],
 [['企业内训与联合创作','Corporate training and co-creation','Formation en entreprise et cocréation'],['按实际业务选择行业分享、企业内训、导师联合创作或项目陪跑。','Choose a talk, internal workshop, instructor-led co-creation or project coaching around business needs.','Choisir une conférence, un atelier interne, une cocréation encadrée ou un accompagnement selon les besoins.']],
];

function emailLink(subject, fields = []) {
 const query = new URLSearchParams({subject, ...(fields.length ? {body: fields.map(field => field + '：').join('\n')} : {})});
 return 'mailto:' + email + '?' + query.toString().replaceAll('+', '%20').replaceAll('&', '&amp;');
}

export function offerPages({t, title, button, trainingName}) {
 const formatPrice = amount => t(['¥' + amount.toLocaleString('en-US') + ' 起','From ¥' + amount.toLocaleString('en-US'),'Dès ' + amount.toLocaleString('fr-FR') + ' ¥']);
 const trainingCrumb = [trainingName, 'training.html'];
 const quoteName = t(['服务报价','Get a quote','Demander un devis']);
 const studentName = t(['个人课程与报名','Courses and enrolment','Cours et inscriptions']);
 const partnerName = t(['机构与校企合作','Training partnerships','Partenariats de formation']);
 const enquire = t(['获取项目报价','Request a project quote','Demander un devis']);
 const partnerCta = t(['联系获取合作方案与优惠','Ask about partnership terms and discounts','Demander une offre et les tarifs partenaires']);
 const projectEmail = emailLink(t(['AUROVOY 项目报价咨询','AUROVOY project quote','Demande de devis AUROVOY']),t([['项目类型','时长与交付内容','预算范围','预计交付时间'],['Project type','Duration and deliverables','Budget range','Deadline'],['Type de projet','Durée et livrables','Budget','Date souhaitée']]));
 const partnerEmail = emailLink(partnerName,t([['机构名称','合作方式','人数','城市与期望时间'],['Organisation','Partnership type','Group size','Location and preferred dates'],['Organisme','Type de partenariat','Effectif','Lieu et dates souhaitées']]));
 const card = (tag, name, description, actions) => `<article class="offer-card"><p class="eyebrow">${tag}</p><h2>${name}</h2>${description}<div class="offer-actions">${actions}</div></article>`;
 const grid = (cards, id = '') => '<section class="section"' + (id ? ' id="' + id + '"' : '') + '><div class="offer-grid">' + cards.join('') + '</div></section>';
 const paragraph = content => '<p>' + content + '</p>';
 const note = content => '<p class="offer-note">' + content + '</p>';
 const training = grid([
  card('01 / FOR LEARNERS',studentName,paragraph(t(['从线上入门到线下漫剧实战，也可以选专题进阶或 30 天项目陪跑。','Start online, make a short drama in person, specialise or get 30 days of project coaching.','Débuter en ligne, réaliser une fiction en atelier, se spécialiser ou bénéficier de 30 jours de suivi.'])),button('training-courses.html',t(['查看课程与费用','See courses and prices','Voir les cours et tarifs']))),
  card('02 / FOR ORGANISATIONS',partnerName,paragraph(t(['为培训机构、院校和企业提供送培、包班、校企共建与团队内训。','Referral, private cohorts, school partnerships and internal training for organisations.','Orientation, sessions dédiées, partenariats scolaires et formations internes.'])),button('partnership.html',t(['查看合作方式','Explore partnerships','Voir les partenariats']))),
 ], 'training-options');
 const students = title('ENABLE / COURSES',studentName,t(['按你想完成的作品选课。以下为人民币每人起步价，具体班期与报名安排请咨询。','Choose a course based on what you want to make. Prices are starting rates per person in CNY. Contact us for dates and enrolment.','Choisissez selon votre projet. Tarifs de départ par personne en CNY. Contactez-nous pour les dates et inscriptions.']),[trainingCrumb,[studentName]]) + grid(studentCourses.map((course,i)=>{
  const subject = t(['报名咨询：','Enrolment: ','Inscription : ']) + t(course.name);
  return card('0' + (i + 1) + ' / ' + formatPrice(course.price),t(course.name),
   paragraph('<strong>' + t(course.format) + '</strong>') + paragraph(t(course.summary)) + paragraph(t(course.included)),
   button(emailLink(subject),t(['咨询这个课程','Ask about this course','Se renseigner'])));
 }));
 const partners = title('ENABLE / PARTNERSHIPS',partnerName,t(['先告诉我们合作方式、人数和培训目标，我们会按班期、师资和交付要求提供方案。','Tell us your partnership type, group size and goals. We’ll tailor a proposal to the schedule, instructors and outcomes.','Précisez le type de partenariat, l’effectif et les objectifs. Nous adapterons la proposition au calendrier, aux intervenants et aux résultats attendus.']),[trainingCrumb,[partnerName]],button(partnerEmail,partnerCta)) +
  grid(partnerModes.map(([name,description],i)=>card('0' + (i + 1) + ' / PARTNERSHIP',t(name),paragraph(t(description)),''))) +
  '<section class="section offer-tail">' + button(partnerEmail,partnerCta) + '</section>';
 const quotes = title('AUROVOY / PRICING',t(['服务报价与项目咨询','Service pricing and quotes','Tarifs et devis']),t(['查看常见制作服务的人民币起步价，按项目需求获取正式报价。','Browse starting prices in CNY and request a quote for your project.','Consultez les tarifs de départ en CNY et demandez un devis adapté.']),[[quoteName]],button(projectEmail,enquire)) +
  `<section class="section offer-pricing"><h2>${t(['内容制作起步价','Content production rates','Tarifs de production de contenu'])}</h2>
  <table class="offer-table"><thead><tr><th scope="col">${t(['制作服务','Service','Prestation'])}</th><th scope="col">${t(['起步价与计费单位','Starting price and unit','Tarif de départ et unité'])}</th></tr></thead><tbody>
  ${serviceRows.map(([zh,en,fr,price,unit,example])=>{
   const sample = films.find(film => film.id === example);
   const link = sample ? `<small><a class="text-link" href="work-${example}.html">${t(['参考案例','Sample','Exemple'])} · ${t(sample.name)} ↗</a></small>` : '';
   return `<tr><th scope="row">${t([zh,en,fr])}${link}</th><td><strong>${formatPrice(price)}</strong><small>${t(units[unit])}</small></td></tr>`;
  }).join('')}
  </tbody></table>
  ${note(t(['标准范围含一个确认方向、一个交付版本与两轮集中小修改。分钟类 1 分钟起计，超出按 30 秒递增。实拍、现场执行、额外屏幕适配、复杂三维、源文件和税费按正式报价单确认。','Standard scope covers one approved direction, one delivery version and two rounds of minor revisions. Per-minute work starts at one minute, then increases in 30-second steps. Live filming, on-site work, extra screen adaptations, complex 3D, source files and taxes are specified in the quote.','L’offre standard comprend une direction validée, une version livrée et deux séries de retouches mineures. Les prestations à la minute sont facturées à partir d’une minute, puis par tranches de 30 secondes. Tournage, interventions sur site, adaptations d’écran, 3D complexe, fichiers sources et taxes sont précisés au devis.']))}
  <div class="offer-actions"><a class="text-link" href="works.html">${t(['查看官网作品','Browse our portfolio','Voir nos réalisations'])} ↗</a><a class="text-link" href="${originalPricing}" target="_blank" rel="noopener noreferrer">${t(['打开原报价页及参考样片','Open original pricing and samples','Voir les tarifs et exemples d’origine'])} ↗</a></div></section>`;
 return {quoteName, studentName, partnerName, training, students, partners, quotes};
}
