-- Paper Express schema. Run in the Supabase SQL editor, or `npm run db:migrate` with DATABASE_URL set.
create extension if not exists pgcrypto;

-- Test tables
create table if not exists public.test_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.test_payments (
  payment_id text primary key,
  paper_id text not null,
  author_name text,
  author_email text,
  amount numeric(10,2),
  extra_pages_paid integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists test_payments_paper_id_idx on public.test_payments (paper_id);

create table if not exists public.test_submissions (
  id uuid primary key default gen_random_uuid(),
  paper_id text,
  payment_id text references public.test_payments (payment_id) on delete set null,
  source text not null check (source in ('author', 'admin-bulk', 'admin')),
  kind text not null check (kind in ('format', 'camera-ready')),
  file_name text not null,
  status text not null,
  num_pages integer,
  reasons jsonb not null default '[]',
  title text,
  authors jsonb not null default '[]',
  emails jsonb not null default '[]',
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists test_submissions_paper_id_idx on public.test_submissions (paper_id);
create index if not exists test_submissions_created_idx on public.test_submissions (created_at desc);

create table if not exists public.test_email_log (
  id uuid primary key default gen_random_uuid(),
  paper_id text,
  to_email text not null,
  subject text not null,
  status text not null check (status in ('sent', 'failed')),
  error text,
  sent_by text,
  created_at timestamptz not null default now()
);

-- Only the server (service-role key) touches these tables; no anon/authenticated policies.
alter table public.test_admins enable row level security;
alter table public.test_payments enable row level security;
alter table public.test_submissions enable row level security;
alter table public.test_email_log enable row level security;

-- Production tables
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  payment_id text primary key,
  paper_id text not null,
  author_name text,
  author_email text,
  amount numeric(10,2),
  extra_pages_paid integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists payments_paper_id_idx on public.payments (paper_id);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  paper_id text,
  payment_id text references public.payments (payment_id) on delete set null,
  source text not null check (source in ('author', 'admin-bulk', 'admin')),
  kind text not null check (kind in ('format', 'camera-ready')),
  file_name text not null,
  status text not null,
  num_pages integer,
  reasons jsonb not null default '[]',
  title text,
  authors jsonb not null default '[]',
  emails jsonb not null default '[]',
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists submissions_paper_id_idx on public.submissions (paper_id);
create index if not exists submissions_created_idx on public.submissions (created_at desc);

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  paper_id text,
  to_email text not null,
  subject text not null,
  status text not null check (status in ('sent', 'failed')),
  error text,
  sent_by text,
  created_at timestamptz not null default now()
);

-- Only the server (service-role key) touches these tables; no anon/authenticated policies.
alter table public.admins enable row level security;
alter table public.payments enable row level security;
alter table public.submissions enable row level security;
alter table public.email_log enable row level security;
