/**
 * npm run db:migrate   creates the test and prod tables (needs DATABASE_URL and psql)
 * npm run db:seed      upserts the admin login into both table sets and test payment IDs into the test set
 */
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { tablesFor } from "../config/app.config";
import { hashPassword } from "../src/lib/server/password";

// Every row lists every column: a bulk upsert sends the union of keys, so a missing key would become null.
const TEST_PAYMENTS: Record<string, unknown>[] = [
  { payment_id: "PAY-TEST-0001", paper_id: "133", author_name: "Test Author One", author_email: "author133@example.com", amount: 250, extra_pages_paid: 0 },
  { payment_id: "PAY-TEST-0002", paper_id: "134", author_name: "Test Author Two", author_email: "author134@example.com", amount: 250, extra_pages_paid: 0 },
  { payment_id: "PAY-TEST-0003", paper_id: "136", author_name: "Test Author Three", author_email: "author136@example.com", amount: 250, extra_pages_paid: 0 },
  { payment_id: "PAY-TEST-0004", paper_id: "323", author_name: "Test Author Four", author_email: "author323@example.com", amount: 250, extra_pages_paid: 0 },
  { payment_id: "PAY-TEST-0005", paper_id: "121", author_name: "Test Author Five", author_email: "author121@example.com", amount: 300, extra_pages_paid: 2 },
  { payment_id: "PAY-SYS-0001", paper_id: "201", author_name: "SysCom Test Author", author_email: "author201@example.com", amount: 250, extra_pages_paid: 0 },
];

/** Conference of each test payment (supabase/003_conferences.sql). */
const conferenceOf = (paymentId: string) => (paymentId.startsWith("PAY-SYS-") ? "syscom-2026" : "taiis-2026");

// Certificate columns from supabase/002_certificates.sql; seeded only once that migration has run.
const TEST_CERTIFICATES: Record<string, { affiliation: string; paper_title: string; certificate_type: string }> = {
  "PAY-TEST-0001": { affiliation: "National Institute of Technology, Raipur", paper_title: "Dynamic and Temporal User Grouping for Multimodal News Recommendation Systems", certificate_type: "presentation" },
  "PAY-TEST-0002": { affiliation: "SRM Institute of Science and Technology", paper_title: "ChronoForensics: Automated Digital Forensic Investigation with Contradiction Detection and Evidence Integrity", certificate_type: "presentation" },
  "PAY-TEST-0003": { affiliation: "KIT-Kalaignar Karunanidhi Institute of Technology", paper_title: "Quantum-Enhanced Civilization Digital Twin", certificate_type: "best" },
  "PAY-TEST-0004": { affiliation: "NSBM Green University, Sri Lanka", paper_title: "Adversarial Threats and Robust Defenses in Satellite-Based Deep Learning for Multi-Hazard Early Warning Systems", certificate_type: "presentation" },
  "PAY-TEST-0005": { affiliation: "Indian Institute of Technology Guwahati", paper_title: "Lightweight Turn-Level Hierarchical Regression with Leakage-Free Training for PHQ-8 Depression Severity Estimation", certificate_type: "doctoral" },
};

function need(name: string, ...alts: string[]) {
  for (const k of [name, ...alts]) if (process.env[k]?.trim()) return process.env[k]!.trim();
  console.error(`Set ${name} in .env first.`);
  process.exit(1);
}

async function seed() {
  const supabase = createClient(need("SUPABASE_URL", "VITE_SUPABASE_URL"), need("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const email = need("ADMIN_EMAIL").toLowerCase();
  const password_hash = await hashPassword(need("ADMIN_PASSWORD"));

  for (const env of ["test", "prod"] as const) {
    const { error } = await supabase.from(tablesFor(env).admins).upsert({ email, password_hash }, { onConflict: "email" });
    if (error) throw new Error(`${env} admins: ${error.message}`);
    console.log(`✓ admin ${email} in ${tablesFor(env).admins}`);
  }
  const id = (p: Record<string, unknown>) => String(p.payment_id);
  const full = TEST_PAYMENTS.map((p) => ({ ...p, ...TEST_CERTIFICATES[id(p)], conference_id: conferenceOf(id(p)) }));
  let seeded = full.length;
  let { error } = await supabase.from(tablesFor("test").payments).upsert(full, { onConflict: "payment_id" });
  if (error && /column/i.test(error.message)) {
    console.warn("! columns missing: run supabase/002_certificates.sql and 003_conferences.sql, then seed again. Seeding TAIIS payments without them.");
    const taiisOnly = TEST_PAYMENTS.filter((p) => conferenceOf(id(p)) === "taiis-2026");
    seeded = taiisOnly.length;
    ({ error } = await supabase.from(tablesFor("test").payments).upsert(taiisOnly, { onConflict: "payment_id" }));
  }
  if (error) throw new Error(`test payments: ${error.message}`);
  console.log(`✓ ${seeded} test payment IDs in ${tablesFor("test").payments}`);
}

function migrate() {
  for (const file of ["supabase/001_init.sql", "supabase/002_certificates.sql", "supabase/003_conferences.sql"])
    execFileSync("psql", [need("DATABASE_URL"), "-v", "ON_ERROR_STOP=1", "-f", file], { stdio: "inherit" });
  console.log("✓ schema applied");
}

const cmd = process.argv[2];
if (cmd === "migrate") migrate();
else if (cmd === "seed") seed().catch((e) => (console.error(e.message), process.exit(1)));
else console.error("usage: tsx scripts/db.ts migrate|seed");
