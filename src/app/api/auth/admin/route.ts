import { z } from "zod";
import { db, tables } from "@/lib/server/db";
import { fail, handle, json, parseBody } from "@/lib/server/http";
import { verifyPassword } from "@/lib/server/password";
import { allow, clientKey } from "@/lib/server/rate-limit";
import { setSession } from "@/lib/server/session";

const Body = z.object({ email: z.string().trim().email().max(200), password: z.string().min(1).max(200) });

export const POST = handle(async (req) => {
  if (!allow(clientKey(req, "admin-login"), 5)) return fail("Too many attempts. Try again in 15 minutes.", 429);
  const body = await parseBody(req, Body);
  if (!body) return fail("Enter your email and password.");

  const { data, error } = await db().from(tables().admins).select("email, password_hash").eq("email", body.email.toLowerCase()).maybeSingle();
  if (error) throw error;
  if (!data || !(await verifyPassword(body.password, data.password_hash))) return fail("Wrong email or password.", 401);

  await setSession({ role: "admin", email: data.email });
  return json({ ok: true });
});
