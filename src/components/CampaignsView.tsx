"use client";

import Link from "next/link";
import { analyzeCampaigns } from "@/lib/coach/quant";
import { objectiveCopy, targetingSentence } from "@/lib/copy";
import { money, percent } from "@/lib/format";
import { useAds } from "@/context/AdProvider";
import { DualShare, EfficiencyBar, VerdictPill } from "./QuantViews";
import { StatusPill } from "./StatusPill";

export function CampaignsView() {
  const { state, ask } = useAds();
  const quant = analyzeCampaigns(state.campaigns, state.account.dailyCap);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl tracking-tight">Your ads</h1>
          <p className="mt-2 text-ink-soft">
            Each card is one campaign. Facebook splits these into campaigns, ad sets, and ads — I
            keep it as one thing you can understand.
          </p>
        </div>
        <Link
          href="/create"
          className="rounded-xl bg-forest px-4 py-2 text-sm font-medium text-card"
        >
          New ad
        </Link>
      </div>

      <ul className="mt-8 flex flex-col gap-4">
        {state.campaigns.map((c) => {
          const row = quant.campaigns.find((q) => q.id === c.id);
          return (
          <li key={c.id} className="rounded-2xl border border-line bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-medium">{c.name}</h2>
                  <StatusPill status={c.status} />
                  {row ? <VerdictPill verdict={row.verdict} /> : null}
                </div>
                <p className="mt-1 text-sm text-ink-soft">{c.business}</p>
              </div>
              <div className="text-right">
                <p className="display text-2xl">{money(c.dailyBudget)}<span className="text-base text-ink-soft">/day</span></p>
                <p className="text-sm text-ink-soft">
                  {row?.cpa != null ? `${money(row.cpa)} per result` : "No results yet"}
                </p>
              </div>
            </div>

            {c.ad.imageUrl ? (
              <img
                src={c.ad.imageUrl}
                alt=""
                className="mt-5 h-44 w-full rounded-xl object-cover"
              />
            ) : null}

            {row ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <DualShare budgetShare={row.budgetShare} resultShare={row.resultShare} />
                <EfficiencyBar value={row.efficiency} />
              </div>
            ) : null}

            <dl className="mt-5 grid gap-4 sm:grid-cols-3">
              <Field
                label="Goal"
                facebook={objectiveCopy[c.objective].facebook}
                value={objectiveCopy[c.objective].label}
              />
              <Field label="Who sees it" facebook="Targeting" value={targetingSentence(c.targeting)} />
              <Field
                label="Results"
                facebook="Reporting"
                value={`${c.stats.results} ${c.stats.resultLabel} · ${percent(c.stats.ctr)} clicked · ${money(c.stats.spent)} spent`}
              />
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/campaigns/${c.id}`}
                className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-forest"
              >
                Open settings
              </Link>
              {c.status === "active" ? (
                <button
                  type="button"
                  className="rounded-lg border border-line px-3 py-1.5 text-sm"
                  onClick={() => void ask(`Pause ${c.name}`)}
                >
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-lg border border-line px-3 py-1.5 text-sm"
                  onClick={() => void ask(`Turn ${c.name} back on`)}
                >
                  Turn on
                </button>
              )}
              <button
                type="button"
                className="rounded-lg border border-line px-3 py-1.5 text-sm"
                onClick={() => void ask(`Show me the math for ${c.name}`)}
              >
                Show the math
              </button>
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}

function Field({ label, facebook, value }: { label: string; facebook: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-ink-soft">
        {label}
        <span className="ml-2 font-normal normal-case tracking-normal">Facebook: {facebook}</span>
      </dt>
      <dd className="mt-1 text-sm leading-6">{value}</dd>
    </div>
  );
}
