-- AWEA — full schema snapshot
-- This reflects everything that should already exist in your database
-- as of now. Keep this file updated: append future migrations to the
-- bottom of it and commit, so this stays a true record of your schema.

create extension if not exists "pgcrypto";

-- ============================================================
-- CORE TABLES
-- ============================================================

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  slogan text,
  address text,
  logo_url text,
  cover_image_url text,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  rewards_status text not null default 'off' check (rewards_status in ('off', 'trial', 'active', 'locked')),
  trial_ends_at timestamptz default (now() + interval '30 days'),
  instagram_url text,
  tiktok_url text,
  facebook_url text,
  google_review_url text,
  wifi_ssid text,
  wifi_password text,
  created_at timestamptz not null default now()
);

create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid not null references menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  sort_order int not null default 0
);

create table if not exists rewards_signups (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  reward_code text unique not null,
  marketing_opt_in boolean not null default false,
  redeemed_count int not null default 0,
  visit_count integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists wifi_signups (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  full_name text not null,
  email text,
  phone text not null,
  created_at timestamptz not null default now()
);

-- Each restaurant's own Paystack subaccount + commission — never publicly readable
create table if not exists restaurant_payment_settings (
  restaurant_id uuid primary key references restaurants(id) on delete cascade,
  paystack_subaccount_code text,
  paystack_percentage_charge numeric(5,2) not null default 0,
  -- legacy Ozow fields, unused but left in place
  ozow_site_code text,
  ozow_private_key text,
  ozow_api_key text,
  is_test boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  tip numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  reward_code text,
  total numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'complete', 'error', 'cancelled')),
  transaction_reference text unique not null,
  ozow_transaction_id text,
  table_number text,
  customer_name text,
  customer_phone text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ACCESS CONTROL
-- ============================================================

-- Platform admins (you) — full access to every restaurant
create table if not exists platform_admins (
  user_id uuid primary key
);

-- Links a restaurant owner's login to exactly one restaurant
create table if not exists restaurant_users (
  user_id uuid primary key,
  restaurant_id uuid not null references restaurants(id) on delete cascade
);

create or replace function is_platform_admin() returns boolean
language sql security definer stable as $$
  select exists(select 1 from platform_admins where user_id = auth.uid());
$$;
grant execute on function is_platform_admin() to authenticated;

create or replace function has_restaurant_access(rid uuid) returns boolean
language sql security definer stable as $$
  select is_platform_admin() or exists(
    select 1 from restaurant_users where user_id = auth.uid() and restaurant_id = rid
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table restaurants enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table rewards_signups enable row level security;
alter table wifi_signups enable row level security;
alter table restaurant_payment_settings enable row level security;
alter table orders enable row level security;
alter table platform_admins enable row level security;
alter table restaurant_users enable row level security;

-- Public (diners, no login) can read menu data and insert signups/orders
drop policy if exists "public read restaurants" on restaurants;
create policy "public read restaurants" on restaurants for select using (true);
drop policy if exists "public read categories" on menu_categories;
create policy "public read categories" on menu_categories for select using (true);
drop policy if exists "public read items" on menu_items;
create policy "public read items" on menu_items for select using (true);
drop policy if exists "public insert signup" on rewards_signups;
create policy "public insert signup" on rewards_signups for insert with check (true);
drop policy if exists "public insert wifi signup" on wifi_signups;
create policy "public insert wifi signup" on wifi_signups for insert with check (true);
drop policy if exists "public insert order" on orders;
create policy "public insert order" on orders for insert with check (true);

-- Scoped admin access: platform admins see everything, restaurant
-- logins only ever see their own restaurant
drop policy if exists "admin manage restaurants" on restaurants;
create policy "admin manage restaurants" on restaurants for all
  using (has_restaurant_access(id)) with check (has_restaurant_access(id));

drop policy if exists "admin manage categories" on menu_categories;
create policy "admin manage categories" on menu_categories for all
  using (has_restaurant_access(restaurant_id)) with check (has_restaurant_access(restaurant_id));

drop policy if exists "admin manage items" on menu_items;
create policy "admin manage items" on menu_items for all
  using (has_restaurant_access(restaurant_id)) with check (has_restaurant_access(restaurant_id));

drop policy if exists "admin manage payment settings" on restaurant_payment_settings;
create policy "admin manage payment settings" on restaurant_payment_settings for all
  using (has_restaurant_access(restaurant_id)) with check (has_restaurant_access(restaurant_id));

drop policy if exists "admin read orders" on orders;
create policy "admin read orders" on orders for select
  using (has_restaurant_access(restaurant_id));

drop policy if exists "admin read signups" on rewards_signups;
create policy "admin read signups" on rewards_signups for select
  using (has_restaurant_access(restaurant_id));

drop policy if exists "admin read wifi signups" on wifi_signups;
create policy "admin read wifi signups" on wifi_signups for select
  using (has_restaurant_access(restaurant_id));

drop policy if exists "platform admins manage admins" on platform_admins;
create policy "platform admins manage admins" on platform_admins for all
  using (is_platform_admin()) with check (is_platform_admin());

drop policy if exists "platform admins manage restaurant users" on restaurant_users;
create policy "platform admins manage restaurant users" on restaurant_users for all
  using (is_platform_admin()) with check (is_platform_admin());

-- ============================================================
-- YOUR ACCOUNT + SEED DATA
-- Run this part manually with your real UID — it's here for
-- reference, not meant to be re-run as-is.
-- ============================================================

-- insert into platform_admins (user_id) values ('YOUR-UID-HERE') on conflict (user_id) do nothing;

-- Seed: Kaia Grill (only runs once, skipped if it already exists)
insert into restaurants (slug, name, slogan, address, tier, rewards_status)
select 'kaia-grill', 'Kaia', 'Fire, meat, and good company', '14 Bree Street, Cape Town', 'free', 'trial'
where not exists (select 1 from restaurants where slug = 'kaia-grill');
