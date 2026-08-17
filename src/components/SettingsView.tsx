"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { money } from "@/lib/format";
import { useAds } from "@/context/AdProvider";
import type { AdAccountOption } from "@/lib/types";

export function SettingsView() {
  const search = useSearchParams();
  const { state, connection, applyLocal, resetDemo, refreshConnection, importFromMeta } = useAds();
  const [accounts, setAccounts] = useState<AdAccountOption[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const metaFlag = search.get("meta");
  const reason = search.get("reason");

  useEffect(() => {
    void refreshConnection();
  }, [metaFlag, refreshConnection]);

  useEffect(() => {
    if (metaFlag === "connected") setNotice("Facebook is connected.");
    if (metaFlag === "missing") {
      setNotice("Add META_APP_ID and META_APP_SECRET to .env.local, then restart the app.");
    }
    if (metaFlag === "error") setNotice(reason ?? "Facebook login didn’t finish.");
  }, [metaFlag, reason]);

  useEffect(() => {
    if (connection.status !== "connected") return;
    void fetch("/api/meta/accounts")
      .then((r) => r.json())
      .then((json: { accounts?: AdAccountOption[] }) => setAccounts(json.accounts ?? []))
      .catch(() => setAccounts([]));
  }, [connection.status]);

  async function pickAccount(account: AdAccountOption) {
    await fetch("/api/meta/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: account.id,
        name: account.name,
        currency: account.currency,
      }),
    });
    await refreshConnection();
    setNotice(`Using ${account.name}.`);
  }

  async function pullCampaigns() {
    setImporting(true);
    const error = await importFromMeta();
    setImporting(false);
    setNotice(error ?? "Loaded campaigns from Facebook.");
  }

  async function disconnect() {
    await fetch("/api/meta/disconnect", { method: "POST" });
    await refreshConnection();
    setNotice("Disconnected. You’re back on the practice account.");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display text-4xl tracking-tight">Settings</h1>
      <p className="mt-2 text-ink-soft">
        Connect Facebook when you want Coach to touch a real ad account. Until then, the bakery demo
        behaves the same way.
      </p>

      {notice ? (
        <p className="mt-6 rounded-xl border border-line bg-card px-4 py-3 text-sm">{notice}</p>
      ) : null}

      <section className="mt-8 rounded-2xl border border-line bg-card p-6">
        <h2 className="display text-2xl">Facebook</h2>
        <p className="mt-2 text-sm text-ink-soft">
          {connection.status === "connected"
            ? `Signed in as ${connection.userName ?? "you"}.`
            : connection.configured
              ? "This app has Meta credentials. Connect to pick an ad account."
              : "Credentials are not in this environment yet. Add them to .env.local (see below)."}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
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
                className="rounded-xl bg-forest px-4 py-2 text-sm font-medium text-card disabled:opacity-40"
              >
                {importing ? "Loading…" : "Import campaigns from Facebook"}
              </button>
            </>
          ) : (
            <a href="/api/meta/auth" className="rounded-xl bg-forest px-4 py-2 text-sm font-medium text-card">
              Connect Facebook
            </a>
          )}
        </div>

        {accounts.length > 0 ? (
          <div className="mt-6">
            <p className="text-sm font-medium">Ad account</p>
            <ul className="mt-2 flex flex-col gap-2">
              {accounts.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => void pickAccount(a)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                      connection.adAccountId === a.id ? "border-forest bg-forest/8" : "border-line"
                    }`}
                  >
                    {a.name}
                    <span className="ml-2 text-ink-soft">{a.currency}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ol className="mt-8 list-decimal space-y-2 pl-5 text-sm leading-6 text-ink-soft">
          <li>
            Create a Business app at{" "}
            <a className="text-forest underline" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">
              developers.facebook.com/apps
            </a>
            .
          </li>
          <li>Add Facebook Login and Marketing API products.</li>
          <li>
            Set the OAuth redirect URI to{" "}
            <code className="rounded bg-paper-deep px-1">http://localhost:3000/api/meta/callback</code>
          </li>
          <li>
            Put your App ID and App Secret in <code className="rounded bg-paper-deep px-1">.env.local</code> and
            restart.
          </li>
          <li>
            Optional: add <code className="rounded bg-paper-deep px-1">OPENAI_API_KEY</code> so Coach can parse
            messier, longer requests. Without it, the built-in coach still understands everyday ad
            instructions.
          </li>
        </ol>
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
