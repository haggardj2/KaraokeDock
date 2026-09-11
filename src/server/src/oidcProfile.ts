import * as oidc from 'openid-client';

export async function getOidcProfileClaims(
  config: oidc.Configuration,
  tokenSet: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers,
) {
  const claims = tokenSet.claims();
  if (!claims?.sub) throw new Error('Missing subject claim from OIDC token');
  if (config.serverMetadata().userinfo_endpoint && (!claims.picture || !claims.email || !claims.name)) {
    const userInfo = await oidc.fetchUserInfo(config, tokenSet.access_token, claims.sub);
    return { ...claims, ...userInfo, sub: claims.sub };
  }
  return claims;
}
