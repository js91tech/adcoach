import { metaConfig } from "@/lib/meta/config";
import { getMetaSession } from "@/lib/meta/session";

export async function GET() {
  const { configured } = metaConfig();
  const session = await getMetaSession();
  return Response.json({
    configured,
    status: session.token ? "connected" : "demo",
    userName: session.userName,
    adAccountId: session.adAccount?.id,
    adAccountName: session.adAccount?.name,
    currency: session.adAccount?.currency,
  });
}
