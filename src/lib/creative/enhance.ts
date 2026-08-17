import { ctaOptions } from "../copy";
import type { AdCreative, Objective } from "../types";

const WEASEL = /\b(amazing|awesome|best|great|quality|synergy|unlock|elevate|leverage|world-class|premium)\b/gi;

const SENSORY: Record<string, string[]> = {
  bakery: ["warm from the oven", "crust you can hear", "butter on the counter"],
  coffee: ["just pulled", "still steaming", "the good beans"],
  gym: ["forty-five focused minutes", "no mirrors, no nonsense"],
  shop: ["in stock this week", "ships in two days"],
  restaurant: ["tonight's tables", "the dish people come back for"],
};

function sensoryFor(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [key, lines] of Object.entries(SENSORY)) {
    if (lower.includes(key)) return lines[text.length % lines.length];
  }
  return null;
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 20 ? cut.slice(0, space) : cut).trim()}…`;
}

function titleCaseWords(s: string): string {
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length <= 2 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

export type EnhanceInput = {
  headline: string;
  primaryText: string;
  cta: string;
  business?: string;
  objective?: Objective;
  offer?: string;
};

export type EnhanceResult = {
  headline: string;
  primaryText: string;
  cta: string;
  notes: string[];
};

export function enhanceCopy(input: EnhanceInput): EnhanceResult {
  const notes: string[] = [];
  const business = input.business?.trim() || "";
  const rawHead = input.headline.replace(WEASEL, "").replace(/\s+/g, " ").trim();
  const rawBody = input.primaryText.replace(WEASEL, "").replace(/\s+/g, " ").trim();
  const offer = input.offer?.trim() || "";
  const sense = sensoryFor(`${rawHead} ${rawBody} ${business}`);

  let headline = rawHead
    .replace(/^(introducing|welcome to|check out)\s+/i, "")
    .replace(/[!.]+$/g, "");

  if (headline.length < 8 && business) {
    headline = sense ? `${sense}` : `${business}, this week`;
    notes.push("The headline was too vague, so I led with something you can picture.");
  } else if (!/\d|you |your |this |today|tonight|week/i.test(headline) && sense) {
    headline = `${titleCaseWords(headline)} — ${sense}`;
    notes.push("I added a concrete detail. Specific beats 'quality.'");
  }
  headline = clip(titleCaseWords(headline), 40);
  if (rawHead.length > 40) notes.push("Facebook shows about 40 characters of a headline before it cuts.");

  const sentences = rawBody
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const first = sentences[0] || rawBody || (business ? `${business} is open.` : "Come see us.");
  const rest = sentences.slice(1).join(" ");
  const hook = sense && !first.toLowerCase().includes(sense.split(" ")[0]) ? `${sense[0].toUpperCase()}${sense.slice(1)}. ` : "";
  const ask =
    input.objective === "messages"
      ? "Message us — a person answers."
      : input.objective === "leads"
        ? "Leave your name. We'll follow up once."
        : input.objective === "sales"
          ? "Order before it sells out."
          : "Tap through for hours, the menu, and what's actually in the case.";

  let primaryText = `${hook}${first}${offer ? ` ${offer}` : ""}${rest ? ` ${rest}` : ""} ${ask}`
    .replace(/\s+/g, " ")
    .replace(/\.\s+\./g, ".")
    .trim();
  if (primaryText.length > 125) {
    notes.push("I kept the first 125 characters tight — that's what people see before “See more.”");
  }
  primaryText = clip(primaryText, 220);

  let cta = input.cta;
  if (input.objective === "messages") cta = "Send message";
  else if (input.objective === "leads") cta = "Sign up";
  else if (input.objective === "sales") cta = "Shop now";
  else if (!ctaOptions.includes(cta)) cta = "Learn more";
  if (cta !== input.cta) notes.push(`The button now says “${cta}” so it matches the goal.`);

  if (!notes.length) notes.push("Tightened the words. Same meaning, easier to finish reading on a phone.");

  return { headline, primaryText, cta, notes };
}

export function enhanceCreative(ad: AdCreative, extra?: Omit<EnhanceInput, "headline" | "primaryText" | "cta">): AdCreative {
  const next = enhanceCopy({
    headline: ad.rawHeadline ?? ad.headline,
    primaryText: ad.rawPrimaryText ?? ad.primaryText,
    cta: ad.cta,
    ...extra,
  });
  return {
    ...ad,
    rawHeadline: ad.rawHeadline ?? ad.headline,
    rawPrimaryText: ad.rawPrimaryText ?? ad.primaryText,
    headline: next.headline,
    primaryText: next.primaryText,
    cta: next.cta,
    enhanceOn: true,
  };
}

export function restoreCreative(ad: AdCreative): AdCreative {
  return {
    ...ad,
    headline: ad.rawHeadline ?? ad.headline,
    primaryText: ad.rawPrimaryText ?? ad.primaryText,
    enhanceOn: false,
  };
}
