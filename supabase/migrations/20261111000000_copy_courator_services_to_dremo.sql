-- Replace Dremo Barbing's active public menu with Courator Barbing's cards.
-- Existing Dremo services are kept inactive so their booking references remain intact.
do $$
declare
  source_business_id uuid;
  target_business_id uuid;
  source_service_count integer;
begin
  select id into source_business_id
  from public.businesses
  where slug = 'courator-barbing';

  select id into target_business_id
  from public.businesses
  where slug = 'dremo-barbing';

  if source_business_id is null or target_business_id is null then
    raise exception 'Could not find both Courator Barbing and Dremo Barbing businesses.';
  end if;

  select count(*) into source_service_count
  from public.services
  where business_id = source_business_id
    and active
    and image_path is not null;

  if source_service_count != 3 then
    raise exception 'Expected exactly 3 active Courator Barbing services with images; found %.', source_service_count;
  end if;

  update public.services
  set active = false
  where business_id = target_business_id;

  insert into public.services (
    business_id,
    name,
    duration_minutes,
    price_naira,
    tone,
    active,
    image_path,
    created_at
  )
  select
    target_business_id,
    source.name,
    source.duration_minutes,
    source.price_naira,
    source.tone,
    true,
    source.image_path,
    source.created_at
  from public.services as source
  where source.business_id = source_business_id
    and source.active
    and source.image_path is not null
  order by source.created_at, source.id
  on conflict (business_id, name) do update
  set duration_minutes = excluded.duration_minutes,
      price_naira = excluded.price_naira,
      tone = excluded.tone,
      active = true,
      image_path = excluded.image_path,
      created_at = excluded.created_at;
end;
$$;
