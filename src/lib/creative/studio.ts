import { defaultCreative, resultLabelFor } from "../coach/apply";
import { enhanceCopy } from "./enhance";
import type { Campaign, Objective } from "../types";

const OBJECTIVE_HINTS: { re: RegExp; objective: Objective }[] = [
  { re: /\b(buy|shop|order|purchase|sell)\b/i, objective: "sales" },
  { re: /\b(signup|sign up|waitlist|quote|email)\b/i, objective: "leads" },
  { re: /\b(message|chat|whatsapp|dm)\b/i, objective: "messages" },
  { re: /\b(like|comment|follow|share)\b/i, objective: "engagement" },
  { re: /\b(aware|brand|known|name out)\b/i, objective: "awareness" },
];

export type StudioBrief = {
  prompt: string;
  business?: string;
  website?: string;
  dailyBudget?: number;
};

export type StudioPackage = {
  campaign: Omit<Campaign, "id" | "createdAt">;
  imagePrompt: string;
  palette: [string, string, string];
  notes: string[];
};

function guessObjective(text: string): Objective {
  for (const h of OBJECTIVE_HINTS) {
    if (h.re.test(text)) return h.objective;
  }
  return "traffic";
}

function guessBusiness(text: string, fallback: string): string {
  const forMy = text.match(/\bfor (?:my |our |a )?([^,.]+)/i);
  if (forMy) return forMy[1].replace(/\s+(in|to|who|with)\b[\s\S]*$/i, "").trim();
  const named = text.match(/^([^,.!?]{3,40})/);
  return (named?.[1] ?? fallback).trim();
}

function paletteFor(seed: string): [string, string, string] {
  const palettes: [string, string, string][] = [
    ["#1F5C4A", "#F3EEE4", "#C45C26"],
    ["#1C1917", "#F6EDE3", "#C4A574"],
    ["#163F34", "#FFF8EE", "#B45309"],
    ["#2F3A4A", "#F4EFE6", "#8B3A2D"],
    ["#3D2B1F", "#F7F1E6", "#C45C26"],
  ];
  let n = 0;
  for (let i = 0; i < seed.length; i++) n += seed.charCodeAt(i);
  return palettes[n % palettes.length];
}

export function createFromBrief(brief: StudioBrief, fallbackBusiness: string): StudioPackage {
  const prompt = brief.prompt.trim();
  const business = brief.business?.trim() || guessBusiness(prompt, fallbackBusiness);
  const objective = guessObjective(prompt);
  const budget = brief.dailyBudget && brief.dailyBudget > 0 ? brief.dailyBudget : 20;
  const draft = defaultCreative({ business, objective, offer: prompt });
  const copy = enhanceCopy({
    headline: draft.headline,
    primaryText: prompt.length > 40 ? prompt : draft.primaryText,
    cta: draft.cta,
    business,
    objective,
    offer: prompt,
  });
  const palette = paletteFor(business + prompt);
  const imagePrompt = `${business}, ${prompt}, editorial food-and-shop photography, warm window light, 35mm, no text, no watermark, no logo`;

  return {
    campaign: {
      name: `${business} — from a brief`,
      business,
      objective,
      status: "draft",
      dailyBudget: budget,
      targeting: {
        locations: ["people near your business"],
        ageMin: 25,
        ageMax: 54,
        gender: "all",
        interests: [],
      },
      placements: ["automatic"],
      ad: {
        headline: copy.headline,
        primaryText: copy.primaryText,
        cta: copy.cta,
        destinationUrl: brief.website || "https://example.com",
        visualLabel: imagePrompt,
        enhanceOn: true,
        rawHeadline: draft.headline,
        rawPrimaryText: prompt,
      },
      stats: {
        spent: 0,
        impressions: 0,
        clicks: 0,
        results: 0,
        resultLabel: resultLabelFor(objective),
        ctr: 0,
        cpc: 0,
      },
    },
    imagePrompt,
    palette,
    notes: copy.notes,
  };
}

export function photoUrl(prompt: string, seed = Date.now()): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1350&nologo=true&enhance=true&seed=${seed}`;
}
