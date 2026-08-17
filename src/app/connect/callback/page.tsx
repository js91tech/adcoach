"use client";

import { FacebookCallback } from "@/components/FacebookPortal";

export default function ConnectCallbackPage() {
  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="display text-3xl">Facebook</h1>
      <div className="mt-4">
        <FacebookCallback />
      </div>
    </div>
  );
}
