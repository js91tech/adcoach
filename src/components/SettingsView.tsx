"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { money } from "@/lib/format";
import { clearFacebookSession } from "@/lib/facebook/client";
import { useAds } from "@/context/AdProvider";

export function SettingsView() {
  const { state, connection, applyLocal, resetDemo, refreshConnection, importFromMeta } = useAds();
  const [notice, setNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function pullCampaigns() {
    setImporting(true);
    const error = await importFromMeta();
    setImporting(false);
    setNotice(error ?? "Loaded campaigns from Facebook.");
  }

  async function disconnect() {
    clearFacebookSession();
    await fetch("/api/meta/disconnect", { method: "POST" });
    await refreshConnection();
    setNotice("Disconnected. You’re back on the practice account.");
  }

  useEffect(() => {
    void refreshConnection();
  }, [refreshConnection]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display text-4xl tracking-tight">Settings</h1>
      <p className="mt-2 text-ink-soft">
        Safety limits and practice data live here. Facebook login is its own portal — we never ask
        for a Facebook password.
      </p>

      {notice ? (
        <p className="mt-6 rounded-xl border border-line bg-card px-4 py-3 text-sm">{notice}</p>
      ) : null}

      <section className="mt-8 rounded-2xl border border-line bg-card p-6">
        <h2 className="display text-2xl">Facebook</h2>
        <p className="mt-2 text-sm text-ink-soft">
          {connection.status === "connected"
            ? `Signed in as ${connection.userName ?? "you"}${
                connection.adAccountName ? ` · ${connection.adAccountName}` : ""
              }.`
            : "Not connected. Open the Facebook portal to sign in on Facebook’s site, or enter the practice Business Manager."}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/connect" className="rounded-xl bg-forest px-4 py-2 text-sm font-medium text-card">
            Open Facebook portal
          </Link>
          {connection.status === "connected" ? (
            <>
              <button
                type="button"
                onClick={() => void disconnect()}
                className="rounded-xl border border-line px-4 py-2 text-sm"
              >
                Disconnect
              </button>
              <button
                type="button"
                onClick={() => void pullCampaigns()}
                disabled={importing}
                className="rounded-xl border border-line px-4 py-2 text-sm disabled:opacity-40"
              >
                {importing ? "Loading…" : "Import campaigns"}
              </button>
            </>
          ) : null}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-card p-6">
        <h2 className="display text-2xl">Safety cap</h2>
        <p className="mt-2 text-sm text-ink-soft">
          A daily ceiling across every running ad. If campaigns add up to more, Coach scales them
          down. Facebook does not offer this as a single switch.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-ink-soft">$</span>
          <input
            type="number"
            min={0}
            className="w-28 rounded-lg border border-line bg-paper px-3 py-2"
            value={state.account.dailyCap ?? 0}
            onChange={(e) => {
              const n = Number(e.target.value);
              applyLocal([{ type: "set_account_cap", dailyCap: n > 0 ? n : null }]);
            }}
          />
          <span className="text-sm text-ink-soft">per day total</span>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          Running ads are currently paced at{" "}
          {money(state.campaigns.filter((c) => c.status === "active").reduce((s, c) => s + c.dailyBudget, 0))}
          /day.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-card p-6">
        <h2 className="display text-2xl">Practice data</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Reset the Harbor & Rye bakery account if you want a clean slate.
        </p>
        <button
          type="button"
          onClick={resetDemo}
          className="mt-4 rounded-xl border border-line px-4 py-2 text-sm"
        >
          Reset demo
        </button>
      </section>
    </div>
  );
}
