import { NextRequest } from "next/server";
import { metaConfig } from "@/lib/meta/config";
import { buildLoginUrl, newOauthState } from "@/lib/meta/oauth";
import { setOauthState } from "@/lib/meta/session";

export async function GET(request: NextRequest) {
  const { configured } = metaConfig();
  if (!configured) {
    const to = new URL("/settings?meta=missing", request.nextUrl.origin);
    return Response.redirect(to);
  }
  const state = newOauthState();
  await setOauthState(state);
  return Response.redirect(buildLoginUrl(state));
}
