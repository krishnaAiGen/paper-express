import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { getConference, type Conference } from "@config/conferences";

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T | null> {
  try {
    const parsed = schema.safeParse(await req.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The conference named in the ?conference= query string, or null when missing or unknown. */
export const conferenceFromQuery = (req: Request): Conference | null => getConference(new URL(req.url).searchParams.get("conference"));

const MIGRATION_HINT = "The database is missing a column. Run supabase/002_certificates.sql and supabase/003_conferences.sql in the Supabase SQL editor.";

/** Turns unexpected server errors (missing env, missing migration, DB down) into a readable 500. */
export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await fn(req);
    } catch (e) {
      console.error(e);
      const code = (e as { code?: string })?.code;
      if (code === "42703" || code === "PGRST204") return fail(MIGRATION_HINT, 503);
      return fail(e instanceof Error && e.message.startsWith("Missing environment variable") ? e.message : "Server error", 500);
    }
  };
}
