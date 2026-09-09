import {generateKeyPair,exportJWK,SignJWT} from 'jose';

export const accessEnv={ADMIN_EMAIL:'owner@example.test',ACCESS_TEAM_DOMAIN:'aurovoy-test.cloudflareaccess.com',ACCESS_AUD:'test-application'};
export const issuer='https://'+accessEnv.ACCESS_TEAM_DOMAIN;
const {publicKey,privateKey}=await generateKeyPair('RS256');
const jwk={...await exportJWK(publicKey),kid:'test-key',alg:'RS256',use:'sig'};
globalThis.fetch=async (input,init)=>{
 if(String(input)===issuer+'/cdn-cgi/access/certs')return Response.json({keys:[jwk]});
 throw Error('Unexpected network request in test: '+input);
};
export async function tokenFor(email,claims={},key=privateKey){
 return new SignJWT({email,type:'app',...claims}).setProtectedHeader({alg:'RS256',kid:'test-key'})
 .setIssuer(claims.iss??issuer).setAudience(claims.aud??accessEnv.ACCESS_AUD)
 .setSubject(claims.sub??email).setIssuedAt().setExpirationTime(claims.exp??'1h').sign(key);
}
export const tokens={owner:await tokenFor('owner@example.test'),outsider:await tokenFor('outsider@example.test')};
