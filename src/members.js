(()=>{'use strict';
const $=s=>document.querySelector(s),status=$('#member-status');let busy=false;
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function say(s,error=false){status.textContent=s;status.classList.toggle('error',error);}
async function api(method='GET',email){const r=await fetch('/api/admin/members',{method,headers:{'Content-Type':'application/json','X-Aurovoy-Admin':'1'},...(email?{body:JSON.stringify({email})}:{})});let data;try{data=await r.json();}catch{throw Error('登录可能已过期，请刷新页面后重试');}if(!r.ok)throw Error(data.error||'操作失败');return data;}
async function load(){const d=await api();$('#member-login').value=d.loginUrl;$('#member-list').innerHTML=`<tr><td>${esc(d.owner)}</td><td>所有者</td><td>始终保留</td></tr>`+d.members.map(x=>`<tr><td>${esc(x.email)}</td><td>内容管理员</td><td><button type="button" data-remove="${esc(x.email)}">移除权限</button></td></tr>`).join('');}
function lock(value){busy=value;document.querySelectorAll('#member-form input,#member-form button,[data-remove]').forEach(e=>e.disabled=value);}
$('#member-form').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;lock(true);try{await api('POST',$('#member-email').value);$('#member-email').value='';await load();say('网站权限已添加。请按下方说明完成 Cloudflare 邮箱授权，再让对方登录。');}catch(e){say(e.message,true);}finally{lock(false);}});
$('#member-list').addEventListener('click',async e=>{const b=e.target.closest('[data-remove]');if(!b||busy||!confirm('移除 '+b.dataset.remove+' 的网站管理权限？'))return;lock(true);try{await api('DELETE',b.dataset.remove);await load();say('网站管理权限已移除，请同步清理 Cloudflare 登录名单。');}catch(e){say(e.message,true);}finally{lock(false);}});
$('#copy-login').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#member-login').value);say('后台登录地址已复制。');}catch{$('#member-login').select();say('请复制选中的后台登录地址。');}});
load().catch(e=>say(e.message,true));
})();
