import { NextRequest } from "next/server";
import { listAdAccounts } from "@/lib/meta/graph";
import { getMetaSession, setAdAccountCookie } from "@/lib/meta/session";

export async function GET() {
  const session = await getMetaSession();
  if (!session.token) {
    return Response.json({ error: "Not connected to Facebook." }, { status: 401 });
  }
  const accounts = await listAdAccounts(session.token);
  return Response.json({ accounts, selected: session.adAccount });
}

export async function POST(request: NextRequest) {
  const session = await getMetaSession();
  if (!session.token) {
    return Response.json({ error: "Not connected to Facebook." }, { status: 401 });
  }
  const body = (await request.json()) as { id: string; name: string; currency: string };
  await setAdAccountCookie(body);
  return Response.json({ ok: true });
}
