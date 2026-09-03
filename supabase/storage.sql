-- Storage bucket for organization files. Apply in the Supabase SQL editor or CLI.

insert into storage.buckets (id, name, public)
values ('organization-files', 'organization-files', false)
on conflict (id) do nothing;

drop policy if exists "org members can read files" on storage.objects;
create policy "org members can read files"
on storage.objects for select
using (
  bucket_id = 'organization-files'
  and public.is_member_of((storage.foldername(name))[1]::uuid)
);

drop policy if exists "org members can upload files" on storage.objects;
create policy "org members can upload files"
on storage.objects for insert
with check (
  bucket_id = 'organization-files'
  and public.is_member_of((storage.foldername(name))[1]::uuid)
);
