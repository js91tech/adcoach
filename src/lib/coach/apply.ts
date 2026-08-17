import { objectiveCopy, targetingSentence } from "../copy";
import { money, uid } from "../format";
import type {
  AdCreative,
  AppState,
  Campaign,
  CoachAction,
  Objective,
  Placement,
  Targeting,
} from "../types";

export function emptyStats(resultLabel: string): Campaign["stats"] {
  return {
    spent: 0,
    impressions: 0,
    clicks: 0,
    results: 0,
    resultLabel,
    ctr: 0,
    cpc: 0,
  };
}

export function resultLabelFor(objective: Objective): string {
  switch (objective) {
    case "awareness":
      return "people reached";
    case "traffic":
      return "website visits";
    case "engagement":
      return "post interactions";
    case "messages":
      return "conversations";
    case "leads":
      return "signups";
    case "sales":
      return "purchases";
    default:
      return "results";
  }
}

function mergeTargeting(base: Targeting, patch: Partial<Targeting>): Targeting {
  return {
    ...base,
    ...patch,
    locations: patch.locations ?? base.locations,
    interests: patch.interests ?? base.interests,
  };
}

export function isUnderperforming(c: Campaign): boolean {
  if (c.status !== "active") return false;
  if (c.stats.spent < 40) return false;
  if (c.objective === "sales" && (c.stats.roas ?? 0) < 1) return true;
  if (c.stats.ctr < 0.8 && c.stats.spent > 80) return true;
  if (c.stats.results === 0 && c.stats.spent > 60) return true;
  return false;
}

export function isWinning(c: Campaign): boolean {
  if (c.status !== "active") return false;
  if (c.stats.roas && c.stats.roas >= 2) return true;
  if (c.stats.ctr >= 1.4 && c.stats.results > 0) return true;
  return false;
}

export function applyActions(state: AppState, actions: CoachAction[]): AppState {
  let campaigns = [...state.campaigns];
  let account = { ...state.account };

  for (const action of actions) {
    switch (action.type) {
      case "create_campaign": {
        const campaign: Campaign = {
          ...action.campaign,
          id: uid("camp"),
          createdAt: new Date().toISOString(),
          stats: action.campaign.stats ?? emptyStats(resultLabelFor(action.campaign.objective)),
        };
        campaigns = [campaign, ...campaigns];
        break;
      }
      case "pause":
        campaigns = campaigns.map((c) =>
          action.campaignIds.includes(c.id) ? { ...c, status: "paused" } : c,
        );
        break;
      case "resume":
        campaigns = campaigns.map((c) =>
          action.campaignIds.includes(c.id) ? { ...c, status: "active" } : c,
        );
        break;
      case "update_budget":
        campaigns = campaigns.map((c) =>
          action.campaignIds.includes(c.id)
            ? {
                ...c,
                dailyBudget: action.dailyBudget ?? c.dailyBudget,
                lifetimeBudget: action.lifetimeBudget ?? c.lifetimeBudget,
              }
            : c,
        );
        break;
      case "update_targeting":
        campaigns = campaigns.map((c) =>
          action.campaignIds.includes(c.id)
            ? { ...c, targeting: mergeTargeting(c.targeting, action.targeting) }
            : c,
        );
        break;
      case "update_objective":
        campaigns = campaigns.map((c) =>
          action.campaignIds.includes(c.id)
            ? {
                ...c,
                objective: action.objective,
                stats: { ...c.stats, resultLabel: resultLabelFor(action.objective) },
              }
            : c,
        );
        break;
      case "update_ad":
        campaigns = campaigns.map((c) =>
          action.campaignIds.includes(c.id) ? { ...c, ad: { ...c.ad, ...action.ad } } : c,
        );
        break;
      case "update_placements":
        campaigns = campaigns.map((c) =>
          action.campaignIds.includes(c.id) ? { ...c, placements: action.placements } : c,
        );
        break;
      case "optimize": {
        const losers = campaigns.filter(isUnderperforming).map((c) => c.id);
        const winners = campaigns.filter(isWinning);
        campaigns = campaigns.map((c) => {
          if (losers.includes(c.id)) return { ...c, status: "paused" as const };
          if (winners.some((w) => w.id === c.id)) {
            return { ...c, dailyBudget: Math.round(c.dailyBudget * 1.15) };
          }
          return c;
        });
        break;
      }
      case "set_account_cap":
        account = { ...account, dailyCap: action.dailyCap };
        break;
      case "import_campaigns":
        campaigns = action.campaigns;
        break;
    }
  }

  if (account.dailyCap != null) {
    const activeSpend = campaigns
      .filter((c) => c.status === "active")
      .reduce((sum, c) => sum + c.dailyBudget, 0);
    if (activeSpend > account.dailyCap) {
      const scale = account.dailyCap / activeSpend;
      campaigns = campaigns.map((c) =>
        c.status === "active"
          ? { ...c, dailyBudget: Math.max(1, Math.round(c.dailyBudget * scale)) }
          : c,
      );
    }
  }

  return { ...state, campaigns, account };
}

export function actionSummary(action: CoachAction, campaigns: Campaign[]): string {
  const names = (ids: string[]) =>
    ids
      .map((id) => campaigns.find((c) => c.id === id)?.name ?? "an ad")
      .join(", ");

  switch (action.type) {
    case "create_campaign":
      return `Drafted “${action.campaign.name}” at $${action.campaign.dailyBudget}/day.`;
    case "pause":
      return `Paused ${names(action.campaignIds)}.`;
    case "resume":
      return `Turned ${names(action.campaignIds)} back on.`;
    case "update_budget":
      return action.dailyBudget != null
        ? `Set ${names(action.campaignIds)} to ${money(action.dailyBudget)}/day.`
        : `Updated the budget on ${names(action.campaignIds)}.`;
    case "update_targeting":
      return `Updated who sees ${names(action.campaignIds)}.`;
    case "update_objective":
      return `Changed the goal of ${names(action.campaignIds)} to ${objectiveCopy[action.objective].label.toLowerCase()}.`;
    case "update_ad":
      return `Updated the ad copy on ${names(action.campaignIds)}.`;
    case "update_placements":
      return `Changed where ${names(action.campaignIds)} can appear.`;
    case "optimize":
      return "Paused weak ads and nudged budget toward what's working.";
    case "set_account_cap":
      return action.dailyCap == null
        ? "Removed the daily spending cap."
        : `Capped all ads at ${money(action.dailyCap)}/day combined.`;
    case "import_campaigns":
      return `Loaded ${action.campaigns.length} campaigns from Facebook.`;
    default:
      return "Updated your ads.";
  }
}

export function coachTake(campaigns: Campaign[]): string {
  const active = campaigns.filter((c) => c.status === "active");
  const losers = active.filter(isUnderperforming);
  const winners = active.filter(isWinning);
  const spend = active.reduce((s, c) => s + c.dailyBudget, 0);

  if (active.length === 0) {
    return "Nothing is running. Say the word and I'll draft an ad from a plain-English description of your business.";
  }
  if (losers.length && winners.length) {
    return `${winners[0].name} is doing the job. ${losers[0].name} is spending without much to show for it — I'd pause it. Combined you're set to spend ${money(spend)} today.`;
  }
  if (losers.length) {
    return `${losers[0].name} isn't earning its keep. I'd pause it or tighten who sees it before you spend another day at ${money(losers[0].dailyBudget)}.`;
  }
  if (winners.length) {
    return `${winners[0].name} looks healthy. Keep it running. Daily pace is ${money(spend)}.`;
  }
  return `You have ${active.length} ad${active.length === 1 ? "" : "s"} on, about ${money(spend)} today. Nothing looks broken — I can still tighten targeting or copy if you want.`;
}

export function describeCampaignChange(before: Campaign, after: Campaign): string[] {
  const notes: string[] = [];
  if (before.status !== after.status) {
    notes.push(after.status === "active" ? "It's running again." : "It's paused.");
  }
  if (before.dailyBudget !== after.dailyBudget) {
    notes.push(`Daily spend is now ${money(after.dailyBudget)} (was ${money(before.dailyBudget)}).`);
  }
  if (before.objective !== after.objective) {
    notes.push(`Goal is now: ${objectiveCopy[after.objective].label.toLowerCase()}.`);
  }
  if (JSON.stringify(before.targeting) !== JSON.stringify(after.targeting)) {
    notes.push(`It now shows to ${targetingSentence(after.targeting)}`);
  }
  return notes;
}

export function defaultCreative(input: {
  business: string;
  objective: Objective;
  offer?: string;
}): AdCreative {
  const { business, objective, offer } = input;
  const lines: Record<Objective, AdCreative> = {
    awareness: {
      headline: `Meet ${business}`,
      primaryText: offer
        ? `${business} — ${offer}`
        : `${business} is for people nearby who care about this kind of thing. Come see us.`,
      cta: "Learn more",
      destinationUrl: "https://example.com",
      visualLabel: "Brand photo",
    },
    traffic: {
      headline: `See what ${business} is up to`,
      primaryText: offer
        ? `${offer} Take a look on our site.`
        : `See menus, hours, and what's new at ${business}.`,
      cta: "Learn more",
      destinationUrl: "https://example.com",
      visualLabel: "Website preview",
    },
    engagement: {
      headline: `${business} wants your take`,
      primaryText: offer ?? `Tap through, leave a comment, tell a friend. ${business} is posting this week.`,
      cta: "Learn more",
      destinationUrl: "https://example.com",
      visualLabel: "Lifestyle photo",
    },
    messages: {
      headline: `Ask ${business} anything`,
      primaryText: offer ?? `Questions about hours, pricing, or booking? Message ${business} — a real person will answer.`,
      cta: "Send message",
      destinationUrl: "https://example.com",
      visualLabel: "Storefront",
    },
    leads: {
      headline: `Save your spot with ${business}`,
      primaryText: offer ?? `Leave your name and we'll follow up. No spam — just ${business}.`,
      cta: "Sign up",
      destinationUrl: "https://example.com",
      visualLabel: "Signup still",
    },
    sales: {
      headline: `Shop ${business}`,
      primaryText: offer ?? `Order from ${business} without leaving the couch.`,
      cta: "Shop now",
      destinationUrl: "https://example.com",
      visualLabel: "Product photo",
    },
  };
  return lines[objective];
}
