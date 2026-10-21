import "server-only";

function required(name: string, ...fallbacks: string[]): string {
  for (const key of [name, ...fallbacks]) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  throw new Error(`Missing environment variable ${name}. See .env.example.`);
}

export const env = {
  supabaseUrl: () => required("SUPABASE_URL", "VITE_SUPABASE_URL"),
  /** New-style secret key (sb_secret_…), or the legacy service_role key. Server-only; bypasses RLS. */
  supabaseServiceKey: () => required("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
  sessionSecret: () => required("SESSION_SECRET"),
  gmailAddress: () => required("GMAIL_ADDRESS"),
  gmailAppPassword: () => required("GMAIL_APP_PASSWORD").replace(/\s+/g, ""),
  gmailFromName: () => process.env.GMAIL_FROM_NAME?.trim() || "Paper Express",
};
