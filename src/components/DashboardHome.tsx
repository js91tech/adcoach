"use client";

import Link from "next/link";
import { coachTake } from "@/lib/coach/apply";
import { objectiveCopy, starterPrompts, targetingSentence } from "@/lib/copy";
import { compactNumber, money, percent, todayLabel } from "@/lib/format";
import { useAds } from "@/context/AdProvider";
import { StatusPill } from "./StatusPill";

export function DashboardHome() {
  const { state, ask, connection } = useAds();
  const active = state.campaigns.filter((c) => c.status === "active");
  const daily = active.reduce((s, c) => s + c.dailyBudget, 0);
  const spent = state.campaigns.reduce((s, c) => s + c.stats.spent, 0);
  const results = state.campaigns.reduce((s, c) => s + c.stats.results, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-ink-soft">{todayLabel()}</p>
      <h1 className="display mt-1 text-4xl tracking-tight">Here’s how your ads look.</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        I’ll talk like a person you hired to run Facebook ads — not like Ads Manager. Type anything
        in the bar below, or start with a prompt.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Set to spend today"
          value={money(daily)}
          hint={
            state.account.dailyCap
              ? `Cap ${money(state.account.dailyCap)}`
              : "No safety cap yet"
          }
        />
        <Stat label="Spent so far" value={money(spent)} hint={`${active.length} running now`} />
        <Stat
          label="Results"
          value={compactNumber(results)}
          hint="Visits, signups, and sales combined"
        />
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-card p-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-clay">Coach’s take</p>
        <p className="mt-2 text-lg leading-7">{coachTake(state.campaigns)}</p>
        {connection.status === "demo" ? (
          <p className="mt-3 text-sm text-ink-soft">
            This is a practice bakery account.{" "}
            <Link href="/settings" className="text-forest underline-offset-2 hover:underline">
              Connect Facebook
            </Link>{" "}
            when you want me to control a real ad account.
          </p>
        ) : null}
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
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

      <h2 className="display mt-12 text-2xl">Your ads</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {state.campaigns.map((c) => (
          <li key={c.id}>
            <Link
              href={`/campaigns/${c.id}`}
              className="block rounded-2xl border border-line bg-card p-5 transition hover:border-forest/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{c.name}</h3>
                    <StatusPill status={c.status} />
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
                    Goal: {objectiveCopy[c.objective].label.toLowerCase()}. Shows to{" "}
                    {targetingSentence(c.targeting)} {money(c.dailyBudget)}/day.
                  </p>
                </div>
                <p className="text-sm text-ink-soft">
                  {c.stats.results} {c.stats.resultLabel}
                  <span className="mx-2">·</span>
                  {percent(c.stats.ctr)} clicked
                </p>
              </div>
            </Link>
          </li>
        ))}
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
