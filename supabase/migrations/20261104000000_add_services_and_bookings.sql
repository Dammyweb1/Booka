-- Services and bookings power the owner backoffice and the public booking flow.

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  duration_minutes integer not null check (duration_minutes between 5 and 600),
  price_naira integer not null check (price_naira between 0 and 100000000),
  tone text not null default 'gold' check (tone in ('gold', 'teal', 'rose')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 120),
  customer_email text not null check (char_length(customer_email) between 3 and 254),
  customer_phone text not null check (char_length(btrim(customer_phone)) between 5 and 32),
  starts_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists bookings_business_starts_at_idx on public.bookings (business_id, starts_at);
create index if not exists services_business_idx on public.services (business_id);

alter table public.services enable row level security;
alter table public.bookings enable row level security;

grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;

-- Anonymous visitors may read the service menu, but never bookings. Row level
-- security still hides inactive services from the public read policy below.
revoke all on public.services from anon;
revoke all on public.bookings from anon;
grant select on public.services to anon;

-- The public page needs the business id to load its menu and create a booking.
grant select (id) on public.businesses to anon;

drop policy if exists "Owners manage their services" on public.services;
create policy "Owners manage their services"
  on public.services for all to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = public.services.business_id and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = public.services.business_id and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Anyone can read active services" on public.services;
create policy "Anyone can read active services"
  on public.services for select to anon
  using (active = true);

drop policy if exists "Owners manage their bookings" on public.bookings;
create policy "Owners manage their bookings"
  on public.bookings for all to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = public.bookings.business_id and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = public.bookings.business_id and b.owner_id = (select auth.uid())
    )
  );

-- Public booking is created through a security-definer function so anonymous
-- visitors never get direct insert access to the bookings table.
create or replace function public.create_public_booking(
  p_business_id uuid,
  p_service_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_starts_at timestamptz,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_booking_id uuid;
  service_business_id uuid;
  service_is_active boolean;
begin
  if char_length(btrim(coalesce(p_customer_name, ''))) < 2
    or char_length(btrim(coalesce(p_customer_name, ''))) > 120 then
    raise exception 'Enter the customer name.';
  end if;

  if char_length(btrim(coalesce(p_customer_email, ''))) < 3
    or p_customer_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address.';
  end if;

  if char_length(btrim(coalesce(p_customer_phone, ''))) < 5
    or char_length(btrim(coalesce(p_customer_phone, ''))) > 32 then
    raise exception 'Enter a valid phone number.';
  end if;

  if p_starts_at is null or p_starts_at < now() then
    raise exception 'Choose a future date and time.';
  end if;

  select business_id, active
    into service_business_id, service_is_active
    from public.services
    where id = p_service_id;

  if service_business_id is null
    or service_business_id <> p_business_id
    or service_is_active is not true then
    raise exception 'That service is not available.';
  end if;

  if exists (
    select 1 from public.bookings
    where business_id = p_business_id
      and starts_at = p_starts_at
      and status <> 'cancelled'
  ) then
    raise exception 'That time is already booked. Choose another slot.';
  end if;

  insert into public.bookings (
    business_id,
    service_id,
    customer_name,
    customer_email,
    customer_phone,
    starts_at,
    notes
  )
  values (
    p_business_id,
    p_service_id,
    btrim(p_customer_name),
    lower(btrim(p_customer_email)),
    btrim(p_customer_phone),
    p_starts_at,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into new_booking_id;

  return new_booking_id;
end;
$$;

revoke all on function public.create_public_booking(uuid, uuid, text, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.create_public_booking(uuid, uuid, text, text, text, timestamptz, text) to anon, authenticated;

-- Give every new business a starter menu based on its category.
create or replace function public.seed_business_services()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.services (business_id, name, duration_minutes, price_naira, tone)
  select new.id, menu.name, menu.duration_minutes, menu.price_naira, menu.tone
  from (
    values
      ('Barbing', 'Signature fade', 30, 8000, 'gold'),
      ('Barbing', 'Beard sculpt & trim', 20, 5000, 'teal'),
      ('Barbing', 'Cut, wash & finish', 45, 12000, 'rose'),
      ('Hairdressing', 'Silk press & finish', 90, 24000, 'gold'),
      ('Hairdressing', 'Braids & protective style', 120, 35000, 'teal'),
      ('Hairdressing', 'Wash, trim & style', 60, 15000, 'rose'),
      ('Spa', 'Deep tissue ritual', 60, 28000, 'teal'),
      ('Spa', 'Signature glow facial', 45, 22000, 'gold'),
      ('Spa', 'Hot stone massage', 90, 38000, 'rose')
  ) as menu (business_type, name, duration_minutes, price_naira, tone)
  where menu.business_type = new.business_type
  on conflict (business_id, name) do nothing;

  return new;
end;
$$;

revoke all on function public.seed_business_services() from public, anon, authenticated;

drop trigger if exists seed_business_services_after_insert on public.businesses;
create trigger seed_business_services_after_insert
  after insert on public.businesses
  for each row execute procedure public.seed_business_services();

-- Backfill starter menus for businesses created before this migration.
insert into public.services (business_id, name, duration_minutes, price_naira, tone)
select b.id, menu.name, menu.duration_minutes, menu.price_naira, menu.tone
from public.businesses b
join (
  values
    ('Barbing', 'Signature fade', 30, 8000, 'gold'),
    ('Barbing', 'Beard sculpt & trim', 20, 5000, 'teal'),
    ('Barbing', 'Cut, wash & finish', 45, 12000, 'rose'),
    ('Hairdressing', 'Silk press & finish', 90, 24000, 'gold'),
    ('Hairdressing', 'Braids & protective style', 120, 35000, 'teal'),
    ('Hairdressing', 'Wash, trim & style', 60, 15000, 'rose'),
    ('Spa', 'Deep tissue ritual', 60, 28000, 'teal'),
    ('Spa', 'Signature glow facial', 45, 22000, 'gold'),
    ('Spa', 'Hot stone massage', 90, 38000, 'rose')
) as menu (business_type, name, duration_minutes, price_naira, tone)
  on menu.business_type = b.business_type
on conflict (business_id, name) do nothing;
