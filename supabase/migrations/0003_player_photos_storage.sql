insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', true)
on conflict (id) do nothing;

-- Convenção de path: player-photos/{owner_id}/{arquivo}
create policy "player_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'player-photos');

create policy "player_photos_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "player_photos_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "player_photos_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
