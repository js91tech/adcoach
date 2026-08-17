import { GRAPH_BASE } from "./config";
import { resultLabelFor } from "../coach/apply";
import type { AdAccountOption, Campaign, CoachAction, Objective } from "../types";

type GraphError = { error?: { message: string } };

async function graph<T>(
  path: string,
  token: string,
  body?: Record<string, string>,
): Promise<T> {
  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;
  const separator = url.includes("?") ? "&" : "?";
  const withToken = `${url}${separator}access_token=${encodeURIComponent(token)}`;
  const res = await fetch(withToken, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
    body: body ? new URLSearchParams(body) : undefined,
  });
  const json = (await res.json()) as T & GraphError;
  if (json.error) {
    throw new Error(json.error.message);
  }
  return json;
}

export async function listAdAccounts(token: string): Promise<AdAccountOption[]> {
  const data = await graph<{
    data: { id: string; name: string; currency: string; account_status: number }[];
  }>(
    "/me/adaccounts?fields=id,name,account_status,currency,timezone_name",
    token,
  );
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

const objectiveToMeta: Record<Objective, string> = {
  awareness: "OUTCOME_AWARENESS",
  traffic: "OUTCOME_TRAFFIC",
  engagement: "OUTCOME_ENGAGEMENT",
  messages: "OUTCOME_LEADS",
  leads: "OUTCOME_LEADS",
  sales: "OUTCOME_SALES",
};

export async function listCampaigns(token: string, adAccountId: string): Promise<Campaign[]> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const data = await graph<{
    data: {
      id: string;
      name: string;
      status: string;
      effective_status: string;
      objective: string;
      daily_budget?: string;
      lifetime_budget?: string;
      insights?: { data: { spend?: string; impressions?: string; clicks?: string; ctr?: string; cpc?: string }[] };
    }[];
  }>(
    `/${act}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,insights.date_preset(maximum){spend,impressions,clicks,ctr,cpc}&limit=50`,
    token,
  );

  return (data.data ?? []).map((row) => {
    const insight = row.insights?.data?.[0];
    const objective = objectiveFromMeta[row.objective] ?? "traffic";
    const spent = Number(insight?.spend ?? 0);
    const clicks = Number(insight?.clicks ?? 0);
    const impressions = Number(insight?.impressions ?? 0);
    const status =
      row.effective_status === "ACTIVE"
        ? "active"
        : row.status === "PAUSED" || row.effective_status === "PAUSED"
          ? "paused"
          : "paused";
    const daily =
      row.daily_budget != null ? Number(row.daily_budget) / 100 : 20;
    return {
      id: `meta_${row.id}`,
      metaCampaignId: row.id,
      name: row.name,
      business: "Facebook ad account",
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

export async function applyOnMeta(
  token: string,
  adAccountId: string,
  actions: CoachAction[],
  campaigns: Campaign[],
): Promise<string[]> {
  const notes: string[] = [];
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  for (const action of actions) {
    try {
      switch (action.type) {
        case "pause":
        case "resume": {
          const status = action.type === "pause" ? "PAUSED" : "ACTIVE";
          for (const id of action.campaignIds) {
            const metaId = campaigns.find((c) => c.id === id)?.metaCampaignId;
            if (!metaId) {
              notes.push("Skipped a demo-only campaign (no Facebook id).");
              continue;
            }
            await graph(`/${metaId}`, token, { status });
          }
          notes.push(action.type === "pause" ? "Paused on Facebook." : "Set live on Facebook.");
          break;
        }
        case "update_budget": {
          if (action.dailyBudget == null) break;
          for (const id of action.campaignIds) {
            const metaId = campaigns.find((c) => c.id === id)?.metaCampaignId;
            if (!metaId) continue;
            const sets = await graph<{ data: { id: string }[] }>(
              `/${metaId}/adsets?fields=id`,
              token,
            );
            const adSetId = sets.data?.[0]?.id;
            if (!adSetId) {
              notes.push("Found the campaign but no ad set to attach a budget to.");
              continue;
            }
            await graph(`/${adSetId}`, token, {
              daily_budget: String(Math.round(action.dailyBudget * 100)),
            });
          }
          notes.push("Updated daily budget on Facebook.");
          break;
        }
        case "create_campaign": {
          const created = await graph<{ id: string }>(`/${act}/campaigns`, token, {
            name: action.campaign.name,
            objective: objectiveToMeta[action.campaign.objective],
            status: "PAUSED",
            special_ad_categories: "[]",
          });
          notes.push(
            `Created Facebook campaign ${created.id} as a paused draft. Ad sets and the actual ad creative still need a Page (and usually a pixel) — finish those in Ads Manager, or ask once those are connected.`,
          );
          break;
        }
        default:
          notes.push("That change is saved in AdCoach. Some targeting/copy edits still need Ads Manager or a Page connection.");
      }
    } catch (err) {
      notes.push(err instanceof Error ? err.message : "Facebook rejected a change.");
    }
  }

  return notes;
}

