import { GRAPH_BASE, META_SCOPES, metaConfig } from "./config";
import { uid } from "../format";

export function buildLoginUrl(state: string): string {
  const { appId, redirectUri } = metaConfig();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: META_SCOPES,
    response_type: "code",
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

export function newOauthState(): string {
  return uid("oauth");
}

export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  userName: string;
}> {
  const { appId, appSecret, redirectUri } = metaConfig();
  const shortParams = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    client_secret: appSecret,
    code,
  });
  const shortRes = await fetch(`${GRAPH_BASE}/oauth/access_token?${shortParams}`);
  const shortJson = (await shortRes.json()) as { access_token?: string; error?: { message: string } };
  if (!shortJson.access_token) {
    throw new Error(shortJson.error?.message ?? "Could not exchange Facebook login code.");
  }

  const longParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortJson.access_token,
  });
  const longRes = await fetch(`${GRAPH_BASE}/oauth/access_token?${longParams}`);
  const longJson = (await longRes.json()) as { access_token?: string };
  const token = longJson.access_token ?? shortJson.access_token;

  const meRes = await fetch(`${GRAPH_BASE}/me?fields=name&access_token=${encodeURIComponent(token)}`);
  const me = (await meRes.json()) as { name?: string };
  return { accessToken: token, userName: me.name ?? "Facebook user" };
}
