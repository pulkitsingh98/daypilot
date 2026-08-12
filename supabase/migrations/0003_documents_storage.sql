-- ============================================================================
-- 'documents' storage bucket — private, backs the documents table's
-- storage_path column. Files are stored at "{user_id}/{filename}", and RLS
-- on storage.objects uses that folder prefix to scope access to the owner,
-- the same convention Supabase's own docs use for private per-user buckets.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_bucket_owner_access" on storage.objects;
create policy "documents_bucket_owner_access" on storage.objects
  for all
  using (
    bucket_id = 'documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
