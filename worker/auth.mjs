import {createRemoteJWKSet,jwtVerify} from 'jose';

const verifiedIdentity=Symbol('verifiedAccessIdentity');
const keySets=new Map();

function teamOrigin(env){
 const team=String(env.ACCESS_TEAM_DOMAIN||'').replace(/^https:\/\//,'').replace(/\/$/,'');
 if(!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.cloudflareaccess\.com$/.test(team))throw Error('Invalid Access team domain');
 return 'https://'+team;
}

export async function authenticate(request,env){
 const scoped={...env,[verifiedIdentity]:null};
 if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return scoped;
 // Access's signed cookie also permits private media previews outside protected admin paths.
 const cookie=request.headers.get('cookie')?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
 const token=request.headers.get('cf-access-jwt-assertion')||cookie;
 if(!token||token.length>16384)return scoped;
 try{
  const issuer=teamOrigin(env);
  if(!keySets.has(issuer))keySets.set(issuer,createRemoteJWKSet(new URL(issuer+'/cdn-cgi/access/certs')));
  const {payload}=await jwtVerify(token,keySets.get(issuer),{
   issuer,audience:env.ACCESS_AUD,algorithms:['RS256'],
   requiredClaims:['exp','iat','sub','email'],clockTolerance:5,
  });
  if(typeof payload.sub!=='string'||!payload.sub||typeof payload.email!=='string'||!payload.email||payload.type!=='app')return scoped;
  scoped[verifiedIdentity]={id:payload.sub,email:payload.email};
 }catch{
  // Invalid, expired or unverifiable tokens grant no access; public pages remain available.
 }
 return scoped;
}

export function identity(request,env){return env[verifiedIdentity]||null;}
export function isAdmin(request,env){const u=identity(request,env);return !!u&&!!env.ADMIN_EMAIL&&u.email.toLowerCase()===env.ADMIN_EMAIL.trim().toLowerCase();}
export function loginURL(request,env){const u=new URL(request.url);return teamOrigin(env)+'/cdn-cgi/access/login/'+u.hostname+'?redirect_url='+encodeURIComponent(u.origin+u.pathname);}
export function assertWrite(request){if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('x-aurovoy-admin')!=='1')throw Object.assign(new Error('请从管理后台提交操作'),{status:403});}
