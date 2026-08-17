import { NextRequest } from "next/server";
import { exchangeCode } from "@/lib/meta/oauth";
import { listAdAccounts } from "@/lib/meta/graph";
import { readOauthState, setMetaSession } from "@/lib/meta/session";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const origin = url.origin;
  const err = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (err) {
    return Response.redirect(new URL(`/settings?meta=error&reason=${encodeURIComponent(err)}`, origin));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = await readOauthState();
  if (!code || !state || state !== expected) {
    return Response.redirect(new URL("/settings?meta=error&reason=Invalid%20login%20state", origin));
  }

  try {
    const { accessToken, userName } = await exchangeCode(code);
    const accounts = await listAdAccounts(accessToken);
    const first = accounts[0];
    await setMetaSession({
      token: accessToken,
      userName,
      adAccount: first
        ? { id: first.id, name: first.name, currency: first.currency }
        : undefined,
    });
    return Response.redirect(new URL("/settings?meta=connected", origin));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Facebook login failed";
    return Response.redirect(new URL(`/settings?meta=error&reason=${encodeURIComponent(reason)}`, origin));
  }
}
