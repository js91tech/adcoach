import type { Campaign, Objective, Placement, Targeting } from "./types";

export const objectiveCopy: Record<
  Objective,
  { label: string; facebook: string; help: string }
> = {
  awareness: {
    label: "Get your name out there",
    facebook: "Awareness",
    help: "Shows your ad to as many of the right people as possible, so they remember you.",
  },
  traffic: {
    label: "Send people to your website",
    facebook: "Traffic",
    help: "Pays for clicks to your site, menu, booking page, or shop.",
  },
  engagement: {
    label: "Get more likes and comments",
    facebook: "Engagement",
    help: "Finds people likely to react, comment, or share so your post travels farther.",
  },
  messages: {
    label: "Start conversations",
    facebook: "Messages",
    help: "Opens a chat so people can ask questions or book without leaving the app.",
  },
  leads: {
    label: "Collect names and emails",
    facebook: "Leads",
    help: "A short form on the ad itself — good for quotes, waitlists, and signups.",
  },
  sales: {
    label: "Get purchases",
    facebook: "Sales",
    help: "Looks for people likely to buy. Works best if your website already tracks purchases.",
  },
};

export const placementCopy: Record<Placement, { label: string; facebook: string }> = {
  automatic: { label: "Let Facebook pick the best spots", facebook: "Advantage+ placements" },
  facebook_feed: { label: "Facebook news feed", facebook: "Facebook Feed" },
  instagram_feed: { label: "Instagram feed", facebook: "Instagram Feed" },
  stories: { label: "Stories", facebook: "Stories" },
  reels: { label: "Reels", facebook: "Reels" },
};

export const ctaOptions = [
  "Learn more",
  "Shop now",
  "Sign up",
  "Book now",
  "Send message",
  "Get quote",
  "Call now",
];

export function targetingSentence(t: Targeting): string {
  const who =
    t.gender === "women" ? "women" : t.gender === "men" ? "men" : "people";
  const ages = `ages ${t.ageMin}–${t.ageMax}`;
  const where =
    t.locations.length === 0
      ? "near your business"
      : t.locations.join(", ");
  const likes =
    t.interests.length > 0
      ? ` who like ${joinAnd(t.interests)}`
      : "";
  const custom = t.customAudience ? ` Also includes ${t.customAudience}.` : "";
  return `${who} ${ages} in ${where}${likes}.${custom}`;
}

export function campaignPlainSummary(c: Campaign): string {
  const goal = objectiveCopy[c.objective].label.toLowerCase();
  const status =
    c.status === "active"
      ? "Running"
      : c.status === "paused"
        ? "Paused"
        : "Draft";
  return `${status}. Goal: ${goal}. Shows to ${targetingSentence(c.targeting)} Spending $${c.dailyBudget}/day.`;
}

export function joinAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export const starterPrompts = [
  "Create an ad for my bakery, $25 a day, people nearby who like coffee",
  "Pause ads that aren't working",
  "Only show the bakery ad to women 25–45 in Tampa",
  "How much have I spent, and what's working?",
  "Lower my daily spend — I'm getting nervous",
  "Turn the holiday ads back on at $20 a day",
];
