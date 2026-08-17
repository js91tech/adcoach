"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAds } from "@/context/AdProvider";
import {
  clearFacebookSession,
  facebookLoginUrl,
  fetchAdAccounts,
  fetchMe,
  getFacebookAppId,
  getFacebookSession,
  isPracticeToken,
  parseTokenFromHash,
  setFacebookAppId,
  setFacebookSession,
} from "@/lib/facebook/client";
import type { FacebookSession } from "@/lib/facebook/client";
import type { AdAccountOption } from "@/lib/types";

export function FacebookPortal() {
  const router = useRouter();
  const { connection, refreshConnection, importFromMeta, resetDemo } = useAds();
  const [appId, setAppId] = useState("");
  const [accounts, setAccounts] = useState<AdAccountOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<FacebookSession | null>(null);

  useEffect(() => {
    setAppId(getFacebookAppId());
    setSession(getFacebookSession());
  }, [connection.status]);

  useEffect(() => {
    const token = getFacebookSession()?.token;
    if (!token || isPracticeToken(token)) return;
    void fetchAdAccounts(token)
      .then(setAccounts)
      .catch((e: Error) => setError(e.message));
  }, [connection.status]);

  function continueWithFacebook() {
    const id = appId.trim();
    if (!id) {
      setError("Paste your Facebook App ID first. It's public — Facebook shows it on developers.facebook.com.");
      return;
    }
    setFacebookAppId(id);
    const redirect = `${window.location.origin}/connect/callback`;
    window.location.href = facebookLoginUrl(id, redirect);
  }

  async function enterPractice() {
    setFacebookSession({
      token: "practice",
      userName: "Harbor & Rye Business",
      userId: "practice",
      adAccount: { id: "act_practice", name: "Harbor & Rye Ads", currency: "USD" },
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
    });
    await refreshConnection();
    router.push("/");
  }

  async function pick(account: AdAccountOption) {
    const current = getFacebookSession();
    if (!current) return;
    setFacebookSession({
      ...current,
      adAccount: { id: account.id, name: account.name, currency: account.currency },
    });
    setBusy(true);
    const err = await importFromMeta();
    setBusy(false);
    if (err) setError(err);
    else router.push("/");
  }

  function disconnect() {
    clearFacebookSession();
    void fetch("/api/meta/disconnect", { method: "POST" });
    void refreshConnection();
  }

  const connected = connection.status === "connected" || session?.token === "practice" || Boolean(session?.token);

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-5xl items-center gap-10 lg:grid-cols-2">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">AdCoach portal</p>
        <h1 className="display mt-2 text-4xl tracking-tight">Connect Facebook.</h1>
        <p className="mt-3 text-ink-soft">
          This sends you to Facebook’s own login — we never ask for your Facebook password. After you
          approve ads access, you pick the ad account here.
        </p>
      </div>

      <div className="rounded-3xl border border-line bg-card p-8 shadow-[0_24px_60px_rgba(31,26,22,0.08)]">
        {error ? <p className="mb-4 rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p> : null}

        {session?.token === "practice" ? (
          <p className="mb-4 rounded-xl bg-forest/8 px-3 py-2 text-sm">
            You’re in the practice Business Manager ({session.adAccount?.name}). Continue with
            Facebook below when you want a real ad account.
          </p>
        ) : null}

        {connected && session?.token && session.token !== "practice" ? (
          <div className="space-y-4">
            <p className="text-sm">
              Signed in as <span className="font-medium">{session.userName}</span>
            </p>
            {accounts.length ? (
              <ul className="space-y-2">
                {accounts.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void pick(a)}
                      className="w-full rounded-xl border border-line px-3 py-2 text-left text-sm hover:border-forest"
                    >
                      {a.name}
                      <span className="ml-2 text-ink-soft">{a.currency}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">Loading ad accounts from Facebook…</p>
            )}
            <button type="button" onClick={disconnect} className="text-sm text-ink-soft underline">
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm">
              Facebook App ID
              <input
                className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-mono text-sm"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="123456789012345"
              />
              <span className="mt-1 block text-xs text-ink-soft">
                Create a Business app at developers.facebook.com, add Facebook Login, and set the
                redirect URI to this site’s <code>/connect/callback</code>. The App ID is public; we
                don’t need a secret in .env.
              </span>
            </label>
            <button
              type="button"
              onClick={continueWithFacebook}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white"
            >
              Continue with Facebook
            </button>
            <div className="relative py-2 text-center text-xs text-ink-soft">
              <span className="bg-card px-2">or</span>
            </div>
            <button
              type="button"
              onClick={() => void enterPractice()}
              className="w-full rounded-xl border border-line px-4 py-3 text-sm"
            >
              Enter the practice Business Manager
            </button>
            <p className="text-xs text-ink-soft">
              Practice uses the bakery demo already in AdCoach. It is not Facebook’s login page, and
              it never asks for a Facebook password.
            </p>
            <button type="button" onClick={resetDemo} className="text-xs text-ink-soft underline">
              Reset demo data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function FacebookCallback() {
  const router = useRouter();
  const { refreshConnection } = useAds();
  const [message, setMessage] = useState("Finishing Facebook login…");

  useEffect(() => {
    const parsed = parseTokenFromHash(window.location.hash);
    if (!parsed) {
      const query = new URLSearchParams(window.location.search);
      const qErr = query.get("error_description") || query.get("error");
      setMessage(
        qErr ?? "Facebook didn’t return a token. Close this tab and try Continue with Facebook again.",
      );
      return;
    }
    if ("error" in parsed) {
      setMessage(parsed.error);
      return;
    }
    void (async () => {
      try {
        const me = await fetchMe(parsed.token);
        setFacebookSession({
          token: parsed.token,
          userName: me.name,
          userId: me.id,
          expiresAt: Date.now() + parsed.expiresIn * 1000,
        });
        await refreshConnection();
        router.replace("/connect");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Could not read your Facebook profile.");
      }
    })();
  }, [refreshConnection, router]);

  return <p className="text-ink-soft">{message}</p>;
}
