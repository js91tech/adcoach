"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { mathForCampaign } from "@/lib/coach/quant";
import { ctaOptions, objectiveCopy, placementCopy, targetingSentence } from "@/lib/copy";
import { money, percent } from "@/lib/format";
import { useAds } from "@/context/AdProvider";
import type { Gender, Objective, Placement } from "@/lib/types";
import { AdCanvas } from "./AdCanvas";
import { MathCard } from "./QuantViews";
import { SmartEnhanceToggle } from "./SmartEnhanceToggle";
import { StatusPill } from "./StatusPill";

const objectives: Objective[] = [
  "awareness",
  "traffic",
  "engagement",
  "messages",
  "leads",
  "sales",
];

export function CampaignDetail({ id }: { id: string }) {
  const { state, applyLocal, ask } = useAds();
  const campaign = state.campaigns.find((c) => c.id === id);
  const [interests, setInterests] = useState(campaign?.targeting.interests.join(", ") ?? "");

  const summary = useMemo(() => {
    if (!campaign) return "";
    return targetingSentence(campaign.targeting);
  }, [campaign]);

  if (!campaign) {
    return (
      <div className="mx-auto max-w-3xl">
        <p>That ad isn’t here anymore.</p>
        <Link href="/campaigns" className="mt-4 inline-block text-forest">
          Back to your ads
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/campaigns" className="text-sm text-ink-soft hover:text-ink">
        ← Your ads
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="display text-4xl tracking-tight">{campaign.name}</h1>
            <StatusPill status={campaign.status} />
          </div>
          <p className="mt-3 max-w-xl text-ink-soft">
            This ad is trying to {objectiveCopy[campaign.objective].label.toLowerCase()}. It shows to{" "}
            {summary} You’re spending {money(campaign.dailyBudget)} a day.
          </p>
        </div>
        <button
          type="button"
          className="rounded-xl border border-line px-4 py-2 text-sm"
          onClick={() =>
            void ask(
              campaign.status === "active" ? `Pause ${campaign.name}` : `Turn ${campaign.name} back on`,
            )
          }
        >
          {campaign.status === "active" ? "Pause this ad" : "Turn this ad on"}
        </button>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        <Mini label="Spent" value={money(campaign.stats.spent)} />
        <Mini label="Results" value={`${campaign.stats.results} ${campaign.stats.resultLabel}`} />
        <Mini
          label="Cost each"
          value={
            campaign.stats.results > 0
              ? money(campaign.stats.spent / campaign.stats.results)
              : "—"
          }
        />
        <Mini label="Clicked" value={percent(campaign.stats.ctr)} />
      </section>

      <MathCard math={mathForCampaign(campaign, state.campaigns)} />

      <section className="mt-10 rounded-2xl border border-line bg-card p-6">
        <Header label="Goal" facebook="Campaign objective" help={objectiveCopy[campaign.objective].help} />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {objectives.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => applyLocal([{ type: "update_objective", campaignIds: [id], objective: o }])}
              className={`rounded-xl border px-3 py-3 text-left text-sm ${
                campaign.objective === o ? "border-forest bg-forest/8" : "border-line"
              }`}
            >
              <span className="font-medium">{objectiveCopy[o].label}</span>
              <span className="mt-1 block text-xs text-ink-soft">{objectiveCopy[o].facebook}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-card p-6">
        <Header
          label="Spend"
          facebook="Daily budget"
          help="The most Facebook can spend in a day. Some days it will come in a little under."
        />
        <div className="mt-4 flex items-center gap-3">
          <span className="text-ink-soft">$</span>
          <input
            type="number"
            min={1}
            value={campaign.dailyBudget}
            onChange={(e) =>
              applyLocal([
                {
                  type: "update_budget",
                  campaignIds: [id],
                  dailyBudget: Math.max(1, Number(e.target.value) || 1),
                },
              ])
            }
            className="w-28 rounded-lg border border-line bg-paper px-3 py-2"
          />
          <span className="text-sm text-ink-soft">per day</span>
        </div>
        {state.account.dailyCap ? (
          <p className="mt-3 text-sm text-ink-soft">
            Account safety cap: {money(state.account.dailyCap)}/day across every running ad.
          </p>
        ) : null}
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-card p-6">
        <Header
          label="Who sees it"
          facebook="Ad set targeting"
          help="Age, place, and interests. Start local. Widen only if you’re not reaching enough people."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Locations
            <input
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
              value={campaign.targeting.locations.join(", ")}
              onChange={(e) =>
                applyLocal([
                  {
                    type: "update_targeting",
                    campaignIds: [id],
                    targeting: {
                      locations: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  },
                ])
              }
            />
          </label>
          <label className="text-sm">
            Gender
            <select
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
              value={campaign.targeting.gender}
              onChange={(e) =>
                applyLocal([
                  {
                    type: "update_targeting",
                    campaignIds: [id],
                    targeting: { gender: e.target.value as Gender },
                  },
                ])
              }
            >
              <option value="all">Everyone</option>
              <option value="women">Women</option>
              <option value="men">Men</option>
            </select>
          </label>
          <label className="text-sm">
            Youngest
            <input
              type="number"
              min={18}
              max={65}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
              value={campaign.targeting.ageMin}
              onChange={(e) =>
                applyLocal([
                  {
                    type: "update_targeting",
                    campaignIds: [id],
                    targeting: { ageMin: Number(e.target.value) },
                  },
                ])
              }
            />
          </label>
          <label className="text-sm">
            Oldest
            <input
              type="number"
              min={18}
              max={65}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
              value={campaign.targeting.ageMax}
              onChange={(e) =>
                applyLocal([
                  {
                    type: "update_targeting",
                    campaignIds: [id],
                    targeting: { ageMax: Number(e.target.value) },
                  },
                ])
              }
            />
          </label>
        </div>
        <label className="mt-4 block text-sm">
          Interests (comma separated)
          <div className="mt-1 flex gap-2">
            <input
              className="w-full rounded-lg border border-line bg-paper px-3 py-2"
              placeholder={campaign.targeting.interests.join(", ") || "coffee, bakeries"}
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              onBlur={() => {
                if (!interests.trim()) return;
                applyLocal([
                  {
                    type: "update_targeting",
                    campaignIds: [id],
                    targeting: {
                      interests: interests
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  },
                ]);
              }}
            />
          </div>
          {campaign.targeting.interests.length ? (
            <p className="mt-2 text-xs text-ink-soft">
              Current: {campaign.targeting.interests.join(", ")}
            </p>
          ) : null}
        </label>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-card p-6">
        <Header
          label="Where it can appear"
          facebook="Placements"
          help="Automatic is usually cheapest. Only lock it down if you have a reason."
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(placementCopy) as Placement[]).map((p) => {
            const selected = campaign.placements.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() =>
                  applyLocal([
                    {
                      type: "update_placements",
                      campaignIds: [id],
                      placements: p === "automatic" ? ["automatic"] : [p],
                    },
                  ])
                }
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  selected ? "border-forest bg-forest/10" : "border-line"
                }`}
              >
                {placementCopy[p].label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-card p-6">
        <Header
          label="The ad itself"
          facebook="Ad creative"
          help="Headline, the paragraph people actually read, and the button."
        />
        <div className="mt-4">
          <SmartEnhanceToggle
            ad={campaign.ad}
            business={campaign.business}
            objective={campaign.objective}
            onChange={(ad) => applyLocal([{ type: "update_ad", campaignIds: [id], ad }])}
          />
        </div>
        <div className="mt-4 grid gap-4">
          <label className="text-sm">
            Headline
            <input
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
              value={campaign.ad.headline}
              onChange={(e) =>
                applyLocal([
                  {
                    type: "update_ad",
                    campaignIds: [id],
                    ad: {
                      headline: e.target.value,
                      ...(campaign.ad.enhanceOn ? {} : { rawHeadline: e.target.value }),
                    },
                  },
                ])
              }
            />
          </label>
          <label className="text-sm">
            Main text
            <textarea
              rows={4}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
              value={campaign.ad.primaryText}
              onChange={(e) =>
                applyLocal([
                  {
                    type: "update_ad",
                    campaignIds: [id],
                    ad: {
                      primaryText: e.target.value,
                      ...(campaign.ad.enhanceOn ? {} : { rawPrimaryText: e.target.value }),
                    },
                  },
                ])
              }
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              Button
              <select
                className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
                value={campaign.ad.cta}
                onChange={(e) =>
                  applyLocal([{ type: "update_ad", campaignIds: [id], ad: { cta: e.target.value } }])
                }
              >
                {ctaOptions.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Where the button goes
              <input
                className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
                value={campaign.ad.destinationUrl}
                onChange={(e) =>
                  applyLocal([
                    { type: "update_ad", campaignIds: [id], ad: { destinationUrl: e.target.value } },
                  ])
                }
              />
            </label>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl bg-paper-deep/70">
          <AdCanvas
            headline={campaign.ad.headline}
            business={campaign.business}
            visualLabel={campaign.ad.visualLabel}
            cta={campaign.ad.cta}
            photoUrl={campaign.ad.imageUrl}
          />
          <div className="p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">{campaign.ad.visualLabel}</p>
            <p className="display mt-2 text-2xl">{campaign.ad.headline}</p>
            <p className="mt-2 text-sm leading-6">{campaign.ad.primaryText}</p>
            <span className="mt-4 inline-block rounded-full bg-forest px-4 py-1.5 text-sm text-card">
              {campaign.ad.cta}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">{label}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </div>
  );
}

function Header({ label, facebook, help }: { label: string; facebook: string; help: string }) {
  return (
    <div>
      <h2 className="display text-2xl">{label}</h2>
      <p className="mt-1 text-xs text-ink-soft">Facebook calls this {facebook}.</p>
      <p className="mt-2 text-sm text-ink-soft">{help}</p>
    </div>
  );
}
