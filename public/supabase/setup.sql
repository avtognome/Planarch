-- Run once in your Supabase project's SQL Editor. No paid plan is needed.
create table if not exists public.wayfinder_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key like 'wf-%' and length(key) <= 2048),
  json text,
  path text,
  revision bigint not null check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, key),
  constraint wayfinder_payload check (
    (json is not null and path is null and octet_length(json) <= 120000)
    or (json is null and path is not null and path like 'users/' || user_id::text || '/%')
  )
);
alter table public.wayfinder_records enable row level security;
revoke all on public.wayfinder_records from anon;
grant select, insert, update, delete on public.wayfinder_records to authenticated;
drop policy if exists wayfinder_private_records on public.wayfinder_records;
create policy wayfinder_private_records on public.wayfinder_records for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Atomic compare-and-save: conflicting revisions never overwrite another device.
create or replace function public.wayfinder_write_record(
  p_key text, p_json text, p_path text, p_expected_revision bigint
) returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  current_user_id uuid := auth.uid();
  current_record public.wayfinder_records%rowtype;
  found_record boolean;
begin
  if current_user_id is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_expected_revision < 0 or p_key is null or p_key not like 'wf-%' then raise exception 'Invalid record'; end if;
  if p_json is not null then perform p_json::jsonb; end if;
  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || '|' || p_key, 0));
  select * into current_record from public.wayfinder_records where user_id = current_user_id and key = p_key;
  found_record := found;
  if (found_record and current_record.revision != p_expected_revision) or (not found_record and p_expected_revision != 0) then
    return jsonb_build_object('ok', false, 'row', case when found_record then to_jsonb(current_record) else null end);
  end if;
  insert into public.wayfinder_records(user_id,key,json,path,revision,updated_at)
  values(current_user_id,p_key,p_json,p_path,p_expected_revision + 1,now())
  on conflict(user_id,key) do update set json=excluded.json,path=excluded.path,revision=excluded.revision,updated_at=excluded.updated_at
  returning * into current_record;
  return jsonb_build_object('ok', true, 'revision', current_record.revision);
end;
$$;
revoke all on function public.wayfinder_write_record(text,text,text,bigint) from public, anon;
grant execute on function public.wayfinder_write_record(text,text,text,bigint) to authenticated;

-- Live updates; repeatable if the table was already added.
do $$ begin
  if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='wayfinder_records') then
    alter publication supabase_realtime add table public.wayfinder_records;
  end if;
end $$;

-- Private, owner-scoped file storage. Every uploaded part is under 8 MiB.
insert into storage.buckets(id,name,public,file_size_limit)
values('wayfinder-private','wayfinder-private',false,50000000)
on conflict(id) do update set public=false,file_size_limit=50000000;
drop policy if exists wayfinder_private_files_read on storage.objects;
drop policy if exists wayfinder_private_files_insert on storage.objects;
drop policy if exists wayfinder_private_files_delete on storage.objects;
create policy wayfinder_private_files_read on storage.objects for select to authenticated
using(bucket_id='wayfinder-private' and (storage.foldername(name))[1]='users' and (storage.foldername(name))[2]=(select auth.uid())::text);
create policy wayfinder_private_files_insert on storage.objects for insert to authenticated
with check(bucket_id='wayfinder-private' and (storage.foldername(name))[1]='users' and (storage.foldername(name))[2]=(select auth.uid())::text);
create policy wayfinder_private_files_delete on storage.objects for delete to authenticated
using(bucket_id='wayfinder-private' and (storage.foldername(name))[1]='users' and (storage.foldername(name))[2]=(select auth.uid())::text);
