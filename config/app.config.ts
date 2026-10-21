/**
 * Deployment settings. Table names are per environment so test data never mixes
 * with production; APP_ENV in .env picks the set.
 */
const tables = {
  test: {
    admins: "test_admins",
    payments: "test_payments",
    submissions: "test_submissions",
    emailLog: "test_email_log",
    certificateLog: "test_certificate_log",
  },
  prod: {
    admins: "admins",
    payments: "payments",
    submissions: "submissions",
    emailLog: "email_log",
    certificateLog: "certificate_log",
  },
} as const;

export type AppEnv = keyof typeof tables;
export type TableSet = (typeof tables)[AppEnv];

export function appEnv(): AppEnv {
  const env = process.env.APP_ENV ?? "test";
  if (env !== "test" && env !== "prod") throw new Error(`APP_ENV must be "test" or "prod", got "${env}"`);
  return env;
}

export const tablesFor = (env: AppEnv = appEnv()): TableSet => tables[env];

/** Portal-wide settings. Per-conference settings are in config/conferences.ts. */
export const appConfig = {
  portalName: "Paper Portal",
  /** Pause between emails in a bulk send, to stay under Gmail rate limits. */
  bulkEmailDelayMs: 1500,
  sessionHours: 12,
};
