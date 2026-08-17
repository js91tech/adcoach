export const GRAPH_VERSION = "v21.0";
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const META_SCOPES = [
  "ads_read",
  "ads_management",
  "business_management",
  "pages_show_list",
  "pages_read_engagement",
].join(",");

export function metaConfig() {
  const appId = process.env.META_APP_ID ?? "";
  const appSecret = process.env.META_APP_SECRET ?? "";
  const redirectUri =
    process.env.META_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/meta/callback`;
  return {
    appId,
    appSecret,
    redirectUri,
    configured: Boolean(appId && appSecret),
  };
}

export const COOKIE = {
  token: "adcoach_meta_token",
  user: "adcoach_meta_user",
  account: "adcoach_ad_account",
  state: "adcoach_oauth_state",
} as const;
