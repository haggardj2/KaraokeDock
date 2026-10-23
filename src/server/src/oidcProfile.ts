import * as oidc from 'openid-client';

export function getOidcGroupRole(groups: unknown): 'admin' | 'user' | null {
  const memberships = Array.isArray(groups) ? groups : [groups];
  if (memberships.includes('karaokedock_admin')) return 'admin';
  if (memberships.includes('karaokedock_user')) return 'user';
  return null;
}

export async function getOidcProfileClaims(
  config: oidc.Configuration,
  tokenSet: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers,
) {
  const claims = tokenSet.claims();
  if (!claims?.sub) throw new Error('Missing subject claim from OIDC token');
  if (config.serverMetadata().userinfo_endpoint
      && (!claims.picture || !claims.email || !claims.name || claims.groups === undefined)) {
    const userInfo = await oidc.fetchUserInfo(config, tokenSet.access_token, claims.sub);
    return { ...claims, ...userInfo, sub: claims.sub };
  }
  return claims;
}
