create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  business_type text not null check (business_type in ('Barbing', 'Hairdressing', 'Spa')),
  owner_first_name text not null check (char_length(btrim(owner_first_name)) between 1 and 80),
  owner_last_name text not null check (char_length(btrim(owner_last_name)) between 1 and 80),
  address text not null check (char_length(btrim(address)) between 1 and 200),
  city text not null check (char_length(btrim(city)) between 1 and 100),
  phone text not null check (char_length(btrim(phone)) between 1 and 32),
  created_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

-- Owners manage only their own row.
grant select, insert, update, delete on public.businesses to authenticated;

-- Anonymous visitors may read the safe columns used by a public booking page.
-- Only these columns are granted, so address/phone/owner_id stay private.
revoke all on public.businesses from anon;
grant select (slug, name, business_type, city) on public.businesses to anon;

drop policy if exists "Owners can read their business" on public.businesses;
create policy "Owners can read their business"
  on public.businesses for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can create their business" on public.businesses;
create policy "Owners can create their business"
  on public.businesses for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can update their business" on public.businesses;
create policy "Owners can update their business"
  on public.businesses for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can delete their business" on public.businesses;
create policy "Owners can delete their business"
  on public.businesses for delete to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Anyone can read public business basics" on public.businesses;
create policy "Anyone can read public business basics"
  on public.businesses for select to anon
  using (true);

-- Turn a business name into a URL-safe slug.
create or replace function public.slugify_business_name(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(
      trim(both '-' from left(regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'), 60)),
      ''
    ),
    'business'
  );
$$;

-- Pick the next free slug, e.g. "adeshola-spa", "adeshola-spa-2".
create or replace function public.unique_business_slug(base_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text := public.slugify_business_name(base_name);
  candidate text := base;
  suffix integer := 1;
begin
  while exists (select 1 from public.businesses where slug = candidate) loop
    suffix := suffix + 1;
    candidate := base || '-' || suffix::text;
  end loop;
  return candidate;
end;
$$;

revoke all on function public.slugify_business_name(text) from public, anon, authenticated;
revoke all on function public.unique_business_slug(text) from public, anon, authenticated;

-- Every business gets a slug on insert, whether it comes from the auth trigger
-- or from an owner upsert, without changing it when the name is edited later.
create or replace function public.set_business_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(coalesce(new.slug, '')), '') is null then
    new.slug := public.unique_business_slug(new.name);
  end if;
  return new;
end;
$$;

revoke all on function public.set_business_slug() from public, anon, authenticated;

drop trigger if exists set_business_slug_before_insert on public.businesses;
create trigger set_business_slug_before_insert
  before insert on public.businesses
  for each row execute procedure public.set_business_slug();

create or replace function public.create_business_for_new_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  -- Only Booka onboarding signups carry these fields. Skipping everyone else
  -- (invites, dashboard-created users, OAuth) keeps their signup from failing.
  if nullif(btrim(meta ->> 'business_name'), '') is null
    or coalesce(meta ->> 'business_type', '') not in ('Barbing', 'Hairdressing', 'Spa')
    or nullif(btrim(meta ->> 'owner_first_name'), '') is null
    or nullif(btrim(meta ->> 'owner_last_name'), '') is null
    or nullif(btrim(meta ->> 'address'), '') is null
    or nullif(btrim(meta ->> 'city'), '') is null
    or nullif(btrim(meta ->> 'phone'), '') is null then
    return new;
  end if;

  insert into public.businesses (
    owner_id,
    name,
    business_type,
    owner_first_name,
    owner_last_name,
    address,
    city,
    phone
  )
  values (
    new.id,
    btrim(meta ->> 'business_name'),
    meta ->> 'business_type',
    btrim(meta ->> 'owner_first_name'),
    btrim(meta ->> 'owner_last_name'),
    btrim(meta ->> 'address'),
    btrim(meta ->> 'city'),
    btrim(meta ->> 'phone')
  )
  on conflict (owner_id) do nothing;

  return new;
end;
$$;

revoke all on function public.create_business_for_new_owner() from public, anon, authenticated;

drop trigger if exists create_business_after_owner_signup on auth.users;
create trigger create_business_after_owner_signup
  after insert on auth.users
  for each row execute procedure public.create_business_for_new_owner();

-- Backfill owners who signed up before the trigger existed.
insert into public.businesses (
  owner_id,
  name,
  business_type,
  owner_first_name,
  owner_last_name,
  address,
  city,
  phone
)
select
  u.id,
  btrim(u.raw_user_meta_data ->> 'business_name'),
  u.raw_user_meta_data ->> 'business_type',
  btrim(u.raw_user_meta_data ->> 'owner_first_name'),
  btrim(u.raw_user_meta_data ->> 'owner_last_name'),
  btrim(u.raw_user_meta_data ->> 'address'),
  btrim(u.raw_user_meta_data ->> 'city'),
  btrim(u.raw_user_meta_data ->> 'phone')
from auth.users u
where char_length(btrim(u.raw_user_meta_data ->> 'business_name')) between 2 and 120
  and coalesce(u.raw_user_meta_data ->> 'business_type', '') in ('Barbing', 'Hairdressing', 'Spa')
  and char_length(btrim(u.raw_user_meta_data ->> 'owner_first_name')) between 1 and 80
  and char_length(btrim(u.raw_user_meta_data ->> 'owner_last_name')) between 1 and 80
  and char_length(btrim(u.raw_user_meta_data ->> 'address')) between 1 and 200
  and char_length(btrim(u.raw_user_meta_data ->> 'city')) between 1 and 100
  and char_length(btrim(u.raw_user_meta_data ->> 'phone')) between 1 and 32
on conflict (owner_id) do nothing;
