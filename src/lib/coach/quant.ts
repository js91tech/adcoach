import { money, percent } from "../format";
import type { Campaign, CoachMath, Objective, QuantRow } from "../types";

export type Verdict = "scale" | "hold" | "fix" | "pause" | "too_soon";

export type CampaignQuant = {
  id: string;
  name: string;
  status: Campaign["status"];
  objective: Objective;
  spent: number;
  dailyBudget: number;
  results: number;
  resultLabel: string;
  impressions: number;
  cpa: number | null;
  cpc: number;
  ctr: number;
  cpm: number;
  roas?: number;
  budgetShare: number;
  resultShare: number;
  wasteIndex: number;
  efficiency: number;
  confidence: number;
  verdict: Verdict;
  why: string;
};

export type Reallocation = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  dollars: number;
  extraResults: number;
  resultLabel: string;
};

export type AccountQuant = {
  campaigns: CampaignQuant[];
  totalSpent: number;
  dailyPace: number;
  blendedCpa: number | null;
  capUtilization: number | null;
  reallocations: Reallocation[];
  headline: string;
  math: CoachMath;
};

const CTR_GOOD: Record<Objective, number> = {
  awareness: 0.9,
  traffic: 1.4,
  engagement: 2.0,
  messages: 1.2,
  leads: 1.3,
  sales: 1.1,
};

const CTR_WEAK: Record<Objective, number> = {
  awareness: 0.5,
  traffic: 0.8,
  engagement: 1.0,
  messages: 0.7,
  leads: 0.8,
  sales: 0.7,
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

function cpaOf(c: Campaign): number | null {
  if (c.stats.results <= 0) return null;
  return c.stats.spent / c.stats.results;
}

function cpmOf(c: Campaign): number {
  if (c.stats.impressions <= 0) return 0;
  return (c.stats.spent / c.stats.impressions) * 1000;
}

function confidenceOf(c: Campaign): number {
  const spendScore = clamp(c.stats.spent / 120, 0, 1);
  const impressionScore = clamp(c.stats.impressions / 20000, 0, 1);
  return Math.round((0.6 * spendScore + 0.4 * impressionScore) * 100) / 100;
}

function efficiencyOf(c: Campaign, medianCpa: number | null): number {
  const ctrGood = CTR_GOOD[c.objective];
  const ctrScore = clamp((c.stats.ctr / ctrGood) * 70);
  const cpa = cpaOf(c);
  let resultScore = 20;
  if (c.objective === "sales" && c.stats.roas != null) {
    resultScore = clamp((c.stats.roas / 2.5) * 100);
  } else if (cpa != null && medianCpa && medianCpa > 0) {
    resultScore = clamp((medianCpa / cpa) * 80);
  } else if (c.stats.results === 0 && c.stats.spent > 40) {
    resultScore = 8;
  }
  const raw = 0.45 * ctrScore + 0.55 * resultScore;
  return Math.round(clamp(raw));
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function verdictOf(
  c: Campaign,
  q: Pick<CampaignQuant, "cpa" | "confidence" | "efficiency" | "wasteIndex" | "budgetShare" | "resultShare">,
  medianCpa: number | null,
): { verdict: Verdict; why: string } {
  if (c.status === "paused" && c.objective === "sales" && (c.stats.roas ?? 0) < 1) {
    return {
      verdict: "pause",
      why: `Already paused. ${money(c.stats.spent)} spent for ${c.stats.results} ${c.stats.resultLabel} (ROAS ${(c.stats.roas ?? 0).toFixed(2)}).`,
    };
  }
  if (q.confidence < 0.35) {
    return {
      verdict: "too_soon",
      why: `Only ${money(c.stats.spent)} in and ${c.stats.impressions.toLocaleString()} views. That's not enough to call it.`,
    };
  }
  if (c.objective === "sales" && c.stats.roas != null) {
    if (c.stats.roas < 0.85 && c.stats.spent >= 80) {
      return {
        verdict: "pause",
        why: `Every dollar spent returned ${(c.stats.roas).toFixed(2)}. Below $1.00 you're paying to lose money.`,
      };
    }
    if (c.stats.roas >= 2) {
      return { verdict: "scale", why: `ROAS ${c.stats.roas.toFixed(2)} — it's earning more than it costs.` };
    }
    if (c.stats.roas < 1.2) {
      return { verdict: "fix", why: `ROAS ${c.stats.roas.toFixed(2)} is barely breaking even. Tighten the offer or who sees it.` };
    }
    return { verdict: "hold", why: `ROAS ${c.stats.roas.toFixed(2)} is acceptable. Don't starve it, don't double it.` };
  }

  if (c.stats.results === 0 && c.stats.spent >= 60) {
    return {
      verdict: "pause",
      why: `${money(c.stats.spent)} spent and zero ${c.stats.resultLabel}. That's a dry well.`,
    };
  }
  if (q.cpa != null && medianCpa && q.cpa > medianCpa * 1.75 && q.confidence >= 0.5) {
    return {
      verdict: "pause",
      why: `Each result costs ${money(q.cpa)} vs a typical ${money(medianCpa)} on your other ads.`,
    };
  }
  if (c.stats.ctr < CTR_WEAK[c.objective] && c.stats.spent >= 80) {
    return {
      verdict: "fix",
      why: `${percent(c.stats.ctr)} clicked. Typical local ads for this goal clear ~${percent(CTR_GOOD[c.objective])}. The picture or first line is probably the problem, not the budget.`,
    };
  }
  if (q.wasteIndex > 0.18) {
    return {
      verdict: "fix",
      why: `This ad takes ${percent(q.budgetShare * 100, 0)} of the budget but only ${percent(q.resultShare * 100, 0)} of the results.`,
    };
  }
  if (q.efficiency >= 70 && q.cpa != null) {
    return {
      verdict: "scale",
      why: `Best cost in the account at ${money(q.cpa)} per ${c.stats.resultLabel.replace(/s$/, "")}. Feed this one.`,
    };
  }
  if (q.cpa != null) {
    return {
      verdict: "hold",
      why: `${money(q.cpa)} per result, ${percent(c.stats.ctr)} clicked. Keep it, watch it.`,
    };
  }
  return { verdict: "hold", why: "No red flags, no reason to spend more yet." };
}

export function analyzeCampaigns(campaigns: Campaign[], dailyCap: number | null = null): AccountQuant {
  const active = campaigns.filter((c) => c.status === "active");
  const dailyPace = active.reduce((s, c) => s + c.dailyBudget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.stats.spent, 0);
  const activeResults = active.reduce((s, c) => s + c.stats.results, 0);
  const cpas = campaigns.map(cpaOf).filter((n): n is number => n != null);
  const medianCpa = median(cpas);
  const blendedCpa =
    campaigns.reduce((s, c) => s + c.stats.results, 0) > 0
      ? totalSpent / campaigns.reduce((s, c) => s + c.stats.results, 0)
      : null;

  const rows: CampaignQuant[] = campaigns.map((c) => {
    const budgetShare = dailyPace > 0 && c.status === "active" ? c.dailyBudget / dailyPace : 0;
    const resultShare = activeResults > 0 && c.status === "active" ? c.stats.results / activeResults : 0;
    const wasteIndex = budgetShare - resultShare;
    const cpa = cpaOf(c);
    const confidence = confidenceOf(c);
    const efficiency = efficiencyOf(c, medianCpa);
    const partial = { cpa, confidence, efficiency, wasteIndex, budgetShare, resultShare };
    const { verdict, why } = verdictOf(c, partial, medianCpa);
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      spent: c.stats.spent,
      dailyBudget: c.dailyBudget,
      results: c.stats.results,
      resultLabel: c.stats.resultLabel,
      impressions: c.stats.impressions,
      cpa,
      cpc: c.stats.cpc,
      ctr: c.stats.ctr,
      cpm: cpmOf(c),
      roas: c.stats.roas,
      budgetShare,
      resultShare,
      wasteIndex,
      efficiency,
      confidence,
      verdict,
      why,
    };
  });

  const reallocations = planReallocations(rows);
  const headline = headlineFor(rows, dailyPace, blendedCpa);
  const mathRows: QuantRow[] = rows.map((r) => ({
    label: r.name,
    value: r.cpa != null ? `${money(r.cpa)} / result` : "no results yet",
    tone: toneFor(r.verdict),
    hint: `${percent(r.ctr)} CTR · ${r.efficiency} efficiency · ${verdictLabel(r.verdict)}`,
  }));
  if (blendedCpa != null) {
    mathRows.unshift({
      label: "Account average",
      value: `${money(blendedCpa)} per result`,
      tone: "neutral",
      hint: `${money(totalSpent)} spent all-time, ${money(dailyPace)} paced today`,
    });
  }

  return {
    campaigns: rows,
    totalSpent,
    dailyPace,
    blendedCpa,
    capUtilization: dailyCap && dailyCap > 0 ? dailyPace / dailyCap : null,
    reallocations,
    headline,
    math: {
      title: "The math",
      summary: headline,
      rows: mathRows,
    },
  };
}

function toneFor(v: Verdict): QuantRow["tone"] {
  if (v === "scale") return "good";
  if (v === "pause") return "bad";
  if (v === "fix" || v === "too_soon") return "warn";
  return "neutral";
}

export function verdictLabel(v: Verdict): string {
  switch (v) {
    case "scale":
      return "Feed this";
    case "hold":
      return "Hold";
    case "fix":
      return "Fix, don't spend more";
    case "pause":
      return "Pause";
    case "too_soon":
      return "Too soon to call";
  }
}

function headlineFor(rows: CampaignQuant[], dailyPace: number, blendedCpa: number | null): string {
  const scale = rows.filter((r) => r.verdict === "scale");
  const pause = rows.filter((r) => r.verdict === "pause" && r.status === "active");
  const wasted = rows.filter((r) => r.wasteIndex > 0.12 && r.status === "active");
  const avg = blendedCpa != null ? ` Blended cost is ${money(blendedCpa)} per result.` : "";
  if (scale.length && pause.length) {
    return `${scale[0].name} is the cheap win. ${pause[0].name} is the leak.${avg} Today's pace: ${money(dailyPace)}.`;
  }
  if (wasted.length && scale.length) {
    return `${wasted[0].name} is overfunded versus results. Shift money to ${scale[0].name}.${avg}`;
  }
  if (pause.length) {
    return `${pause[0].name} is not earning its keep.${avg}`;
  }
  if (scale.length) {
    return `${scale[0].name} can take more budget.${avg} Pace ${money(dailyPace)}/day.`;
  }
  return `Nothing is on fire. Pace is ${money(dailyPace)} today.${avg}`;
}

function planReallocations(rows: CampaignQuant[]): Reallocation[] {
  const donors = rows.filter(
    (r) => r.status === "active" && (r.verdict === "pause" || (r.verdict === "fix" && r.wasteIndex > 0.1)),
  );
  const takers = rows.filter((r) => r.status === "active" && r.verdict === "scale" && r.cpa);
  if (!donors.length || !takers.length) return [];

  const out: Reallocation[] = [];
  for (const donor of donors) {
    const pool = donor.verdict === "pause" ? donor.dailyBudget : Math.max(1, Math.round(donor.dailyBudget * 0.35));
    const taker = [...takers].sort((a, b) => b.efficiency - a.efficiency)[0];
    if (!taker.cpa) continue;
    const extra = (pool / taker.cpa) * 0.85;
    out.push({
      fromId: donor.id,
      fromName: donor.name,
      toId: taker.id,
      toName: taker.name,
      dollars: pool,
      extraResults: extra,
      resultLabel: taker.resultLabel,
    });
  }
  return out;
}

export function projectedResults(c: Campaign, newDaily: number): { perDay: number; note: string } {
  const cpa = cpaOf(c);
  if (cpa == null || cpa <= 0) {
    return { perDay: 0, note: "No results yet, so I won't invent a forecast." };
  }
  const ratio = newDaily / Math.max(c.dailyBudget, 1);
  const diminishing = ratio > 1 ? 0.75 + 0.25 / ratio : 1;
  const perDay = (newDaily / cpa) * diminishing;
  return {
    perDay,
    note:
      ratio > 1
        ? "Raising spend usually gets a little less efficient, so I discounted the forecast 15–25%."
        : "Cutting spend should keep cost-per-result about the same in the near term.",
  };
}

export function applyQuantOptimize(campaigns: Campaign[]): Campaign[] {
  const quant = analyzeCampaigns(campaigns);
  const pauseIds = new Set(
    quant.campaigns.filter((r) => r.verdict === "pause" && r.status === "active").map((r) => r.id),
  );
  const add: Record<string, number> = {};
  const sub: Record<string, number> = {};
  for (const move of quant.reallocations) {
    sub[move.fromId] = (sub[move.fromId] ?? 0) + move.dollars;
    add[move.toId] = (add[move.toId] ?? 0) + move.dollars;
  }
  return campaigns.map((c) => {
    let daily = c.dailyBudget;
    if (sub[c.id]) daily = Math.max(1, daily - sub[c.id]);
    if (add[c.id]) daily = daily + add[c.id];
    return {
      ...c,
      status: pauseIds.has(c.id) ? "paused" : c.status,
      dailyBudget: daily,
    };
  });
}

export function coachTake(campaigns: Campaign[], dailyCap: number | null = null): string {
  return analyzeCampaigns(campaigns, dailyCap).headline;
}

export function mathForCampaign(c: Campaign, all: Campaign[]): CoachMath {
  const quant = analyzeCampaigns(all);
  const row = quant.campaigns.find((r) => r.id === c.id);
  if (!row) {
    return { title: "The math", summary: "No numbers yet.", rows: [] };
  }
  const rows: QuantRow[] = [
    {
      label: "Cost per result",
      value: row.cpa != null ? money(row.cpa) : "—",
      tone: row.verdict === "scale" ? "good" : row.verdict === "pause" ? "bad" : "neutral",
      hint: quant.blendedCpa != null ? `Account average ${money(quant.blendedCpa)}` : undefined,
    },
    {
      label: "Click-through",
      value: percent(row.ctr),
      tone: row.ctr >= CTR_GOOD[c.objective] ? "good" : row.ctr < CTR_WEAK[c.objective] ? "bad" : "warn",
      hint: `Healthy for this goal is about ${percent(CTR_GOOD[c.objective])}`,
    },
    {
      label: "Cost per click",
      value: money(row.cpc),
      tone: "neutral",
    },
    {
      label: "Cost per 1,000 views",
      value: money(row.cpm),
      tone: "neutral",
      hint: "Facebook calls this CPM.",
    },
    {
      label: "Confidence",
      value: row.confidence >= 0.6 ? "Solid" : row.confidence >= 0.35 ? "Thin" : "Too soon",
      tone: row.confidence >= 0.6 ? "good" : "warn",
      hint: `${money(row.spent)} spent · ${row.impressions.toLocaleString()} views`,
    },
  ];
  if (row.roas != null) {
    rows.unshift({
      label: "Return on ad spend",
      value: `${row.roas.toFixed(2)}x`,
      tone: row.roas >= 2 ? "good" : row.roas < 1 ? "bad" : "warn",
      hint: "Above 1.00 means you made more than you spent.",
    });
  }
  return {
    title: "The math",
    summary: row.why,
    rows,
  };
}
