# Paper Express

Next.js portal for Springer LNCS papers.

The portal serves several conferences (TAIIS 2026, SysCom 2026). Each one has its own page rules and its own records.

- **Public** (`/`): pick a conference, then `/c/<conference>` has the format check and camera-ready check (no login). The camera-ready check requires an unchanged author list; a camera-ready paper gets an "Upload camera-ready paper" button (upload not built yet).
- **Certificate** (`/c/<conference>/certificate`): enter a payment ID to view and print the certificate. Only for conferences with `certificates: true`.
- **Admins** (`/admin`): sign in, pick a conference, then `/admin/<conference>` has bulk check, saved results, certificates, format check and camera-ready check for that conference only.

PDFs are parsed in the browser with pdf.js and are never uploaded. Public checks are not stored; admin checks are saved to Supabase.

## Paper status

| Status | Meaning | Emailed? |
|---|---|---|
| Accepted | All required checks pass, ≤ `maxPages` | no |
| Extra pages (pay) | Only the page limit fails, and pages ≤ `extraPagesMax` | **no** |
| Needs correction | Any other required check fails, or pages > `extraPagesMax` | yes |
| Unreadable | Damaged, encrypted or image-only PDF | yes |

The paper ID comes from the file name: `121 Submission.pdf` → `121`. The email goes to the payment record's author email for that paper ID, otherwise to the emails printed in the PDF. Admins can edit it before sending.

## Setup

1. Fill in `.env` (see `.env.example`). You need `SUPABASE_SECRET_KEY` (the `sb_secret_…` key; the legacy `SUPABASE_SERVICE_ROLE_KEY` also works). It stays on the server.
2. Create the tables: paste `supabase/001_init.sql`, `supabase/002_certificates.sql` and `supabase/003_conferences.sql`, in that order, into the Supabase SQL editor and run them.
3. `npm run db:seed` adds the admin login (`ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`) to both the test and prod tables, and test payment IDs `PAY-TEST-0001` … `PAY-TEST-0005` to the test tables.
4. `npm run dev`

## Test vs prod

`APP_ENV=test` uses the `test_*` tables, and **delivers every email to `GMAIL_ADDRESS` instead of the authors**. The subject shows who it would have gone to. `APP_ENV=prod` uses the unprefixed tables and emails authors. Table names are in `config/app.config.ts`.

## Configuration

- `config/conferences.ts`: the conferences. Name, dates, template link, whether certificates are on, and `paper` overrides of any rule below. Add an entry to add a conference.

- `config/paper.config.ts`: page limit (`maxPages`), paid extension (`extraPagesMax`), sizes, fonts, which checks are `must` / `optional` / `off`, name-matching thresholds.
- `config/app.config.ts`: table names per environment, portal name, email pacing, session length.
- `src/lib/email/template.ts`: the correction email.

## Tests

`npm test` runs against the sample PDFs in `resources/` and the fixtures in `tests/fixtures/`.
