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
  add column if not exists is_active boolean not null default true;

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
  public.appointments, public.clients, public.notifications to authenticated;

alter table public.businesses enable row level security;
alter table public.services enable row level security;
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
        service_category := 'barbing'; service_price := 8500; service_duration := 45;
        service_color := 'bg-[#eee7ff]'; service_icon_color := 'text-[#7253cb]';
      when 'Spa' then
        service_category := 'spa'; service_price := 12000; service_duration := 60;
        service_color := 'bg-[#ffe7df]'; service_icon_color := 'text-[#d46b4f]';
      when 'Hair dressing' then
        service_category := 'hair'; service_price := 18500; service_duration := 90;
        service_color := 'bg-[#e7f2ea]'; service_icon_color := 'text-[#528361]';
      else
        service_category := 'general'; service_price := 10000; service_duration := 60;
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
      true
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
    ('Barbing', 'Sharp fades & clean cuts', 'barbing', 45, 8500, 'bg-[#eee7ff]', 'text-[#7253cb]'),
    ('Spa', 'Slow down & feel good', 'spa', 60, 12000, 'bg-[#ffe7df]', 'text-[#d46b4f]'),
    ('Hair dressing', 'Your look, your way', 'hair', 90, 18500, 'bg-[#e7f2ea]', 'text-[#528361]')
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
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid'));

create unique index if not exists appointments_paystack_reference_uidx
  on public.appointments (paystack_reference)
  where paystack_reference is not null;

create or replace function public.create_paid_public_booking(
  p_slug text,
  p_service_id text,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_client_notes text,
  p_appointment_date date,
  p_appointment_time text,
  p_paystack_reference text,
  p_deposit_paid_kobo integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  business_row public.businesses%rowtype;
  service_row public.services%rowtype;
  appointment_row public.appointments%rowtype;
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
    or trim(coalesce(p_paystack_reference, '')) = ''
    or length(p_paystack_reference) > 100
    or p_deposit_paid_kobo is null
    or p_deposit_paid_kobo <= 0
    or trim(coalesce(p_appointment_time, '')) not in (
      '09:00 AM', '10:15 AM', '11:30 AM', '01:00 PM',
      '02:30 PM', '03:45 PM', '05:00 PM', '06:15 PM', '07:30 PM'
    ) then
    raise exception 'Please provide valid paid booking details';
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
      'deposit_paid_kobo', appointment_row.deposit_paid_kobo
    );
  end if;

  select * into business_row
  from public.businesses b
  where b.slug = p_slug;
  if not found then
    raise exception 'Business not found';
  end if;
  if business_row.currency not like 'NGN%' then
    raise exception 'This business is not configured for NGN payments';
  end if;

  select * into service_row
  from public.services s
  where s.id = p_service_id and s.business_id = business_row.business_id;
  if not found then
    raise exception 'Service not found';
  end if;
  if p_deposit_paid_kobo <> service_row.price * 30 then
    raise exception 'The payment amount does not match the service deposit';
  end if;

  insert into public.appointments (
    id, business_id, client_name, client_email, client_phone, client_notes,
    service_id, service_name, appointment_time, appointment_date, amount, status,
    paystack_reference, deposit_paid_kobo, payment_status
  ) values (
    'BK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
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
      'deposit_paid_kobo', appointment_row.deposit_paid_kobo
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
    trim(p_client_name) || ' booked ' || service_row.name || ' and paid the 30% deposit.',
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
    'deposit_paid_kobo', appointment_row.deposit_paid_kobo
  );
end;
$$;



drop trigger if exists create_business_after_signup on auth.users;
create trigger create_business_after_signup
  after insert on auth.users
  for each row execute function public.create_business_for_new_user();

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
  case selected.name when 'Barbing' then 8500 when 'Spa' then 12000 when 'Hair dressing' then 18500 else 10000 end,
  case selected.name when 'Barbing' then 'bg-[#eee7ff]' when 'Spa' then 'bg-[#ffe7df]' when 'Hair dressing' then 'bg-[#e7f2ea]' else 'bg-[#f0ded4]' end,
  case selected.name when 'Barbing' then 'text-[#7253cb]' when 'Spa' then 'text-[#d46b4f]' when 'Hair dressing' then 'text-[#528361]' else 'text-[#9e503b]' end,
  true
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
  ('Barbing', 'Sharp fades & clean cuts', 'barbing', 45, 8500, 'bg-[#eee7ff]', 'text-[#7253cb]'),
  ('Spa', 'Slow down & feel good', 'spa', 60, 12000, 'bg-[#ffe7df]', 'text-[#d46b4f]'),
  ('Hair dressing', 'Your look, your way', 'hair', 90, 18500, 'bg-[#e7f2ea]', 'text-[#528361]')
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
        'is_active', s.is_active
      ) order by s.created_at)
      from public.services s
      where s.business_id = b.business_id and s.is_active
    ), '[]'::jsonb)
  )
  from public.businesses b
  where b.slug = p_slug;
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
  where b.slug = p_slug;
  if not found then
    raise exception 'Business not found';
  end if;

  select * into service_row
  from public.services s
  where s.id = p_service_id and s.business_id = business_row.business_id and s.is_active;
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
  text, text, text, text, text, text, date, text, text, integer
) from public, anon, authenticated;
grant execute on function public.create_paid_public_booking(
  text, text, text, text, text, text, date, text, text, integer
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
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clients') then
      alter publication supabase_realtime add table public.clients;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end;
$$;
