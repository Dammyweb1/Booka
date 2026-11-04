drop policy if exists "Business owners can upload service images" on storage.objects;
create policy "Business owners can upload service images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Business owners can update service images" on storage.objects;
create policy "Business owners can update service images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Business owners can delete service images" on storage.objects;
create policy "Business owners can delete service images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
