-- Use the Courator Barbing public service cards as defaults for new businesses.
create or replace function public.seed_business_services()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.services (
    business_id,
    name,
    duration_minutes,
    price_naira,
    tone,
    image_path
  )
  values
    (new.id, 'Spa', 20, 15000, 'teal', '68c55238-cb59-4b46-b33c-d5f0ea7beabb/18a88a39-88ed-4cbe-bb8a-7f0270dbd26b.jpg'),
    (new.id, 'Barbing', 30, 8000, 'gold', '68c55238-cb59-4b46-b33c-d5f0ea7beabb/16261d19-8fa3-495d-98ad-21535180597b.jpg'),
    (new.id, 'Hairdressing', 30, 10000, 'rose', '68c55238-cb59-4b46-b33c-d5f0ea7beabb/8c050354-324b-4220-aca9-8360d0a35ab3.jpg')
  on conflict (business_id, name) do nothing;

  return new;
end;
$$;
