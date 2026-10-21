import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { tablesFor } from "@config/app.config";
import { env } from "./env";

let client: SupabaseClient | null = null;

/** Service-role client. Bypasses RLS, so it must only ever run on the server. */
export function db(): SupabaseClient {
  client ??= createClient(env.supabaseUrl(), env.supabaseServiceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export const tables = () => tablesFor();
