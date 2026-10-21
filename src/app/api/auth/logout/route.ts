import { json } from "@/lib/server/http";
import { clearSession } from "@/lib/server/session";

export async function POST() {
  await clearSession();
  return json({ ok: true });
}
