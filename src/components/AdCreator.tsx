"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdCanvas, canvasToDataUrl } from "@/components/AdCanvas";
import { useAds } from "@/context/AdProvider";
import { createFromBrief, photoUrl } from "@/lib/creative/studio";

export function AdCreator() {
  const router = useRouter();
  const { state, applyLocal } = useAds();
  const canvasWrap = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState("");
  const [website, setWebsite] = useState("");
  const [budget, setBudget] = useState(25);
  const [usePhoto, setUsePhoto] = useState(true);
  const pack = prompt.trim()
    ? createFromBrief(
        { prompt, website, dailyBudget: budget, business: state.account.businessName },
        state.account.businessName,
      )
    : null;
  const [photo, setPhoto] = useState<string>();

  const imagePrompt = pack?.imagePrompt;

  useEffect(() => {
    if (!imagePrompt || !usePhoto) {
      if (!usePhoto) setPhoto(undefined);
      return;
    }
    setPhoto(photoUrl(imagePrompt));
  }, [imagePrompt, usePhoto]);

  function generatePhoto() {
    if (!pack) return;
    setPhoto(photoUrl(pack.imagePrompt, Date.now()));
  }

  function publish() {
    if (!pack) return;
    const canvas = canvasWrap.current?.querySelector("canvas") ?? null;
    const imageUrl = canvasToDataUrl(canvas) ?? photo;
    applyLocal([
      {
        type: "create_campaign",
        campaign: {
          ...pack.campaign,
          status: "active",
          ad: { ...pack.campaign.ad, imageUrl },
        },
      },
    ]);
    router.push("/campaigns");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="display text-4xl tracking-tight">AI ad creator</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Describe the thing you want people to do. I’ll write the ad, pick a goal, and make the
        picture. No Ads Manager, no blank canvas.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <label className="block text-sm">
            What are you advertising?
            <textarea
              rows={6}
              className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-3"
              placeholder="Saturday sourdough workshop, eight seats, $65, people in Tampa who like baking…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Website or booking link
            <input
              className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
            />
          </label>
          <label className="block text-sm">
            Daily spend
            <div className="mt-1 flex items-center gap-2">
              <span className="text-ink-soft">$</span>
              <input
                type="number"
                min={1}
                className="w-28 rounded-xl border border-line bg-card px-3 py-2"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value) || 1)}
              />
              <span className="text-ink-soft">/day</span>
            </div>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={usePhoto}
              onChange={(e) => setUsePhoto(e.target.checked)}
            />
            Generate a photo (no API key — uses a public image model)
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!pack}
              onClick={generatePhoto}
              className="rounded-xl border border-line px-4 py-2 text-sm disabled:opacity-40"
            >
              Refresh picture
            </button>
            <button
              type="button"
              disabled={!pack}
              onClick={publish}
              className="rounded-xl bg-forest px-4 py-2 text-sm font-medium text-card disabled:opacity-40"
            >
              Create this ad
            </button>
          </div>
          {pack ? (
            <ul className="list-disc space-y-1 pl-5 text-xs text-ink-soft">
              {pack.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          {pack ? (
            <div ref={canvasWrap} className="overflow-hidden rounded-2xl border border-line bg-card p-3">
              <AdCanvas
                headline={pack.campaign.ad.headline}
                business={pack.campaign.business}
                visualLabel={pack.campaign.ad.visualLabel}
                cta={pack.campaign.ad.cta}
                photoUrl={usePhoto ? photo : undefined}
                palette={pack.palette}
              />
              <div className="px-2 pb-2 pt-4">
                <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">
                  {pack.campaign.objective} · {pack.campaign.dailyBudget}/day
                </p>
                <p className="display mt-1 text-2xl">{pack.campaign.ad.headline}</p>
                <p className="mt-2 text-sm leading-6">{pack.campaign.ad.primaryText}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-80 items-center justify-center rounded-2xl border border-dashed border-line text-sm text-ink-soft">
              Write a sentence. The ad appears here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
