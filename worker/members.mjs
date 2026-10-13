import {isOwner,identity,assertWrite} from './auth.mjs';
import {json} from './api.mjs';
import {adminPage} from './views.mjs';
import {adminNavigation} from './content-admin.mjs';

export async function membersApi(request,env){
 if(!isOwner(request,env))return json({error:'只有网站所有者可以管理管理员'},identity(request,env)?403:401);
 if(request.method==='GET'){
  const {results}=await env.DB.prepare('SELECT email,created_at FROM admin_members ORDER BY created_at,email').all();
  return json({owner:env.ADMIN_EMAIL.trim().toLowerCase(),members:results,loginUrl:new URL('/admin',request.url).href});
 }
 assertWrite(request);
 if(!['POST','DELETE'].includes(request.method))return json({error:'不支持此操作'},405);
 const raw=await request.text();if(raw.length>1000)return json({error:'内容过长'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'请填写有效邮箱'},400);}
 const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
 if(email.length>254||! /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(email))return json({error:'请填写有效邮箱'},400);
 if(email===env.ADMIN_EMAIL.trim().toLowerCase())return json({error:'所有者账号始终保留，无需添加，也不能移除'},400);
 const now=new Date().toISOString(),actor=identity(request,env).email,add=request.method==='POST';
 await env.DB.batch([
  add?env.DB.prepare('INSERT INTO admin_members(email,created_at,created_by) VALUES(?,?,?) ON CONFLICT(email) DO NOTHING').bind(email,now,actor):env.DB.prepare('DELETE FROM admin_members WHERE email=?').bind(email),
  env.DB.prepare('INSERT INTO admin_member_events(id,email,action,actor,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),email,add?'add':'remove',actor,now),
 ]);
 return json({ok:true,email});
}

export function membersPage(){
 const main=`<main class="admin-main"><div class="admin-heading"><div><p class="eyebrow">TEAM ACCESS</p><h1>管理员</h1><p>由你管理成员，协作编辑网站内容。</p></div></div><section class="library member-panel"><h2>添加管理员</h2><p>管理员可以管理作品、创作者、导师和课程；只有你可以添加或移除管理员。</p><form id="member-form"><label>对方的登录邮箱<input id="member-email" type="email" maxlength="254" placeholder="name@example.com" required></label><button class="primary" id="member-add">添加管理员</button></form><p id="member-status" role="status" aria-live="polite"></p></section><section class="library member-panel"><h2>完成登录授权</h2><ol><li>在本页添加对方的邮箱。</li><li>打开 Cloudflare Zero Trust → Access → Applications，编辑保护本网站后台的应用，在 Allow 策略的 Include → Emails 中加入相同邮箱。若后台页面与接口使用不同应用，两处都需要加入；保留你自己的邮箱。</li><li>将下方后台地址发给对方，对方使用该邮箱完成登录验证。</li></ol><p>本页保存的是网站管理权限，不会自动修改 Cloudflare 名单，也不会发送邀请邮件。</p><label>后台登录地址<input id="member-login" readonly></label><button id="copy-login" type="button">复制登录地址</button><p><a href="https://one.dash.cloudflare.com/" target="_blank" rel="noopener">打开 Cloudflare ↗</a> · <a href="https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/" target="_blank" rel="noopener">查看登录说明 ↗</a></p></section><section class="library"><div class="table-scroll"><table><thead><tr><th>邮箱</th><th>权限</th><th>管理</th></tr></thead><tbody id="member-list"></tbody></table></div></section><p class="admin-tip">移除管理员后，该账号下一次请求即失去网站管理权限；同时建议从 Cloudflare 登录名单中移除其邮箱。创作者展示资料与管理员登录账号互相独立。</p></main>`;
 return adminNavigation(adminPage().replace(/<title>[\s\S]*?<\/title>/,'<title>管理员 | AUROVOY</title>').replace(/<main class="admin-main">[\s\S]*?<\/main>/,main).replace(/<dialog id="editor"[\s\S]*?<\/dialog>/,'').replace('/admin.js','/members.js'),'members',true);
}
