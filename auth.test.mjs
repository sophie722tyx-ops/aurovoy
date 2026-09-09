import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair} from 'jose';
import {accessEnv,tokens,tokenFor} from './test/access-fixture.mjs';
import {authenticate,identity,isAdmin,assertWrite,loginURL} from './worker/auth.mjs';
import worker from './worker/index.mjs';
const origin='https://aurovoy.example';
const request=(headers={})=>new Request(origin+'/admin',{headers});

test('accepts signed owner token and cookie; rejects old platform header spoofing',async()=>{
 for(const headers of [{'cf-access-jwt-assertion':tokens.owner},{cookie:'CF_Authorization='+tokens.owner}]){
  const r=request(headers),env=await authenticate(r,accessEnv);assert(isAdmin(r,env));assert.equal(identity(r,env).email,accessEnv.ADMIN_EMAIL);
 }
 const r=request({'oai-authenticated-user-id':'owner','oai-authenticated-user-email':accessEnv.ADMIN_EMAIL,'cf-access-authenticated-user-email':accessEnv.ADMIN_EMAIL});
 assert(!isAdmin(r,await authenticate(r,accessEnv)));
 assert.equal((await worker.fetch(new Request(origin+'/api/admin/works',{headers:r.headers}),accessEnv)).status,401);
});

test('rejects wrong audience, issuer, expired JWT, invalid signature and non-app tokens',async()=>{
 const wrong=await generateKeyPair('RS256');
 const values=[await tokenFor(accessEnv.ADMIN_EMAIL,{aud:'wrong'}),await tokenFor(accessEnv.ADMIN_EMAIL,{iss:'https://evil.example'}),await tokenFor(accessEnv.ADMIN_EMAIL,{exp:1}),await tokenFor(accessEnv.ADMIN_EMAIL,{},wrong.privateKey),await tokenFor(accessEnv.ADMIN_EMAIL,{type:'org'}),'not.a.token'];
 for(const token of values){const r=request({'cf-access-jwt-assertion':token});assert(!isAdmin(r,await authenticate(r,accessEnv)));}
});

test('request contexts do not share identity and valid outsider is not an administrator',async()=>{
 const admin=request({'cf-access-jwt-assertion':tokens.owner}),outsider=request({'cf-access-jwt-assertion':tokens.outsider}),anon=request();
 const [a,b,c]=await Promise.all([admin,outsider,anon].map(r=>authenticate(r,accessEnv)));
 assert(isAdmin(admin,a));assert(identity(outsider,b));assert(!isAdmin(outsider,b));assert.equal(identity(anon,c),null);
});

test('missing auth configuration fails closed and login redirects only to the configured Access team',async()=>{
 const r=request({'cf-access-jwt-assertion':tokens.owner});assert(!isAdmin(r,await authenticate(r,{ADMIN_EMAIL:accessEnv.ADMIN_EMAIL})));
 assert.equal((await worker.fetch(request(),{})).status,503);
 const response=await worker.fetch(request(),accessEnv);assert.equal(response.status,302);
 const redirect=new URL(response.headers.get('location'));assert.equal(redirect.hostname,accessEnv.ACCESS_TEAM_DOMAIN);assert.equal(redirect.searchParams.get('redirect_url'),origin+'/admin');
 assert.throws(()=>loginURL(r,{...accessEnv,ACCESS_TEAM_DOMAIN:'evil.example'}));
});

test('state-changing requests require same origin and admin header',()=>{
 assert.throws(()=>assertWrite(new Request(origin+'/api/admin/works',{method:'POST',headers:{origin:'https://evil.example','X-Aurovoy-Admin':'1'}})));
 assert.throws(()=>assertWrite(new Request(origin+'/api/admin/works',{method:'POST',headers:{origin}})));
 assert.doesNotThrow(()=>assertWrite(new Request(origin+'/api/admin/works',{method:'POST',headers:{origin,'X-Aurovoy-Admin':'1'}})));
});
