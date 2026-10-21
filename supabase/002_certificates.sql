-- Certificate details on each payment. Run in the Supabase SQL editor after 001_init.sql.
alter table public.test_payments
  add column if not exists affiliation text,
  add column if not exists paper_title text,
  add column if not exists certificate_type text not null default 'presentation'
    check (certificate_type in ('presentation', 'best', 'doctoral'));

alter table public.payments
  add column if not exists affiliation text,
  add column if not exists paper_title text,
  add column if not exists certificate_type text not null default 'presentation'
    check (certificate_type in ('presentation', 'best', 'doctoral'));

-- One row each time someone opens a certificate, so admins can see who has generated one.
create table if not exists public.test_certificate_log (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null,
  paper_id text,
  name text,
  affiliation text,
  paper_title text,
  certificate_type text,
  certificate_no text,
  created_at timestamptz not null default now()
);
create index if not exists test_certificate_log_payment_idx on public.test_certificate_log (payment_id);
alter table public.test_certificate_log enable row level security;

create table if not exists public.certificate_log (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null,
  paper_id text,
  name text,
  affiliation text,
  paper_title text,
  certificate_type text,
  certificate_no text,
  created_at timestamptz not null default now()
);
create index if not exists certificate_log_payment_idx on public.certificate_log (payment_id);
alter table public.certificate_log enable row level security;
