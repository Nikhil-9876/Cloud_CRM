-- ============================================================
-- CRM Schema — run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. CONTACTS
create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  first_name  text not null,
  last_name   text not null,
  email       text,
  phone       text,
  company_name text,
  notes       text,
  created_at  timestamptz default now() not null
);

-- 2. LEADS
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  email       text,
  source      text default 'Website',
  status      text default 'New',
  assigned_to text,
  notes       text,
  created_at  timestamptz default now() not null
);

-- 3. DEALS
create table if not exists public.deals (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete cascade not null,
  contact_id           uuid references public.contacts(id) on delete set null,
  title                text not null,
  value                numeric(12,2),
  stage                text default 'Lead',
  expected_close_date  date,
  notes                text,
  created_at           timestamptz default now() not null
);

-- 4. ACTIVITIES
create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  contact_id  uuid references public.contacts(id) on delete set null,
  deal_id     uuid references public.deals(id) on delete set null,
  type        text default 'Call',
  title       text not null,
  description text,
  due_date    timestamptz,
  done        boolean default false not null,
  created_at  timestamptz default now() not null
);

-- ============================================================
-- Row Level Security (RLS) — each user sees only their rows
-- ============================================================
alter table public.contacts  enable row level security;
alter table public.leads     enable row level security;
alter table public.deals     enable row level security;
alter table public.activities enable row level security;

-- Contacts policies
create policy "contacts: user owns row" on public.contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Leads policies
create policy "leads: user owns row" on public.leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Deals policies
create policy "deals: user owns row" on public.deals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Activities policies
create policy "activities: user owns row" on public.activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
