-- Multiple conferences: every record belongs to one. Existing rows become TAIIS 2026.
-- Run in the Supabase SQL editor after 001_init.sql and 002_certificates.sql.

alter table public.test_payments add column if not exists conference_id text not null default 'taiis-2026';
create index if not exists test_payments_conference_idx on public.test_payments (conference_id);
alter table public.test_submissions add column if not exists conference_id text not null default 'taiis-2026';
create index if not exists test_submissions_conference_idx on public.test_submissions (conference_id);
alter table public.test_email_log add column if not exists conference_id text not null default 'taiis-2026';
create index if not exists test_email_log_conference_idx on public.test_email_log (conference_id);
alter table public.test_certificate_log add column if not exists conference_id text not null default 'taiis-2026';
create index if not exists test_certificate_log_conference_idx on public.test_certificate_log (conference_id);

alter table public.payments add column if not exists conference_id text not null default 'taiis-2026';
create index if not exists payments_conference_idx on public.payments (conference_id);
alter table public.submissions add column if not exists conference_id text not null default 'taiis-2026';
create index if not exists submissions_conference_idx on public.submissions (conference_id);
alter table public.email_log add column if not exists conference_id text not null default 'taiis-2026';
create index if not exists email_log_conference_idx on public.email_log (conference_id);
alter table public.certificate_log add column if not exists conference_id text not null default 'taiis-2026';
create index if not exists certificate_log_conference_idx on public.certificate_log (conference_id);
