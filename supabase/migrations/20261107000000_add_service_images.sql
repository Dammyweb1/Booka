alter table public.services
  add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-images',
  'service-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view service images" on storage.objects;
create policy "Anyone can view service images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'service-images');

drop policy if exists "Business owners can upload service images" on storage.objects;
create policy "Business owners can upload service images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'service-images'
    and exists (
      select 1
      from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Business owners can update service images" on storage.objects;
create policy "Business owners can update service images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'service-images'
    and exists (
      select 1
      from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'service-images'
    and exists (
      select 1
      from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Business owners can delete service images" on storage.objects;
create policy "Business owners can delete service images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'service-images'
    and exists (
      select 1
      from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = (select auth.uid())
    )
  );
