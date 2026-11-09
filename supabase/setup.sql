-- Run once in your Supabase project's SQL Editor. No paid plan is needed.

-- Seamless upgrade if project previously used planarch_records or wayfinder_records:
do $$ begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'planarch_records')
     and not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'archeron_records') then
    alter table public.planarch_records rename to archeron_records;
  elsif exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'wayfinder_records')
     and not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'archeron_records') then
    alter table public.wayfinder_records rename to archeron_records;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'planarch_records')
     and exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'archeron_records') then
    insert into public.archeron_records(user_id, key, json, path, revision, updated_at)
    select user_id, key, json, path, revision, updated_at from public.planarch_records
    on conflict (user_id, key) do update set
      json = excluded.json,
      path = excluded.path,
      revision = excluded.revision,
      updated_at = excluded.updated_at
    where excluded.revision > archeron_records.revision;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'wayfinder_records')
     and exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'archeron_records') then
    insert into public.archeron_records(user_id, key, json, path, revision, updated_at)
    select user_id, key, json, path, revision, updated_at from public.wayfinder_records
    on conflict (user_id, key) do update set
      json = excluded.json,
      path = excluded.path,
      revision = excluded.revision,
      updated_at = excluded.updated_at
    where excluded.revision > archeron_records.revision;
  end if;
end $$;

create table if not exists public.archeron_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key like 'wf-%' and length(key) <= 2048),
  json text,
  path text,
  revision bigint not null check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, key),
  constraint archeron_payload check (
    (json is not null and path is null and octet_length(json) <= 120000)
    or (json is null and path is not null and path like 'users/' || user_id::text || '/%')
  )
);
alter table public.archeron_records enable row level security;
revoke all on public.archeron_records from anon;
grant select, insert, update, delete on public.archeron_records to authenticated;
drop policy if exists archeron_private_records on public.archeron_records;
drop policy if exists planarch_private_records on public.archeron_records;
create policy archeron_private_records on public.archeron_records for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Atomic compare-and-save: conflicting revisions never overwrite another device.
create or replace function public.archeron_write_record(
  p_key text, p_json text, p_path text, p_expected_revision bigint
) returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  current_user_id uuid := auth.uid();
  current_record public.archeron_records%rowtype;
  found_record boolean;
begin
  if current_user_id is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_expected_revision < 0 or p_key is null or p_key not like 'wf-%' then raise exception 'Invalid record'; end if;
  if p_json is not null then perform p_json::jsonb; end if;
  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || '|' || p_key, 0));
  select * into current_record from public.archeron_records where user_id = current_user_id and key = p_key;
  found_record := found;
  if (found_record and current_record.revision != p_expected_revision) or (not found_record and p_expected_revision != 0) then
    return jsonb_build_object('ok', false, 'row', case when found_record then to_jsonb(current_record) else null end);
  end if;
  insert into public.archeron_records(user_id,key,json,path,revision,updated_at)
  values(current_user_id,p_key,p_json,p_path,p_expected_revision + 1,now())
  on conflict(user_id,key) do update set json=excluded.json,path=excluded.path,revision=excluded.revision,updated_at=excluded.updated_at
  returning * into current_record;
  return jsonb_build_object('ok', true, 'revision', current_record.revision);
end;
$$;
revoke all on function public.archeron_write_record(text,text,text,bigint) from public, anon;
grant execute on function public.archeron_write_record(text,text,text,bigint) to authenticated;

-- Backwards-compatible aliases for existing setups
create or replace function public.planarch_write_record(
  p_key text, p_json text, p_path text, p_expected_revision bigint
) returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  return public.archeron_write_record(p_key, p_json, p_path, p_expected_revision);
end;
$$;
revoke all on function public.planarch_write_record(text,text,text,bigint) from public, anon;
grant execute on function public.planarch_write_record(text,text,text,bigint) to authenticated;

create or replace function public.wayfinder_write_record(
  p_key text, p_json text, p_path text, p_expected_revision bigint
) returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  return public.archeron_write_record(p_key, p_json, p_path, p_expected_revision);
end;
$$;
revoke all on function public.wayfinder_write_record(text,text,text,bigint) from public, anon;
grant execute on function public.wayfinder_write_record(text,text,text,bigint) to authenticated;

-- Live updates; repeatable if the table was already added.
do $$ begin
  if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='archeron_records') then
    alter publication supabase_realtime add table public.archeron_records;
  end if;
end $$;

-- Private, owner-scoped file storage.
insert into storage.buckets(id,name,public,file_size_limit)
values('archeron-private','archeron-private',false,50000000)
on conflict(id) do update set public=false,file_size_limit=50000000;
drop policy if exists archeron_private_files_read on storage.objects;
drop policy if exists archeron_private_files_insert on storage.objects;
drop policy if exists archeron_private_files_delete on storage.objects;
drop policy if exists planarch_private_files_read on storage.objects;
drop policy if exists planarch_private_files_insert on storage.objects;
drop policy if exists planarch_private_files_delete on storage.objects;
create policy archeron_private_files_read on storage.objects for select to authenticated
using(bucket_id in ('archeron-private', 'planarch-private', 'wayfinder-private') and (storage.foldername(name))[1]='users' and (storage.foldername(name))[2]=(select auth.uid())::text);
create policy archeron_private_files_insert on storage.objects for insert to authenticated
with check(bucket_id in ('archeron-private', 'planarch-private', 'wayfinder-private') and (storage.foldername(name))[1]='users' and (storage.foldername(name))[2]=(select auth.uid())::text);
create policy archeron_private_files_delete on storage.objects for delete to authenticated
using(bucket_id in ('archeron-private', 'planarch-private', 'wayfinder-private') and (storage.foldername(name))[1]='users' and (storage.foldername(name))[2]=(select auth.uid())::text);

-- Reload PostgREST schema cache immediately
notify pgrst, 'reload schema';
