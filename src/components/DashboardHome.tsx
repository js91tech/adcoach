"use client";

import Link from "next/link";
import { coachTake } from "@/lib/coach/apply";
import { analyzeCampaigns } from "@/lib/coach/quant";
import { objectiveCopy, starterPrompts, targetingSentence } from "@/lib/copy";
import { money, todayLabel } from "@/lib/format";
import { useAds } from "@/context/AdProvider";
import { DualShare, EfficiencyBar, VerdictPill } from "./QuantViews";
import { StatusPill } from "./StatusPill";

export function DashboardHome() {
  const { state, ask, connection } = useAds();
  const quant = analyzeCampaigns(state.campaigns, state.account.dailyCap);
  const active = state.campaigns.filter((c) => c.status === "active");

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-ink-soft">{todayLabel()}</p>
      <h1 className="display mt-1 text-4xl tracking-tight">Here’s the scoreboard.</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Coach doesn’t just “feel” what’s working. Cost per result, click-through versus a typical
        local ad, and whether you’ve spent enough to trust the number.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Paced today"
          value={money(quant.dailyPace)}
          hint={
            state.account.dailyCap
              ? `${Math.round((quant.capUtilization ?? 0) * 100)}% of ${money(state.account.dailyCap)} cap`
              : `${active.length} running`
          }
        />
        <Stat label="Spent so far" value={money(quant.totalSpent)} hint="All campaigns, all time" />
        <Stat
          label="Cost per result"
          value={quant.blendedCpa != null ? money(quant.blendedCpa) : "—"}
          hint="Blended across everything"
        />
        <Stat
          label="Best efficiency"
          value={
            quant.campaigns.length
              ? `${Math.max(...quant.campaigns.map((c) => c.efficiency))}/100`
              : "—"
          }
          hint="100 = cheap results + healthy clicks"
        />
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-card p-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-clay">Coach’s take</p>
        <p className="mt-2 text-lg leading-7">{coachTake(state.campaigns, state.account.dailyCap)}</p>
        {quant.reallocations.length ? (
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            {quant.reallocations.map((m) => (
              <li key={`${m.fromId}-${m.toId}`}>
                Shift {money(m.dollars)}/day {m.fromName} → {m.toName} for about{" "}
                {m.extraResults.toFixed(1)} more {m.resultLabel}/day.
              </li>
            ))}
          </ul>
        ) : null}
        {connection.status === "demo" ? (
          <p className="mt-3 text-sm text-ink-soft">
            Practice bakery account.{" "}
            <Link href="/connect" className="text-forest underline-offset-2 hover:underline">
              Connect Facebook
            </Link>{" "}
            when you want this on a real ad account.
          </p>
        ) : null}
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/create"
          className="rounded-full bg-forest px-3 py-1.5 text-xs font-medium text-card"
        >
          AI ad creator
        </Link>
        {starterPrompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => void ask(p)}
            className="rounded-full border border-line bg-card px-3 py-1.5 text-left text-xs text-ink-soft hover:border-forest hover:text-ink"
          >
            {p}
          </button>
        ))}
      </div>

      <h2 className="display mt-12 text-2xl">Budget versus results</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Gold is what you’re paying. Forest is what you’re getting. When gold is longer than forest,
        that ad is overfunded.
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {quant.campaigns.map((row) => {
          const c = state.campaigns.find((x) => x.id === row.id);
          if (!c) return null;
          return (
            <li key={row.id}>
              <Link
                href={`/campaigns/${row.id}`}
                className="block rounded-2xl border border-line bg-card p-5 transition hover:border-forest/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{row.name}</h3>
                      <StatusPill status={row.status} />
                      <VerdictPill verdict={row.verdict} />
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
                      {row.why} Goal: {objectiveCopy[c.objective].label.toLowerCase()}.{" "}
                      {targetingSentence(c.targeting)}
                    </p>
                  </div>
                  <div className="min-w-[11rem] text-right">
                    <p className="text-sm">
                      {row.cpa != null ? (
                        <>
                          <span className="font-medium">{money(row.cpa)}</span>
                          <span className="text-ink-soft"> / result</span>
                        </>
                      ) : (
                        <span className="text-ink-soft">No results yet</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-soft">{money(row.dailyBudget)}/day</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <DualShare budgetShare={row.budgetShare} resultShare={row.resultShare} />
                  <EfficiencyBar value={row.efficiency} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">{label}</p>
      <p className="display mt-2 text-3xl">{value}</p>
      <p className="mt-1 text-sm text-ink-soft">{hint}</p>
    </div>
  );
}
