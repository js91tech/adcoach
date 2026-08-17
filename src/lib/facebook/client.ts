import { resultLabelFor } from "../coach/apply";
import type { AdAccountOption, Campaign, Objective } from "../types";

const APP_ID_KEY = "adcoach-fb-app-id";
const SESSION_KEY = "adcoach-fb-session";
const GRAPH = "https://graph.facebook.com/v21.0";
export const FB_SCOPES = [
  "ads_read",
  "ads_management",
  "business_management",
  "pages_show_list",
].join(",");

export type FacebookSession = {
  token: string;
  userName: string;
  userId: string;
  adAccount?: { id: string; name: string; currency: string };
  expiresAt: number;
};

export function getFacebookAppId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(APP_ID_KEY) ?? "";
}

export function setFacebookAppId(id: string) {
  localStorage.setItem(APP_ID_KEY, id.trim());
}

export function getFacebookSession(): FacebookSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as FacebookSession;
    if (session.expiresAt && session.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setFacebookSession(session: FacebookSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearFacebookSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function facebookLoginUrl(appId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: FB_SCOPES,
    display: "page",
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

export function parseTokenFromHash(hash: string): { token: string; expiresIn: number } | { error: string } | null {
  const q = new URLSearchParams(hash.replace(/^#/, ""));
  const error = q.get("error_description") || q.get("error");
  if (error) return { error };
  const token = q.get("access_token");
  if (!token) return null;
  return { token, expiresIn: Number(q.get("expires_in") ?? 3600) };
}

async function graph<T>(path: string, token: string): Promise<T> {
  const url = `${GRAPH}${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const json = (await res.json()) as T & { error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json;
}

export async function fetchMe(token: string) {
  return graph<{ id: string; name: string }>(`/me?fields=id,name`, token);
}

export function isPracticeToken(token?: string | null): boolean {
  return token === "practice";
}

export async function fetchAdAccounts(token: string): Promise<AdAccountOption[]> {
  if (isPracticeToken(token)) return [];
  const data = await graph<{
    data: { id: string; name: string; currency: string; account_status: number }[];
  }>(`/me/adaccounts?fields=id,name,currency,account_status`, token);
  return (data.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
    accountStatus: a.account_status,
  }));
}

const objectiveFromMeta: Record<string, Objective> = {
  OUTCOME_AWARENESS: "awareness",
  OUTCOME_TRAFFIC: "traffic",
  OUTCOME_ENGAGEMENT: "engagement",
  OUTCOME_LEADS: "leads",
  OUTCOME_SALES: "sales",
  OUTCOME_APP_PROMOTION: "traffic",
  LINK_CLICKS: "traffic",
  CONVERSIONS: "sales",
  REACH: "awareness",
  MESSAGES: "messages",
};

export async function fetchCampaigns(token: string, adAccountId: string, business = "Facebook ad account") {
  if (isPracticeToken(token)) return [];
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const data = await graph<{
    data: {
      id: string;
      name: string;
      status: string;
      effective_status: string;
      objective: string;
      daily_budget?: string;
      insights?: {
        data: { spend?: string; impressions?: string; clicks?: string; ctr?: string; cpc?: string }[];
      };
    }[];
  }>(
    `/${act}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,insights.date_preset(maximum){spend,impressions,clicks,ctr,cpc}&limit=50`,
    token,
  );

  return (data.data ?? []).map((row) => {
    const insight = row.insights?.data?.[0];
    const objective = objectiveFromMeta[row.objective] ?? "traffic";
    const spent = Number(insight?.spend ?? 0);
    const clicks = Number(insight?.clicks ?? 0);
    const impressions = Number(insight?.impressions ?? 0);
    const status: Campaign["status"] =
      row.effective_status === "ACTIVE"
        ? "active"
        : row.status === "PAUSED" || row.effective_status === "PAUSED"
          ? "paused"
          : "paused";
    const daily = row.daily_budget != null ? Number(row.daily_budget) / 100 : 20;
    return {
      id: `meta_${row.id}`,
      metaCampaignId: row.id,
      name: row.name,
      business,
      objective,
      status,
      dailyBudget: daily || 20,
      targeting: {
        locations: ["from Facebook"],
        ageMin: 18,
        ageMax: 65,
        gender: "all",
        interests: [],
      },
      placements: ["automatic"],
      ad: {
        headline: row.name,
        primaryText: "Imported from Facebook. Ask Coach to change spend, pause, or targeting.",
        cta: "Learn more",
        destinationUrl: "https://facebook.com",
        visualLabel: "Facebook campaign",
      },
      createdAt: new Date().toISOString(),
      stats: {
        spent,
        impressions,
        clicks,
        results: clicks,
        resultLabel: resultLabelFor(objective),
        ctr: Number(insight?.ctr ?? 0),
        cpc: Number(insight?.cpc ?? 0),
      },
    } satisfies Campaign;
  });
}
