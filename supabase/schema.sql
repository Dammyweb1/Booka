-- =========================================================================
-- PLATFORM ADMINS & PAYSTACK SUBACCOUNTS (MISSION CONTROL)
-- =========================================================================

create table if not exists public.platform_admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'superadmin',
  requires_2fa boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

drop policy if exists "Admins can view their own record" on public.platform_admins;
create policy "Admins can view their own record"
  on public.platform_admins for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Admins can insert their own record" on public.platform_admins;

-- Add Paystack subaccount and fee configuration to businesses
alter table public.businesses
  add column if not exists paystack_subaccount_code text,
  add column if not exists settlement_bank text,
  add column if not exists bank_code text,
  add column if not exists account_number text,
  add column if not exists account_name text,
  add column if not exists fee_share_percent numeric not null default 97.0,
  add column if not exists platform_fee_percent numeric not null default 3.0,
  add column if not exists fee_bearer text not null default 'subaccount';

create table if not exists public.businesses (

  business_id text primary key,
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  slug text not null unique,
  business_name text not null,
  owner_name text not null,
  email text not null,
  phone text not null default '',
  location text not null default '',
  logo_url text,
  timezone text not null default 'West Africa Time (GMT+1)',
  currency text not null default 'NGN (₦) — Nigerian Naira',
  auto_confirm boolean not null default true,
  email_alerts boolean not null default true,
  sms_alerts boolean not null default true,
  cancellation_window text not null default '24 hours before appointment',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

update auth.users
set raw_user_meta_data = raw_user_meta_data - 'logo_url'
where raw_user_meta_data->>'logo_url' like 'data:image/%';

create table if not exists public.signup_confirmation_links (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  sent_at timestamptz not null
);

alter table public.signup_confirmation_links enable row level security;
revoke all on public.signup_confirmation_links from public, anon, authenticated;
grant select on public.signup_confirmation_links to service_role;

create table if not exists public.services (
  id text not null,
  business_id text not null references public.businesses(business_id) on delete cascade,
  name text not null,
  detail text not null default '',
  category text not null check (category in ('barbing', 'spa', 'hair', 'general')),
  duration_minutes integer not null check (duration_minutes > 0),
  price integer not null check (price >= 0),
  color text not null default 'bg-[#f0ded4]',
  icon_color text not null default 'text-[#9e503b]',
  created_at timestamptz not null default now(),
  primary key (business_id, id)
);

alter table public.services
  add column if not exists is_active boolean not null default false;

alter table public.services
  alter column is_active set default false;

alter table public.services
  drop constraint if exists services_are_categories_only;

update public.services
set price = 0;

alter table public.services
  add constraint services_are_categories_only check (price = 0);

create table if not exists public.service_addons (
  id text not null,
  business_id text not null,
  service_id text not null,
  name text not null,
  price integer not null check (price >= 0),
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (business_id, service_id, id),
  foreign key (business_id, service_id)
    references public.services (business_id, id) on delete cascade
);

create table if not exists public.appointments (
  id text primary key,
  business_id text not null references public.businesses(business_id) on delete cascade,
  client_name text not null,
  client_email text not null default '',
  client_phone text not null,
  client_notes text not null default '',
  service_id text not null,
  service_name text not null,
  appointment_time text not null,
  appointment_date date not null,
  amount integer not null check (amount >= 0),
  selected_addons jsonb not null default '[]'::jsonb,
  status text not null check (status in ('Paid', 'Confirmed', 'Pending', 'Archived', 'Rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id text primary key,
  business_id text not null references public.businesses(business_id) on delete cascade,
  name text not null,
  email text not null default '',
  phone text not null,
  total_bookings integer not null default 0,
  total_spent integer not null default 0,
  last_visit date,
  status text not null default 'New' check (status in ('VIP', 'Regular', 'New')),
  unique (business_id, phone)
);

create table if not exists public.notifications (
  id text primary key,
  business_id text not null references public.businesses(business_id) on delete cascade,
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  type text not null check (type in ('booking', 'payment', 'alert')),
  read boolean not null default false
);

create index if not exists appointments_business_date_idx
  on public.appointments (business_id, appointment_date desc);
create index if not exists notifications_business_created_idx
  on public.notifications (business_id, created_at desc);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.businesses, public.services,
  public.service_addons, public.appointments, public.clients, public.notifications to authenticated;

alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.service_addons enable row level security;
alter table public.appointments enable row level security;
alter table public.clients enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Owners manage their business" on public.businesses;
create policy "Owners manage their business" on public.businesses
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners manage their services" on public.services;
create policy "Owners manage their services" on public.services
  for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.business_id = services.business_id and b.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.business_id = services.business_id and b.owner_id = (select auth.uid())
  ));

drop policy if exists "Owners manage their service add-ons" on public.service_addons;
create policy "Owners manage their service add-ons" on public.service_addons
  for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.business_id = service_addons.business_id and b.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.business_id = service_addons.business_id and b.owner_id = (select auth.uid())
  ));

drop policy if exists "Owners manage their appointments" on public.appointments;
create policy "Owners manage their appointments" on public.appointments
  for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.business_id = appointments.business_id and b.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.business_id = appointments.business_id and b.owner_id = (select auth.uid())
  ));

drop policy if exists "Owners manage their clients" on public.clients;
create policy "Owners manage their clients" on public.clients
  for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.business_id = clients.business_id and b.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.business_id = clients.business_id and b.owner_id = (select auth.uid())
  ));

drop policy if exists "Owners manage their notifications" on public.notifications;
create policy "Owners manage their notifications" on public.notifications
  for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.business_id = notifications.business_id and b.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.business_id = notifications.business_id and b.owner_id = (select auth.uid())
  ));

create or replace function public.create_business_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  business_key text;
  selected_service text;
  service_index integer := 0;
  service_category text;
  service_price integer;
  service_duration integer;
  service_color text;
  service_icon_color text;
begin
  business_key := coalesce(nullif(metadata->>'business_id', ''), 'bk-' || substr(new.id::text, 1, 8));

  insert into public.businesses (
    business_id, owner_id, slug, business_name, owner_name, email, phone, location, logo_url
  ) values (
    business_key,
    new.id,
    coalesce(nullif(metadata->>'business_slug', ''), 'studio-' || substr(new.id::text, 1, 8)),
    coalesce(nullif(metadata->>'business_name', ''), 'My Studio'),
    coalesce(nullif(metadata->>'owner_name', ''), 'Studio Owner'),
    coalesce(new.email, ''),
    coalesce(metadata->>'phone', ''),
    coalesce(metadata->>'address', ''),
    metadata->>'logo_url'
  );

  for selected_service in
    select jsonb_array_elements_text(coalesce(metadata->'selected_services', '[]'::jsonb))
  loop
    service_index := service_index + 1;
    case selected_service
      when 'Barbing' then
        service_category := 'barbing'; service_price := 0; service_duration := 45;
        service_color := 'bg-[#eee7ff]'; service_icon_color := 'text-[#7253cb]';
      when 'Spa' then
        service_category := 'spa'; service_price := 0; service_duration := 60;
        service_color := 'bg-[#ffe7df]'; service_icon_color := 'text-[#d46b4f]';
      when 'Hair dressing' then
        service_category := 'hair'; service_price := 0; service_duration := 90;
        service_color := 'bg-[#e7f2ea]'; service_icon_color := 'text-[#528361]';
      else
        service_category := 'general'; service_price := 0; service_duration := 60;
        service_color := 'bg-[#f0ded4]'; service_icon_color := 'text-[#9e503b]';
    end case;

    insert into public.services (
      id, business_id, name, detail, category, duration_minutes, price, color, icon_color, is_active
    ) values (
      'srv-' || service_index,
      business_key,
      selected_service,
      selected_service || ' tailored for you',
      service_category,
      service_duration,
      service_price,
      service_color,
      service_icon_color,
      false
    );
  end loop;

  insert into public.services (
    id, business_id, name, detail, category, duration_minutes, price, color, icon_color, is_active
  )
  select
    'catalog-' || catalog.category,
    business_key,
    catalog.name,
    catalog.detail,
    catalog.category,
    catalog.duration_minutes,
    catalog.price,
    catalog.color,
    catalog.icon_color,
    false
  from (values
    ('Barbing', 'Sharp fades & clean cuts', 'barbing', 45, 0, 'bg-[#eee7ff]', 'text-[#7253cb]'),
    ('Spa', 'Slow down & feel good', 'spa', 60, 0, 'bg-[#ffe7df]', 'text-[#d46b4f]'),
    ('Hair dressing', 'Your look, your way', 'hair', 90, 0, 'bg-[#e7f2ea]', 'text-[#528361]')
  ) as catalog(name, detail, category, duration_minutes, price, color, icon_color)
  where not exists (
    select 1 from public.services s
    where s.business_id = business_key and s.name = catalog.name
  );

  return new;
end;
$$;

alter table public.appointments
  add column if not exists paystack_reference text,
  add column if not exists deposit_paid_kobo integer not null default 0,
  add column if not exists selected_addons jsonb not null default '[]'::jsonb,
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid'));

create unique index if not exists appointments_paystack_reference_uidx
  on public.appointments (paystack_reference)
  where paystack_reference is not null;

drop function if exists public.create_paid_public_booking(
  text, text, text, text, text, text, date, text, text, integer
);
drop function if exists public.create_paid_public_booking(
  text, text, text, text, text, text, date, text, text, integer, text[]
);
drop function if exists public.create_paid_public_booking(
  text, text, text, text, text, date, text, text, integer, jsonb
);

create or replace function public.create_paid_public_booking(
  p_slug text,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_client_notes text,
  p_appointment_date date,
  p_appointment_time text,
  p_paystack_reference text,
  p_deposit_paid_kobo integer,
  p_deposit_percent numeric,
  p_bookable_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  business_row public.businesses%rowtype;
  appointment_row public.appointments%rowtype;
  client_id text;
  item_count bigint := 0;
  item_snapshot jsonb := '[]'::jsonb;
  primary_category_id text;
  primary_item_name text;
  total_price integer;
  deposit_percent numeric;
begin
  if length(trim(coalesce(p_client_name, ''))) < 2
    or length(trim(coalesce(p_client_name, ''))) > 120
    or length(trim(coalesce(p_client_phone, ''))) < 5
    or length(trim(coalesce(p_client_phone, ''))) > 40
    or length(trim(coalesce(p_client_email, ''))) > 254
    or length(trim(coalesce(p_client_notes, ''))) > 1000
    or p_appointment_date is null
    or p_appointment_date < current_date
    or p_appointment_date > current_date + 90
    or trim(coalesce(p_paystack_reference, '')) = ''
    or length(p_paystack_reference) > 100
    or p_deposit_paid_kobo is null
    or p_deposit_paid_kobo <= 0
    or p_deposit_percent is null
    or p_deposit_percent < 1
    or p_deposit_percent > 100
    or trim(coalesce(p_appointment_time, '')) not in (
      '09:00 AM', '10:15 AM', '11:30 AM', '01:00 PM',
      '02:30 PM', '03:45 PM', '05:00 PM', '06:15 PM', '07:30 PM'
    ) then
    raise exception 'Please provide valid paid booking details';
  end if;

  if coalesce(jsonb_typeof(p_bookable_items), 'null') <> 'array' then
    raise exception 'Please select bookable items';
  end if;
  if jsonb_array_length(p_bookable_items) < 1 or jsonb_array_length(p_bookable_items) > 10 then
    raise exception 'Select between 1 and 10 bookable items';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_bookable_items) as selection(item)
    where coalesce(jsonb_typeof(selection.item), 'null') <> 'object'
      or coalesce(length(selection.item->>'service_id'), 0) not between 1 and 120
      or coalesce(length(selection.item->>'addon_id'), 0) not between 1 and 120
  ) then
    raise exception 'Please select valid bookable items';
  end if;
  if jsonb_array_length(p_bookable_items) <> (
    select count(distinct (selection.item->>'service_id', selection.item->>'addon_id'))
    from jsonb_array_elements(p_bookable_items) as selection(item)
  ) then
    raise exception 'Please select each bookable item only once';
  end if;

  select * into appointment_row
  from public.appointments a
  where a.paystack_reference = p_paystack_reference;
  if found then
    return jsonb_build_object(
      'id', appointment_row.id,
      'status', appointment_row.status,
      'client_name', appointment_row.client_name,
      'client_phone', appointment_row.client_phone,
      'client_email', appointment_row.client_email,
      'service_name', appointment_row.service_name,
      'appointment_date', appointment_row.appointment_date,
      'appointment_time', appointment_row.appointment_time,
      'amount', appointment_row.amount,
      'deposit_paid_kobo', appointment_row.deposit_paid_kobo,
      'selected_addons', appointment_row.selected_addons
    );
  end if;

  select * into business_row
  from public.businesses b
  where b.slug = p_slug
    and b.lifecycle_status = 'active';
  if not found then
    raise exception 'Business not found';
  end if;
  if business_row.currency not like 'NGN%' then
    raise exception 'This business is not configured for NGN payments';
  end if;

  deposit_percent := p_deposit_percent;

  select
    coalesce(sum(a.price), 0),
    count(*),
    coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'price', a.price,
      'duration_minutes', a.duration_minutes,
      'category_name', s.name
    ) order by selection.ordinality) filter (where selection.ordinality > 1), '[]'::jsonb),
    (array_agg(s.id order by selection.ordinality))[1],
    (array_agg(a.name order by selection.ordinality))[1]
  into total_price, item_count, item_snapshot, primary_category_id, primary_item_name
  from jsonb_array_elements(p_bookable_items) with ordinality as selection(item, ordinality)
  join public.services s
    on s.business_id = business_row.business_id
    and s.id = selection.item->>'service_id'
    and s.is_active
  join public.service_addons a
    on a.business_id = s.business_id
    and a.service_id = s.id
    and a.id = selection.item->>'addon_id'
    and a.is_active
    and a.price > 0;

  if item_count <> jsonb_array_length(p_bookable_items) then
    raise exception 'One or more selected items are unavailable';
  end if;

  if p_deposit_paid_kobo <> round(total_price::numeric * p_deposit_percent) then
    raise exception 'The payment amount does not match the selected items';
  end if;

  insert into public.appointments (
    id, business_id, client_name, client_email, client_phone, client_notes,
    service_id, service_name, appointment_time, appointment_date, amount, selected_addons, status,
    paystack_reference, deposit_paid_kobo, payment_status
  ) values (
    'BK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    business_row.business_id,
    trim(p_client_name),
    trim(coalesce(p_client_email, '')),
    trim(p_client_phone),
    trim(coalesce(p_client_notes, '')),
    primary_category_id,
    primary_item_name,
    trim(p_appointment_time),
    p_appointment_date,
    total_price,
    item_snapshot,
    case when business_row.auto_confirm then 'Confirmed' else 'Pending' end,
    p_paystack_reference,
    p_deposit_paid_kobo,
    'paid'
  )
  on conflict (paystack_reference) where paystack_reference is not null do nothing
  returning * into appointment_row;

  if not found then
    select * into appointment_row
    from public.appointments a
    where a.paystack_reference = p_paystack_reference;
    return jsonb_build_object(
      'id', appointment_row.id,
      'status', appointment_row.status,
      'client_name', appointment_row.client_name,
      'client_phone', appointment_row.client_phone,
      'client_email', appointment_row.client_email,
      'service_name', appointment_row.service_name,
      'appointment_date', appointment_row.appointment_date,
      'appointment_time', appointment_row.appointment_time,
      'amount', appointment_row.amount,
      'deposit_paid_kobo', appointment_row.deposit_paid_kobo,
      'selected_addons', appointment_row.selected_addons
    );
  end if;

  client_id := 'cli-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.clients (
    id, business_id, name, email, phone, total_bookings, total_spent, last_visit, status
  ) values (
    client_id, business_row.business_id, trim(p_client_name),
    trim(coalesce(p_client_email, '')), trim(p_client_phone),
    1, 0, p_appointment_date, 'New'
  )
  on conflict (business_id, phone) do update set
    name = excluded.name,
    email = case when excluded.email <> '' then excluded.email else clients.email end,
    total_bookings = clients.total_bookings + 1,
    last_visit = greatest(clients.last_visit, excluded.last_visit),
    status = case when clients.total_bookings + 1 >= 5 then 'VIP' else 'Regular' end;

  insert into public.notifications (id, business_id, title, message, type)
  values (
    'notif-' || replace(gen_random_uuid()::text, '-', ''),
    business_row.business_id,
    'New Booking — Deposit Paid',
    trim(p_client_name) || ' booked ' || item_count || ' item(s) and paid the ' ||
      p_deposit_percent || '% deposit.',
    'payment'
  );

  return jsonb_build_object(
    'id', appointment_row.id,
    'status', appointment_row.status,
    'client_name', appointment_row.client_name,
    'client_phone', appointment_row.client_phone,
    'client_email', appointment_row.client_email,
    'service_name', appointment_row.service_name,
    'appointment_date', appointment_row.appointment_date,
    'appointment_time', appointment_row.appointment_time,
    'amount', appointment_row.amount,
    'deposit_paid_kobo', appointment_row.deposit_paid_kobo,
    'selected_addons', appointment_row.selected_addons
  );
end;
$$;



drop trigger if exists create_business_after_signup on auth.users;
create trigger create_business_after_signup
  after insert on auth.users
  for each row execute function public.create_business_for_new_user();

create or replace function public.track_signup_confirmation_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null then
    delete from public.signup_confirmation_links
    where auth_user_id = new.id;
  elsif new.email is not null and new.confirmation_sent_at is not null then
    insert into public.signup_confirmation_links (auth_user_id, email, sent_at)
    values (new.id, lower(new.email), new.confirmation_sent_at)
    on conflict (auth_user_id) do update set
      email = excluded.email,
      sent_at = excluded.sent_at;
  end if;

  return new;
end;
$$;

drop trigger if exists track_signup_confirmation_link on auth.users;
create trigger track_signup_confirmation_link
  after insert or update of confirmation_sent_at, email_confirmed_at on auth.users
  for each row execute function public.track_signup_confirmation_link();

insert into public.signup_confirmation_links (auth_user_id, email, sent_at)
select id, lower(email), confirmation_sent_at
from auth.users
where email is not null
  and email_confirmed_at is null
  and confirmation_sent_at is not null
on conflict (auth_user_id) do update set
  email = excluded.email,
  sent_at = excluded.sent_at;

insert into public.businesses (
  business_id, owner_id, slug, business_name, owner_name, email, phone, location, logo_url
)
select
  coalesce(nullif(u.raw_user_meta_data->>'business_id', ''), 'bk-' || substr(u.id::text, 1, 8)),
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'business_slug', ''), 'studio-' || substr(u.id::text, 1, 8)),
  coalesce(nullif(u.raw_user_meta_data->>'business_name', ''), 'My Studio'),
  coalesce(nullif(u.raw_user_meta_data->>'owner_name', ''), 'Studio Owner'),
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'phone', ''),
  coalesce(u.raw_user_meta_data->>'address', ''),
  u.raw_user_meta_data->>'logo_url'
from auth.users u
on conflict (owner_id) do nothing;

insert into public.services (
  id, business_id, name, detail, category, duration_minutes, price, color, icon_color, is_active
)
select
  'srv-' || selected.ordinality::text,
  b.business_id,
  selected.name,
  selected.name || ' tailored for you',
  case selected.name when 'Barbing' then 'barbing' when 'Spa' then 'spa' when 'Hair dressing' then 'hair' else 'general' end,
  case selected.name when 'Barbing' then 45 when 'Spa' then 60 when 'Hair dressing' then 90 else 60 end,
  0,
  case selected.name when 'Barbing' then 'bg-[#eee7ff]' when 'Spa' then 'bg-[#ffe7df]' when 'Hair dressing' then 'bg-[#e7f2ea]' else 'bg-[#f0ded4]' end,
  case selected.name when 'Barbing' then 'text-[#7253cb]' when 'Spa' then 'text-[#d46b4f]' when 'Hair dressing' then 'text-[#528361]' else 'text-[#9e503b]' end,
  false
from auth.users u
join public.businesses b on b.owner_id = u.id
cross join lateral jsonb_array_elements_text(coalesce(u.raw_user_meta_data->'selected_services', '[]'::jsonb))
  with ordinality as selected(name, ordinality)
on conflict (business_id, id) do nothing;

insert into public.services (
  id, business_id, name, detail, category, duration_minutes, price, color, icon_color, is_active
)
select
  'catalog-' || catalog.category,
  b.business_id,
  catalog.name,
  catalog.detail,
  catalog.category,
  catalog.duration_minutes,
  catalog.price,
  catalog.color,
  catalog.icon_color,
  false
from public.businesses b
cross join (values
  ('Barbing', 'Sharp fades & clean cuts', 'barbing', 45, 0, 'bg-[#eee7ff]', 'text-[#7253cb]'),
  ('Spa', 'Slow down & feel good', 'spa', 60, 0, 'bg-[#ffe7df]', 'text-[#d46b4f]'),
  ('Hair dressing', 'Your look, your way', 'hair', 90, 0, 'bg-[#e7f2ea]', 'text-[#528361]')
) as catalog(name, detail, category, duration_minutes, price, color, icon_color)
where not exists (
  select 1 from public.services s
  where s.business_id = b.business_id and s.name = catalog.name
);

create or replace function public.get_public_business_by_slug(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'business_id', b.business_id,
    'slug', b.slug,
    'business_name', b.business_name,
    'owner_name', b.owner_name,
    'phone', b.phone,
    'location', b.location,
    'logo_url', b.logo_url,
    'timezone', b.timezone,
    'currency', b.currency,
    'auto_confirm', b.auto_confirm,
    'lifecycle_status', b.lifecycle_status,
    'verification_status', b.verification_status,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'detail', s.detail,
        'category', s.category,
        'duration_minutes', s.duration_minutes,
        'price', s.price,
        'color', s.color,
        'icon_color', s.icon_color,
        'is_active', s.is_active,
        'addons', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id,
            'name', a.name,
            'price', a.price,
            'duration_minutes', a.duration_minutes,
            'is_active', a.is_active
          ) order by a.created_at)
          from public.service_addons a
          where a.business_id = s.business_id
            and a.service_id = s.id
            and a.is_active
            and a.price > 0
        ), '[]'::jsonb)
      ) order by s.created_at)
      from public.services s
      where s.business_id = b.business_id
        and s.is_active
    ), '[]'::jsonb)
  )
  from public.businesses b
  where b.slug = p_slug
    and b.lifecycle_status = 'active';
$$;

create or replace function public.create_public_booking(
  p_slug text,
  p_service_id text,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_client_notes text,
  p_appointment_date date,
  p_appointment_time text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  business_row public.businesses%rowtype;
  service_row public.services%rowtype;
  appointment_id text;
  client_id text;
begin
  if length(trim(coalesce(p_client_name, ''))) < 2
    or length(trim(coalesce(p_client_name, ''))) > 120
    or length(trim(coalesce(p_client_phone, ''))) < 5
    or length(trim(coalesce(p_client_phone, ''))) > 40
    or length(trim(coalesce(p_client_email, ''))) > 254
    or length(trim(coalesce(p_client_notes, ''))) > 1000
    or p_appointment_date is null
    or p_appointment_date < current_date
    or p_appointment_date > current_date + 90
    or length(trim(coalesce(p_appointment_time, ''))) = 0 then
    raise exception 'Please provide valid booking details';
  end if;
  if trim(p_appointment_time) not in (
    '09:00 AM', '10:15 AM', '11:30 AM', '01:00 PM',
    '02:30 PM', '03:45 PM', '05:00 PM', '06:15 PM', '07:30 PM'
  ) then
    raise exception 'Please select an available time';
  end if;

  select * into business_row
  from public.businesses b
  where b.slug = p_slug
    and b.lifecycle_status = 'active';
  if not found then
    raise exception 'Business not found';
  end if;

  select * into service_row
  from public.services s
  where s.id = p_service_id and s.business_id = business_row.business_id
    and s.is_active and s.price > 0;
  if not found then
    raise exception 'Service not found';
  end if;

  appointment_id := 'BK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  client_id := 'cli-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.appointments (
    id, business_id, client_name, client_email, client_phone, client_notes,
    service_id, service_name, appointment_time, appointment_date, amount, status,
    paystack_reference, deposit_paid_kobo, payment_status
  ) values (
    appointment_id,
    business_row.business_id,
    trim(p_client_name),
    trim(coalesce(p_client_email, '')),
    trim(p_client_phone),
    trim(coalesce(p_client_notes, '')),
    service_row.id,
    service_row.name,
    trim(p_appointment_time),
    p_appointment_date,
    service_row.price,
    case when business_row.auto_confirm then 'Confirmed' else 'Pending' end,
    null,
    0,
    'unpaid'
  );

  insert into public.clients (
    id, business_id, name, email, phone, total_bookings, total_spent, last_visit, status
  ) values (
    client_id, business_row.business_id, trim(p_client_name),
    trim(coalesce(p_client_email, '')), trim(p_client_phone),
    1, 0, p_appointment_date, 'New'
  )
  on conflict (business_id, phone) do update set
    name = excluded.name,
    email = case when excluded.email <> '' then excluded.email else clients.email end,
    total_bookings = clients.total_bookings + 1,
    last_visit = greatest(clients.last_visit, excluded.last_visit),
    status = case when clients.total_bookings + 1 >= 5 then 'VIP' else 'Regular' end;

  insert into public.notifications (id, business_id, title, message, type)
  values (
    'notif-' || replace(gen_random_uuid()::text, '-', ''),
    business_row.business_id,
    'New Online Booking!',
    trim(p_client_name) || ' booked ' || service_row.name || ' for ' ||
      trim(p_appointment_time) || ' at ' || business_row.business_name || '.',
    'booking'
  );

  return jsonb_build_object(
    'id', appointment_id,
    'status', case when business_row.auto_confirm then 'Confirmed' else 'Pending' end,
    'client_name', trim(p_client_name),
    'client_phone', trim(p_client_phone),
    'client_email', trim(coalesce(p_client_email, '')),
    'service_name', service_row.name,
    'appointment_date', p_appointment_date,
    'appointment_time', trim(p_appointment_time),
    'amount', service_row.price,
    'deposit_paid_kobo', 0,
    'payment_status', 'unpaid'
  );
end;
$$;

revoke all on function public.get_public_business_by_slug(text) from public;
grant execute on function public.get_public_business_by_slug(text) to anon, authenticated;
revoke all on function public.create_public_booking(text, text, text, text, text, text, date, text) from public;
grant execute on function public.create_public_booking(text, text, text, text, text, text, date, text) to anon, authenticated;

revoke all on function public.create_public_booking(text, text, text, text, text, text, date, text)
  from public, anon, authenticated;
revoke all on function public.create_paid_public_booking(
  text, text, text, text, text, date, text, text, integer, numeric, jsonb
) from public, anon, authenticated;
grant execute on function public.create_paid_public_booking(
  text, text, text, text, text, date, text, text, integer, numeric, jsonb
) to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'businesses') then
      alter publication supabase_realtime add table public.businesses;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments') then
      alter publication supabase_realtime add table public.appointments;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'services') then
      alter publication supabase_realtime add table public.services;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'service_addons') then
      alter publication supabase_realtime add table public.service_addons;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clients') then
      alter publication supabase_realtime add table public.clients;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end;
$$;

create table if not exists public.admin_notifications (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('business_signup', 'booking_payment')),
  title text not null,
  message text not null,
  business_id text references public.businesses(business_id) on delete set null,
  related_id text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.platform_settings (
  singleton boolean primary key default true check (singleton),
  default_platform_fee_percent numeric not null default 3
    check (default_platform_fee_percent >= 0 and default_platform_fee_percent <= 100),
  booking_deposit_percent numeric not null default 30
    check (booking_deposit_percent >= 1 and booking_deposit_percent <= 100),
  maintenance_mode boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.platform_settings (singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.platform_settings enable row level security;
grant select on public.platform_settings to service_role;

create table if not exists public.platform_audit_logs (
  id bigint generated always as identity primary key,
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text not null,
  entity_type text not null,
  entity_id text not null,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_logs_created_at_idx
  on public.platform_audit_logs (created_at desc);
create index if not exists platform_audit_logs_event_type_idx
  on public.platform_audit_logs (event_type, created_at desc);

alter table public.platform_audit_logs enable row level security;
grant select on public.platform_audit_logs to authenticated;

drop policy if exists "Superadmins can read platform audit logs" on public.platform_audit_logs;
create policy "Superadmins can read platform audit logs"
  on public.platform_audit_logs for select
  to authenticated
  using (exists (
    select 1 from public.platform_admins pa
    where pa.id = (select auth.uid()) and pa.role = 'superadmin'
  ));

create or replace function public.apply_platform_default_fee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  default_platform_fee numeric;
begin
  if new.fee_share_percent = 97 and new.platform_fee_percent = 3 then
    select s.default_platform_fee_percent into default_platform_fee
    from public.platform_settings s
    where s.singleton = true;

    if found then
      new.platform_fee_percent := default_platform_fee;
      new.fee_share_percent := 100 - default_platform_fee;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_apply_platform_default_fee on public.businesses;
create trigger businesses_apply_platform_default_fee
  before insert on public.businesses
  for each row execute function public.apply_platform_default_fee();

create or replace function public.log_admin_notification_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.platform_audit_logs (
    event_type, actor_id, actor_email, entity_type, entity_id, summary, details
  ) values (
    new.event_type,
    null,
    'System',
    case when new.event_type = 'business_signup' then 'business' else 'booking' end,
    new.related_id,
    new.title || ': ' || new.message,
    jsonb_build_object('business_id', new.business_id, 'notification_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists admin_notifications_audit_log on public.admin_notifications;
create trigger admin_notifications_audit_log
  after insert on public.admin_notifications
  for each row execute function public.log_admin_notification_audit();

create or replace function public.admin_get_platform_settings()
returns table (
  default_platform_fee_percent numeric,
  booking_deposit_percent numeric,
  maintenance_mode boolean,
  updated_at timestamptz,
  updated_by_email text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid()
      and pa.role in ('superadmin', 'finance', 'operations', 'support', 'auditor')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select s.default_platform_fee_percent, s.booking_deposit_percent, s.maintenance_mode,
    s.updated_at, u.email::text
  from public.platform_settings s
  left join auth.users u on u.id = s.updated_by
  where s.singleton = true;
end;
$$;

create or replace function public.admin_update_platform_settings(
  p_default_platform_fee_percent numeric,
  p_booking_deposit_percent numeric,
  p_maintenance_mode boolean
)
returns table (
  default_platform_fee_percent numeric,
  booking_deposit_percent numeric,
  maintenance_mode boolean,
  updated_at timestamptz,
  updated_by_email text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_settings public.platform_settings%rowtype;
  updated_settings public.platform_settings%rowtype;
  current_actor_email text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid() and pa.role = 'superadmin'
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_default_platform_fee_percent is null
    or p_default_platform_fee_percent < 0
    or p_default_platform_fee_percent > 100
    or p_booking_deposit_percent is null
    or p_booking_deposit_percent < 1
    or p_booking_deposit_percent > 100
    or p_maintenance_mode is null then
    raise exception 'Invalid platform settings';
  end if;

  select s.* into current_settings
  from public.platform_settings s
  where s.singleton = true
  for update;
  if not found then
    raise exception 'Platform settings are not initialized';
  end if;

  select u.email::text into current_actor_email
  from auth.users u
  where u.id = auth.uid();

  if current_settings.default_platform_fee_percent is distinct from p_default_platform_fee_percent
    or current_settings.booking_deposit_percent is distinct from p_booking_deposit_percent
    or current_settings.maintenance_mode is distinct from p_maintenance_mode then
    update public.platform_settings s
    set default_platform_fee_percent = p_default_platform_fee_percent,
        booking_deposit_percent = p_booking_deposit_percent,
        maintenance_mode = p_maintenance_mode,
        updated_at = now(),
        updated_by = auth.uid()
    where s.singleton = true
    returning s.* into updated_settings;

    insert into public.platform_audit_logs (
      event_type, actor_id, actor_email, entity_type, entity_id, summary, details
    ) values (
      'platform_settings_updated',
      auth.uid(),
      coalesce(current_actor_email, 'Unknown admin'),
      'platform_settings',
      'global',
      'Updated platform-wide settings.',
      jsonb_build_object(
        'before', jsonb_build_object(
          'default_platform_fee_percent', current_settings.default_platform_fee_percent,
          'booking_deposit_percent', current_settings.booking_deposit_percent,
          'maintenance_mode', current_settings.maintenance_mode
        ),
        'after', jsonb_build_object(
          'default_platform_fee_percent', updated_settings.default_platform_fee_percent,
          'booking_deposit_percent', updated_settings.booking_deposit_percent,
          'maintenance_mode', updated_settings.maintenance_mode
        )
      )
    );
  else
    updated_settings := current_settings;
  end if;

  return query
  select updated_settings.default_platform_fee_percent,
    updated_settings.booking_deposit_percent,
    updated_settings.maintenance_mode,
    updated_settings.updated_at,
    current_actor_email;
end;
$$;

create or replace function public.admin_list_audit_logs(
  p_limit integer default 50,
  p_offset integer default 0,
  p_event_type text default null,
  p_search text default null
)
returns table (
  log_id bigint,
  event_type text,
  actor_email text,
  entity_type text,
  entity_id text,
  summary text,
  details jsonb,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid()
      and pa.role in ('superadmin', 'auditor')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100
    or p_offset is null or p_offset < 0 then
    raise exception 'Invalid audit log page';
  end if;

  return query
  select l.id, l.event_type, l.actor_email, l.entity_type, l.entity_id,
    l.summary, l.details, l.created_at, count(*) over()::bigint
  from public.platform_audit_logs l
  where (p_event_type is null or p_event_type = 'all' or l.event_type = p_event_type)
    and (
      nullif(btrim(p_search), '') is null
      or l.summary ilike '%' || btrim(p_search) || '%'
      or l.actor_email ilike '%' || btrim(p_search) || '%'
      or l.entity_id ilike '%' || btrim(p_search) || '%'
      or l.details::text ilike '%' || btrim(p_search) || '%'
    )
  order by l.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

create or replace function public.admin_daily_activity()
returns table (
  activity_date date,
  paid_bookings bigint,
  paid_deposits_kobo bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid()
      and pa.role in ('superadmin', 'finance', 'operations', 'support', 'auditor')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select days.activity_date::date,
    count(a.id) filter (where a.payment_status = 'paid')::bigint,
    coalesce(sum(a.deposit_paid_kobo) filter (where a.payment_status = 'paid'), 0)::bigint
  from generate_series(current_date - 13, current_date, interval '1 day') as days(activity_date)
  left join public.appointments a on a.appointment_date = days.activity_date::date
  group by days.activity_date
  order by days.activity_date;
end;
$$;

revoke all on function public.admin_get_platform_settings() from public, anon;
grant execute on function public.admin_get_platform_settings() to authenticated;
revoke all on function public.admin_update_platform_settings(numeric, numeric, boolean) from public, anon;
grant execute on function public.admin_update_platform_settings(numeric, numeric, boolean) to authenticated;
revoke all on function public.admin_list_audit_logs(integer, integer, text, text) from public, anon;
grant execute on function public.admin_list_audit_logs(integer, integer, text, text) to authenticated;
revoke all on function public.admin_daily_activity() from public, anon;
grant execute on function public.admin_daily_activity() to authenticated;
revoke all on function public.admin_update_studio_fees(text, numeric, numeric, text) from public, anon;
grant execute on function public.admin_update_studio_fees(text, numeric, numeric, text) to authenticated;

drop function if exists public.admin_list_studios();

create or replace function public.admin_list_studios()
returns table (
  business_id text,
  slug text,
  business_name text,
  owner_name text,
  email text,
  phone text,
  location text,
  paystack_subaccount_code text,
  settlement_bank text,
  account_number text,
  account_name text,
  fee_share_percent numeric,
  platform_fee_percent numeric,
  fee_bearer text,
  appointment_count bigint,
  gross_volume numeric
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.platform_admins pa
    where pa.id = auth.uid() and pa.role = 'superadmin'
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    b.business_id,
    b.slug,
    b.business_name,
    b.owner_name,
    b.email,
    b.phone,
    b.location,
    b.paystack_subaccount_code,
    b.settlement_bank,
    b.account_number,
    b.account_name,
    b.fee_share_percent,
    b.platform_fee_percent,
    b.fee_bearer,
    coalesce(ap.appointment_count, 0)::bigint,
    coalesce(ap.gross_volume, 0)::numeric
  from public.businesses b
  left join (
    select
      a.business_id,
      count(*)::bigint as appointment_count,
      coalesce(sum(a.amount) filter (where a.payment_status = 'paid'), 0)::numeric as gross_volume
    from public.appointments a
    group by a.business_id
  ) ap on ap.business_id = b.business_id
  order by b.created_at desc;
end;
$$;

create or replace function public.admin_update_studio_fees(
  p_business_id text,
  p_fee_share_percent numeric,
  p_platform_fee_percent numeric,
  p_fee_bearer text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_settings public.businesses%rowtype;
  current_actor_email text;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.platform_admins pa
    where pa.id = auth.uid() and pa.role = 'superadmin'
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_fee_share_percent is null or p_platform_fee_percent is null or p_fee_bearer is null
    or p_fee_share_percent < 0 or p_fee_share_percent > 100
    or p_platform_fee_percent < 0 or p_platform_fee_percent > 100
    or p_fee_share_percent + p_platform_fee_percent <> 100
    or p_fee_bearer not in ('subaccount', 'account') then
    raise exception 'Invalid fee configuration';
  end if;

  select b.* into previous_settings
  from public.businesses b
  where b.business_id = p_business_id
  for update;
  if not found then
    raise exception 'Studio not found';
  end if;
  if previous_settings.fee_share_percent is not distinct from p_fee_share_percent
    and previous_settings.platform_fee_percent is not distinct from p_platform_fee_percent
    and previous_settings.fee_bearer is not distinct from p_fee_bearer then
    return;
  end if;

  select u.email::text into current_actor_email
  from auth.users u
  where u.id = auth.uid();

  update public.businesses
  set
    fee_share_percent = p_fee_share_percent,
    platform_fee_percent = p_platform_fee_percent,
    fee_bearer = p_fee_bearer,
    updated_at = now()
  where business_id = p_business_id;

  insert into public.platform_audit_logs (
    event_type, actor_id, actor_email, entity_type, entity_id, summary, details
  ) values (
    'studio_fee_configuration_updated',
    auth.uid(),
    coalesce(current_actor_email, 'Unknown admin'),
    'business',
    p_business_id,
    'Updated payout fee configuration for ' || previous_settings.business_name || '.',
    jsonb_build_object(
      'before', jsonb_build_object(
        'fee_share_percent', previous_settings.fee_share_percent,
        'platform_fee_percent', previous_settings.platform_fee_percent,
        'fee_bearer', previous_settings.fee_bearer
      ),
      'after', jsonb_build_object(
        'fee_share_percent', p_fee_share_percent,
        'platform_fee_percent', p_platform_fee_percent,
        'fee_bearer', p_fee_bearer
      )
    )
  );
end;
$$;

revoke all on function public.admin_list_studios() from public, anon;
grant execute on function public.admin_list_studios() to authenticated;
revoke all on function public.admin_update_studio_fees(text, numeric, numeric, text) from public, anon;
grant execute on function public.admin_update_studio_fees(text, numeric, numeric, text) to authenticated;

create index if not exists admin_notifications_created_at_idx
  on public.admin_notifications (created_at desc);

alter table public.admin_notifications enable row level security;
grant select, update on public.admin_notifications to authenticated;

drop policy if exists "Superadmins can read admin notifications" on public.admin_notifications;
create policy "Superadmins can read admin notifications"
  on public.admin_notifications for select
  to authenticated
  using (exists (
    select 1
    from public.platform_admins pa
    where pa.id = (select auth.uid()) and pa.role = 'superadmin'
  ));

drop policy if exists "Superadmins can mark admin notifications read" on public.admin_notifications;
create policy "Superadmins can mark admin notifications read"
  on public.admin_notifications for update
  to authenticated
  using (exists (
    select 1
    from public.platform_admins pa
    where pa.id = (select auth.uid()) and pa.role = 'superadmin'
  ))
  with check (exists (
    select 1
    from public.platform_admins pa
    where pa.id = (select auth.uid()) and pa.role = 'superadmin'
  ));

create or replace function public.log_admin_business_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_notifications (
    event_type, title, message, business_id, related_id
  ) values (
    'business_signup',
    'New business owner signup',
    new.business_name || ' joined Booka.',
    new.business_id,
    new.business_id
  );
  return new;
end;
$$;

drop trigger if exists businesses_admin_signup_notification on public.businesses;
create trigger businesses_admin_signup_notification
  after insert on public.businesses
  for each row execute function public.log_admin_business_signup();

create or replace function public.log_admin_booking_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  business_name_value text;
begin
  if new.payment_status = 'paid'
    and (tg_op = 'INSERT' or old.payment_status is distinct from 'paid') then
    select b.business_name into business_name_value
    from public.businesses b
    where b.business_id = new.business_id;

    insert into public.admin_notifications (
      event_type, title, message, business_id, related_id
    ) values (
      'booking_payment',
      'Booking payment received',
      'A booking deposit of ₦' ||
        to_char(coalesce(new.deposit_paid_kobo, 0)::numeric / 100, 'FM999,999,999,990.00') ||
        ' was paid at ' || coalesce(business_name_value, 'a Booka business') || '.',
      new.business_id,
      coalesce(new.paystack_reference, new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_admin_payment_notification on public.appointments;
create trigger appointments_admin_payment_notification
  after insert or update of payment_status on public.appointments
  for each row execute function public.log_admin_booking_payment();

create or replace function public.admin_overview_stats(p_since date default null)
returns table (
  registered_businesses bigint,
  pending_payout_setup bigint,
  booking_count bigint,
  paid_booking_count bigint,
  paid_deposits_kobo bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid()
      and pa.role in ('superadmin', 'finance', 'operations', 'support', 'auditor')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.businesses)::bigint,
    (select count(*) from public.businesses b
      where nullif(b.paystack_subaccount_code, '') is null
        or nullif(b.settlement_bank, '') is null
        or nullif(b.account_number, '') is null)::bigint,
    count(a.id)::bigint,
    count(a.id) filter (where a.payment_status = 'paid')::bigint,
    coalesce(sum(a.deposit_paid_kobo) filter (where a.payment_status = 'paid'), 0)::bigint
  from public.appointments a
  where p_since is null or a.appointment_date >= p_since;
end;
$$;

create or replace function public.admin_list_bookings(p_limit integer default 100)
returns table (
  booking_id text,
  paystack_reference text,
  business_name text,
  client_name text,
  amount integer,
  deposit_paid_kobo integer,
  payment_status text,
  booking_status text,
  appointment_date date,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid()
      and pa.role in ('superadmin', 'finance', 'operations', 'support')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'Invalid booking limit';
  end if;

  return query
  select
    a.id,
    a.paystack_reference,
    b.business_name,
    a.client_name,
    a.amount,
    a.deposit_paid_kobo,
    a.payment_status,
    a.status,
    a.appointment_date,
    a.created_at
  from public.appointments a
  join public.businesses b on b.business_id = a.business_id
  order by a.created_at desc
  limit p_limit;
end;
$$;

revoke all on function public.admin_overview_stats(date) from public, anon;
grant execute on function public.admin_overview_stats(date) to authenticated;
revoke all on function public.admin_list_bookings(integer) from public, anon;
grant execute on function public.admin_list_bookings(integer) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'admin_notifications'
    ) then
    alter publication supabase_realtime add table public.admin_notifications;
  end if;
end;
$$;

-- =========================================================================
-- PHASE 1: BACKOFFICE OPERATIONS
-- =========================================================================

alter table public.platform_admins
  add column if not exists last_seen_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.platform_admins
  drop constraint if exists platform_admins_role_check;
alter table public.platform_admins
  add constraint platform_admins_role_check
  check (role in ('superadmin', 'finance', 'operations', 'support', 'auditor'));

alter table public.businesses
  add column if not exists lifecycle_status text not null default 'active'
    check (lifecycle_status in ('active', 'suspended')),
  add column if not exists suspension_reason text,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references auth.users(id) on delete set null,
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending', 'under_review', 'verified', 'rejected')),
  add column if not exists verification_note text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null;

alter table public.appointments
  add column if not exists payment_outcome text not null default 'normal'
    check (payment_outcome in ('normal', 'refund_pending', 'refunded', 'disputed', 'chargeback')),
  add column if not exists payment_outcome_note text,
  add column if not exists payment_outcome_updated_at timestamptz,
  add column if not exists payment_outcome_updated_by uuid references auth.users(id) on delete set null;

create table if not exists public.platform_payout_records (
  id bigint generated always as identity primary key,
  business_id text not null references public.businesses(business_id) on delete cascade,
  paystack_transfer_code text,
  paystack_reference text,
  amount_kobo integer not null check (amount_kobo >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'successful', 'failed', 'reversed')),
  failure_reason text,
  initiated_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_payout_records_business_idx
  on public.platform_payout_records (business_id, initiated_at desc);
create index if not exists platform_payout_records_status_idx
  on public.platform_payout_records (status, initiated_at desc);
create unique index if not exists platform_payout_records_transfer_code_uidx
  on public.platform_payout_records (paystack_transfer_code)
  where paystack_transfer_code is not null;
alter table public.platform_payout_records enable row level security;

drop function if exists public.admin_list_studios();

create or replace function public.admin_list_studios()
returns table (
  business_id text,
  slug text,
  business_name text,
  owner_name text,
  email text,
  phone text,
  location text,
  paystack_subaccount_code text,
  settlement_bank text,
  account_number text,
  account_name text,
  fee_share_percent numeric,
  platform_fee_percent numeric,
  fee_bearer text,
  lifecycle_status text,
  suspension_reason text,
  suspended_at timestamptz,
  verification_status text,
  verification_note text,
  verified_at timestamptz,
  appointment_count bigint,
  gross_volume numeric
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid() and pa.role in ('superadmin', 'operations', 'finance', 'support')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select b.business_id, b.slug, b.business_name, b.owner_name, b.email, b.phone,
    b.location, b.paystack_subaccount_code, b.settlement_bank, b.account_number,
    b.account_name, b.fee_share_percent, b.platform_fee_percent, b.fee_bearer,
    b.lifecycle_status, b.suspension_reason, b.suspended_at, b.verification_status,
    b.verification_note, b.verified_at,
    coalesce(ap.appointment_count, 0)::bigint,
    coalesce(ap.gross_volume, 0)::numeric
  from public.businesses b
  left join (
    select a.business_id, count(*)::bigint appointment_count,
      coalesce(sum(a.amount) filter (where a.payment_status = 'paid'), 0)::numeric gross_volume
    from public.appointments a group by a.business_id
  ) ap on ap.business_id = b.business_id
  order by b.created_at desc;
end;
$$;

create or replace function public.admin_set_studio_lifecycle(
  p_business_id text,
  p_lifecycle_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row public.businesses%rowtype;
  actor_email text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid() and pa.role in ('superadmin', 'operations')
  ) then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_lifecycle_status not in ('active', 'suspended') then
    raise exception 'Invalid lifecycle status';
  end if;
  select b.* into before_row from public.businesses b where b.business_id = p_business_id for update;
  if not found then raise exception 'Studio not found'; end if;
  if p_lifecycle_status = 'suspended' and nullif(btrim(coalesce(p_reason,'')), '') is null then
    raise exception 'A suspension reason is required';
  end if;

  select u.email::text into actor_email from auth.users u where u.id = auth.uid();
  update public.businesses set
    lifecycle_status = p_lifecycle_status,
    suspension_reason = case when p_lifecycle_status = 'suspended' then btrim(p_reason) else null end,
    suspended_at = case when p_lifecycle_status = 'suspended' then now() else null end,
    suspended_by = case when p_lifecycle_status = 'suspended' then auth.uid() else null end,
    updated_at = now()
  where business_id = p_business_id;

  insert into public.platform_audit_logs(event_type, actor_id, actor_email, entity_type, entity_id, summary, details)
  values (
    'studio_lifecycle_updated', auth.uid(), coalesce(actor_email, 'Unknown admin'), 'business', p_business_id,
    initcap(p_lifecycle_status) || ' studio ' || before_row.business_name || '.',
    jsonb_build_object('before', before_row.lifecycle_status, 'after', p_lifecycle_status, 'reason', p_reason)
  );
end;
$$;

create or replace function public.admin_set_studio_verification(
  p_business_id text,
  p_verification_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare before_row public.businesses%rowtype; actor_email text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid() and pa.role in ('superadmin', 'operations', 'support')
  ) then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_verification_status not in ('pending', 'under_review', 'verified', 'rejected') then
    raise exception 'Invalid verification status';
  end if;
  select b.* into before_row from public.businesses b where b.business_id = p_business_id for update;
  if not found then raise exception 'Studio not found'; end if;
  select u.email::text into actor_email from auth.users u where u.id = auth.uid();
  update public.businesses set
    verification_status = p_verification_status,
    verification_note = nullif(btrim(coalesce(p_note,'')), ''),
    verified_at = case when p_verification_status = 'verified' then now() else null end,
    verified_by = case when p_verification_status = 'verified' then auth.uid() else null end,
    updated_at = now()
  where business_id = p_business_id;
  insert into public.platform_audit_logs(event_type, actor_id, actor_email, entity_type, entity_id, summary, details)
  values (
    'studio_verification_updated', auth.uid(), coalesce(actor_email, 'Unknown admin'), 'business', p_business_id,
    'Changed verification status for ' || before_row.business_name || ' to ' || p_verification_status || '.',
    jsonb_build_object('before', before_row.verification_status, 'after', p_verification_status, 'note', p_note)
  );
end;
$$;

create or replace function public.admin_search_bookings(
  p_search text default null,
  p_payment_status text default 'all',
  p_outcome text default 'all',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  booking_id text, paystack_reference text, business_id text, business_name text,
  client_name text, client_email text, client_phone text, amount integer,
  deposit_paid_kobo integer, payment_status text, payment_outcome text,
  payment_outcome_note text, booking_status text, appointment_date date,
  created_at timestamptz, total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid() and pa.role in ('superadmin', 'finance', 'operations', 'support')
  ) then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 then
    raise exception 'Invalid booking page';
  end if;
  return query
  select a.id, a.paystack_reference, b.business_id, b.business_name, a.client_name,
    a.client_email, a.client_phone, a.amount, a.deposit_paid_kobo, a.payment_status,
    a.payment_outcome, a.payment_outcome_note, a.status, a.appointment_date, a.created_at,
    count(*) over()::bigint
  from public.appointments a join public.businesses b on b.business_id = a.business_id
  where (p_payment_status = 'all' or a.payment_status = p_payment_status)
    and (p_outcome = 'all' or a.payment_outcome = p_outcome)
    and (nullif(btrim(p_search), '') is null or
      a.id ilike '%' || btrim(p_search) || '%' or
      coalesce(a.paystack_reference,'') ilike '%' || btrim(p_search) || '%' or
      b.business_name ilike '%' || btrim(p_search) || '%' or
      a.client_name ilike '%' || btrim(p_search) || '%' or
      coalesce(a.client_email,'') ilike '%' || btrim(p_search) || '%' or
      a.client_phone ilike '%' || btrim(p_search) || '%')
  order by a.created_at desc limit p_limit offset p_offset;
end;
$$;

create or replace function public.admin_update_payment_outcome(
  p_booking_id text,
  p_outcome text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare before_row public.appointments%rowtype; actor_email text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid() and pa.role in ('superadmin', 'finance', 'operations')
  ) then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_outcome not in ('normal', 'refund_pending', 'refunded', 'disputed', 'chargeback') then
    raise exception 'Invalid payment outcome';
  end if;
  select a.* into before_row from public.appointments a where a.id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  select u.email::text into actor_email from auth.users u where u.id = auth.uid();
  update public.appointments set payment_outcome = p_outcome,
    payment_outcome_note = nullif(btrim(coalesce(p_note,'')), ''),
    payment_outcome_updated_at = now(), payment_outcome_updated_by = auth.uid()
  where id = p_booking_id;
  insert into public.platform_audit_logs(event_type, actor_id, actor_email, entity_type, entity_id, summary, details)
  values (
    'payment_outcome_updated', auth.uid(), coalesce(actor_email, 'Unknown admin'), 'booking', p_booking_id,
    'Changed payment outcome to ' || p_outcome || '.',
    jsonb_build_object('before', before_row.payment_outcome, 'after', p_outcome, 'note', p_note)
  );
end;
$$;

create or replace function public.admin_list_platform_admins()
returns table (
  admin_id uuid, email text, role text, requires_2fa boolean,
  last_seen_at timestamptz, created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid() and pa.role = 'superadmin'
  ) then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query select pa.id, pa.email, pa.role, pa.requires_2fa, pa.last_seen_at, pa.created_at
    from public.platform_admins pa order by pa.created_at desc;
end;
$$;

create or replace function public.admin_set_platform_admin_role(
  p_admin_id uuid,
  p_role text,
  p_requires_2fa boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare before_row public.platform_admins%rowtype; actor_email text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa where pa.id = auth.uid() and pa.role = 'superadmin'
  ) then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_admin_id = auth.uid() then raise exception 'You cannot change your own admin role'; end if;
  if p_role not in ('superadmin', 'finance', 'operations', 'support', 'auditor') then
    raise exception 'Invalid admin role';
  end if;
  select pa.* into before_row from public.platform_admins pa where pa.id = p_admin_id for update;
  if not found then raise exception 'Admin not found'; end if;
  select u.email::text into actor_email from auth.users u where u.id = auth.uid();
  update public.platform_admins set role = p_role, requires_2fa = p_requires_2fa, updated_at = now()
  where id = p_admin_id;
  insert into public.platform_audit_logs(event_type, actor_id, actor_email, entity_type, entity_id, summary, details)
  values (
    'platform_admin_role_updated', auth.uid(), coalesce(actor_email, 'Unknown admin'), 'platform_admin', p_admin_id::text,
    'Changed admin role to ' || p_role || '.', jsonb_build_object('before', before_row.role, 'after', p_role)
  );
end;
$$;

create or replace function public.admin_list_payouts(p_status text default 'all')
returns table (
  payout_id bigint, business_id text, business_name text, paystack_transfer_code text,
  paystack_reference text, amount_kobo integer, status text, failure_reason text,
  initiated_at timestamptz, completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid() and pa.role in ('superadmin', 'finance', 'operations')
  ) then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query
  select p.id, p.business_id, b.business_name, p.paystack_transfer_code, p.paystack_reference,
    p.amount_kobo, p.status, p.failure_reason, p.initiated_at, p.completed_at
  from public.platform_payout_records p join public.businesses b on b.business_id = p.business_id
  where p_status = 'all' or p.status = p_status
  order by p.initiated_at desc;
end;
$$;

revoke all on function public.admin_list_studios() from public, anon;
grant execute on function public.admin_list_studios() to authenticated;
revoke all on function public.admin_set_studio_lifecycle(text, text, text) from public, anon;
grant execute on function public.admin_set_studio_lifecycle(text, text, text) to authenticated;
revoke all on function public.admin_set_studio_verification(text, text, text) from public, anon;
grant execute on function public.admin_set_studio_verification(text, text, text) to authenticated;
revoke all on function public.admin_search_bookings(text, text, text, integer, integer) from public, anon;
grant execute on function public.admin_search_bookings(text, text, text, integer, integer) to authenticated;
revoke all on function public.admin_update_payment_outcome(text, text, text) from public, anon;
grant execute on function public.admin_update_payment_outcome(text, text, text) to authenticated;
revoke all on function public.admin_list_platform_admins() from public, anon;
grant execute on function public.admin_list_platform_admins() to authenticated;
revoke all on function public.admin_set_platform_admin_role(uuid, text, boolean) from public, anon;
grant execute on function public.admin_set_platform_admin_role(uuid, text, boolean) to authenticated;
revoke all on function public.admin_list_payouts(text) from public, anon;
grant execute on function public.admin_list_payouts(text) to authenticated;

create or replace function public.admin_update_payout(
  p_payout_id bigint,
  p_status text,
  p_failure_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare before_row public.platform_payout_records%rowtype; actor_email text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid() and pa.role in ('superadmin', 'finance')
  ) then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_status not in ('pending', 'processing', 'successful', 'failed', 'reversed') then
    raise exception 'Invalid payout status';
  end if;
  select p.* into before_row from public.platform_payout_records p where p.id = p_payout_id for update;
  if not found then raise exception 'Payout record not found'; end if;
  select u.email::text into actor_email from auth.users u where u.id = auth.uid();
  update public.platform_payout_records set
    status = p_status,
    failure_reason = nullif(btrim(coalesce(p_failure_reason,'')), ''),
    completed_at = case when p_status in ('successful','failed','reversed') then now() else null end,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_payout_id;
  insert into public.platform_audit_logs(event_type, actor_id, actor_email, entity_type, entity_id, summary, details)
  values (
    'payout_status_updated', auth.uid(), coalesce(actor_email, 'Unknown admin'), 'payout', p_payout_id::text,
    'Changed payout status to ' || p_status || '.', 
    jsonb_build_object('before', before_row.status, 'after', p_status, 'failure_reason', p_failure_reason)
  );
end;
$$;

revoke all on function public.admin_update_payout(bigint, text, text) from public, anon;
grant execute on function public.admin_update_payout(bigint, text, text) to authenticated;

create table if not exists public.platform_refund_records (
  id bigint generated always as identity primary key,
  booking_id text not null,
  paystack_reference text not null,
  paystack_refund_reference text,
  amount_kobo integer not null check (amount_kobo >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'successful', 'failed', 'reversed')),
  failure_reason text,
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists platform_refund_records_paystack_ref_idx
  on public.platform_refund_records (paystack_refund_reference)
  where paystack_refund_reference is not null;
create index if not exists platform_refund_records_booking_idx
  on public.platform_refund_records (booking_id, requested_at desc);
alter table public.platform_refund_records enable row level security;

create table if not exists public.platform_webhook_events (
  event_id text primary key,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

alter table public.platform_webhook_events enable row level security;
revoke all on public.platform_webhook_events from public, anon, authenticated;
grant all on public.platform_webhook_events to service_role;

create or replace function public.admin_get_refund_booking(p_booking_id text)
returns table (
  booking_id text,
  business_id text,
  business_name text,
  paystack_reference text,
  amount_kobo integer,
  payment_status text,
  payment_outcome text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa
    where pa.id = auth.uid()
      and pa.role in ('superadmin', 'finance', 'operations')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select a.id, b.business_id, b.business_name, a.paystack_reference,
    a.deposit_paid_kobo, a.payment_status, a.payment_outcome
  from public.appointments a
  join public.businesses b on b.business_id = a.business_id
  where a.id = p_booking_id
    and a.payment_status = 'paid'
    and nullif(a.paystack_reference, '') is not null;
end;
$$;

revoke all on function public.admin_get_refund_booking(text) from public, anon;
grant execute on function public.admin_get_refund_booking(text) to authenticated;
