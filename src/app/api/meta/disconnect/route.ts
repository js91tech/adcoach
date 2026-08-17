import { clearMetaSession } from "@/lib/meta/session";

export async function POST() {
  await clearMetaSession();
  return Response.json({ ok: true });
}
