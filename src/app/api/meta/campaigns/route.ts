import { NextRequest } from "next/server";
import { applyOnMeta, listCampaigns } from "@/lib/meta/graph";
import { getMetaSession } from "@/lib/meta/session";
import type { Campaign, CoachAction } from "@/lib/types";

export async function GET() {
  const session = await getMetaSession();
  if (!session.token || !session.adAccount) {
    return Response.json({ error: "Connect Facebook and pick an ad account first." }, { status: 401 });
  }
  const campaigns = await listCampaigns(session.token, session.adAccount.id);
  return Response.json({ campaigns });
}

export async function POST(request: NextRequest) {
  const session = await getMetaSession();
  if (!session.token || !session.adAccount) {
    return Response.json({ error: "Connect Facebook first." }, { status: 401 });
  }
  const body = (await request.json()) as { actions: CoachAction[]; campaigns: Campaign[] };
  const notes = await applyOnMeta(
    session.token,
    session.adAccount.id,
    body.actions ?? [],
    body.campaigns ?? [],
  );
  return Response.json({ notes });
}
