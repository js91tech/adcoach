"use client";

import { useEffect, useMemo, useRef } from "react";

type Props = {
  headline: string;
  business: string;
  visualLabel: string;
  cta: string;
  photoUrl?: string;
  palette?: [string, string, string];
  className?: string;
};

function hash(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n;
}

export function AdCanvas({
  headline,
  business,
  visualLabel,
  cta,
  photoUrl,
  palette = ["#1F5C4A", "#F3EEE4", "#C45C26"],
  className,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const photo = useMemo(() => {
    if (!photoUrl) return null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = photoUrl;
    return img;
  }, [photoUrl]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const [ink, paper, clay] = palette;
    const n = hash(business + visualLabel);

    const paint = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, w, h);

      if (photo && photo.complete && photo.naturalWidth > 0) {
        const scale = Math.max(w / photo.naturalWidth, (h * 0.62) / photo.naturalHeight);
        const dw = photo.naturalWidth * scale;
        const dh = photo.naturalHeight * scale;
        ctx.drawImage(photo, (w - dw) / 2, 0, dw, dh);
        const fade = ctx.createLinearGradient(0, h * 0.4, 0, h * 0.68);
        fade.addColorStop(0, "rgba(0,0,0,0)");
        fade.addColorStop(1, paper);
        ctx.fillStyle = fade;
        ctx.fillRect(0, h * 0.4, w, h * 0.28);
      } else {
        ctx.fillStyle = ink;
        ctx.fillRect(0, 0, w, h * 0.58);
        ctx.fillStyle = clay;
        ctx.beginPath();
        ctx.ellipse(w * 0.7, h * 0.22, 180 + (n % 40), 120, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = paper;
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(w * 0.2, h * 0.18, 140, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = paper;
        ctx.font = "28px Georgia, serif";
        ctx.fillText(visualLabel.slice(0, 42), 48, h * 0.5);
      }

      ctx.fillStyle = paper;
      ctx.fillRect(0, h * 0.58, w, h * 0.42);
      ctx.fillStyle = ink;
      ctx.font = "22px ui-sans-serif, system-ui";
      ctx.fillText(business.toUpperCase(), 48, h * 0.66);
      wrapText(ctx, headline, 48, h * 0.74, w - 96, 52, "48px Georgia, serif");
      const bw = Math.min(220, w - 96);
      ctx.fillStyle = ink;
      roundRect(ctx, 48, h - 110, bw, 52, 26);
      ctx.fill();
      ctx.fillStyle = paper;
      ctx.font = "20px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText(cta, 48 + bw / 2, h - 76);
      ctx.textAlign = "left";
    };

    paint();
    if (photo) {
      photo.onload = paint;
      photo.onerror = paint;
    }
  }, [business, cta, headline, palette, photo, visualLabel]);

  return (
    <canvas
      ref={ref}
      width={1080}
      height={1350}
      className={className ?? "h-auto w-full rounded-xl border border-line bg-paper-deep"}
    />
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  font: string,
) {
  ctx.font = font;
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function canvasToDataUrl(canvas: HTMLCanvasElement | null): string | null {
  try {
    return canvas?.toDataURL("image/jpeg", 0.88) ?? null;
  } catch {
    return null;
  }
}
