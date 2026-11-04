-- Paystack payment records for bookings made through public business pages.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  service_name text not null check (char_length(btrim(service_name)) between 2 and 120),
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 120),
  customer_email text not null check (char_length(customer_email) between 3 and 254),
  amount_naira integer not null check (amount_naira between 0 and 100000000),
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'initialized', 'success', 'failed', 'abandoned')),
  provider text not null default 'paystack' check (provider = 'paystack'),
  paystack_reference text not null unique,
  paystack_access_code text,
  authorization_url text,
  channel text,
  transaction_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_business_created_at_idx
  on public.payments (business_id, created_at desc);
create index if not exists payments_service_idx
  on public.payments (service_id);

alter table public.payments enable row level security;

revoke all on public.payments from anon;
revoke all on public.payments from authenticated;
grant select on public.payments to authenticated;

drop policy if exists "Owners view their payment records" on public.payments;
create policy "Owners view their payment records"
  on public.payments for select to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = public.payments.business_id and b.owner_id = (select auth.uid())
    )
  );

create or replace function public.set_payments_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_payments_updated_at() from public, anon, authenticated;

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute procedure public.set_payments_updated_at();

-- Public bookings now create an awaiting payment automatically. The owner
-- sees every attempt, paid and unpaid, in the Payments tab.
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
  service_name text;
  service_price integer;
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

  select business_id, active, name, price_naira
    into service_business_id, service_is_active, service_name, service_price
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

  insert into public.payments (
    booking_id,
    business_id,
    service_id,
    service_name,
    customer_name,
    customer_email,
    amount_naira,
    status,
    paystack_reference
  )
  values (
    new_booking_id,
    p_business_id,
    p_service_id,
    service_name,
    btrim(p_customer_name),
    lower(btrim(p_customer_email)),
    service_price,
    'awaiting_payment',
    'booka_' || replace(new_booking_id::text, '-', '')
  );

  return new_booking_id;
end;
$$;

revoke all on function public.create_public_booking(uuid, uuid, text, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.create_public_booking(uuid, uuid, text, text, text, timestamptz, text) to anon, authenticated;
