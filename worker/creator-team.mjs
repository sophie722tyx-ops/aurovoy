export const TEAM_ID='aurovoy-team';
export const TEAM={id:TEAM_ID,kind:'creators',builtIn:true,status:'published',order:999999,revision:'builtin',
 name:['AUROVOY团队','AUROVOY Team','Équipe AUROVOY'],
 role:['创作团队','Creative team','Équipe créative'],
 bio:['以 AI 技术与文化创意完成内容表达，通过作品呈现团队的创作与协作。','Bringing AI and creative storytelling together through the work of the AUROVOY team.','L’équipe AUROVOY associe intelligence artificielle et création pour donner forme aux histoires.'],
 tags:['品牌影像\n创意叙事\nAI 视频制作','Brand films\nCreative storytelling\nAI video production','Films de marque\nNarration créative\nProduction vidéo IA'],
 biography:['','',''],photo:'/assets/creator-team.svg'};
// Public credits and profile film lists share one rule, including unpublished/deleted authors.
export function creditedCreators(work,published){const byId=new Map([...published,TEAM].map(c=>[c.id,c]));const creators=[...new Set(work.creatorIds||[])].map(id=>byId.get(id)).filter(Boolean);return creators.length?creators:[TEAM];}
