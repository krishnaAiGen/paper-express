import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { appConfig } from "@config/app.config";
import { env } from "./env";

/** Only admins sign in. Format and camera-ready checks are public; certificates use the payment ID directly. */
export type Session = { role: "admin"; email: string; exp: number };

const COOKIE = "pe_session";

const sign = (payload: string) => createHmac("sha256", env.sessionSecret()).update(payload).digest("base64url");

export async function setSession(session: Omit<Session, "exp">) {
  const exp = Date.now() + appConfig.sessionHours * 3600_000;
  const payload = Buffer.from(JSON.stringify({ ...session, exp })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: appConfig.sessionHours * 3600,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, mac] = raw.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export async function getAdmin() {
  const s = await getSession();
  return s?.role === "admin" ? s : null;
}
