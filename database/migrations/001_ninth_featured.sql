-- القسم المميز للصف التاسع
-- الأمان: الجداول محمية بـ RLS ولا تكشف روابط Drive أو تجزئات الأكواد مباشرة.
-- لا تحفظ الأكواد بصيغتها النصية؛ تحفظ فقط بصيغة SHA-256 وتظهر مرة واحدة عند إنشائها.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;

do $$
begin
  create type public.ninth_code_scope as enum ('file', 'grade9');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.ninth_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.ninth_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  description text not null default '',
  icon_key text not null default 'book-open',
  color_from text not null default '#312E81',
  color_to text not null default '#4F46E5',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ninth_files (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.ninth_subjects(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text not null default '',
  cover_url text,
  drive_url text not null check (drive_url ~ '^https?://'),
  price numeric(12, 2) not null default 0 check (price >= 0),
  whatsapp_phone text not null default '',
  teacher_name text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ninth_settings (
  singleton boolean primary key default true check (singleton),
  global_code_price numeric(12, 2) not null default 0 check (global_code_price >= 0),
  whatsapp_phone text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.ninth_settings (singleton)
values (true)
on conflict (singleton) do nothing;

create table if not exists public.ninth_access_codes (
  id uuid primary key default gen_random_uuid(),
  scope public.ninth_code_scope not null,
  file_id uuid references public.ninth_files(id) on delete cascade,
  code_hash text not null unique,
  is_active boolean not null default true,
  max_uses integer not null default 1 check (max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  expires_at timestamptz,
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ninth_access_codes_scope_check check (
    (scope = 'file' and file_id is not null) or
    (scope = 'grade9' and file_id is null)
  ),
  constraint ninth_access_codes_uses_check check (uses_count <= max_uses)
);

create table if not exists public.ninth_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.ninth_access_codes(id) on delete cascade,
  redeemed_at timestamptz not null default now()
);

create index if not exists ninth_subjects_active_sort_idx
  on public.ninth_subjects (is_active, sort_order, name);
create index if not exists ninth_files_subject_published_sort_idx
  on public.ninth_files (subject_id, is_published, sort_order, created_at desc);
create index if not exists ninth_access_codes_hash_idx
  on public.ninth_access_codes (code_hash);
create index if not exists ninth_access_codes_scope_file_idx
  on public.ninth_access_codes (scope, file_id, is_active);
create index if not exists ninth_code_redemptions_code_idx
  on public.ninth_code_redemptions (code_id, redeemed_at desc);

create or replace function private.set_ninth_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ninth_subjects_updated_at on public.ninth_subjects;
create trigger ninth_subjects_updated_at
before update on public.ninth_subjects
for each row execute function private.set_ninth_updated_at();

drop trigger if exists ninth_files_updated_at on public.ninth_files;
create trigger ninth_files_updated_at
before update on public.ninth_files
for each row execute function private.set_ninth_updated_at();

drop trigger if exists ninth_settings_updated_at on public.ninth_settings;
create trigger ninth_settings_updated_at
before update on public.ninth_settings
for each row execute function private.set_ninth_updated_at();

create or replace function private.is_ninth_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select p_user_id is not null
    and exists (
      select 1 from public.ninth_admins admin
      where admin.user_id = p_user_id
    );
$$;

alter table public.ninth_admins enable row level security;
alter table public.ninth_subjects enable row level security;
alter table public.ninth_files enable row level security;
alter table public.ninth_settings enable row level security;
alter table public.ninth_access_codes enable row level security;
alter table public.ninth_code_redemptions enable row level security;

-- لا تُنشأ سياسات مباشرة: الوصول العام محصور في RPC للحقول العامة فقط.

create or replace function public.get_ninth_settings()
returns table (
  global_code_price numeric,
  whatsapp_phone text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select global_code_price, whatsapp_phone
  from public.ninth_settings
  where singleton = true;
$$;

create or replace function public.list_ninth_subjects()
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  icon_key text,
  color_from text,
  color_to text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id, name, slug, description, icon_key, color_from, color_to, sort_order
  from public.ninth_subjects
  where is_active = true
  order by sort_order asc, name asc;
$$;

create or replace function public.list_ninth_files(p_subject_id uuid)
returns table (
  id uuid,
  subject_id uuid,
  title text,
  description text,
  cover_url text,
  price numeric,
  whatsapp_phone text,
  teacher_name text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id, subject_id, title, description, cover_url, price, whatsapp_phone, teacher_name, sort_order
  from public.ninth_files
  where subject_id = p_subject_id
    and is_published = true
  order by sort_order asc, created_at desc;
$$;

create or replace function public.redeem_ninth_access_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_normalized_code text;
  v_code_hash text;
  v_code public.ninth_access_codes%rowtype;
  v_files jsonb;
begin
  v_normalized_code := upper(trim(coalesce(p_code, '')));
  if char_length(v_normalized_code) < 6 then
    raise exception 'invalid access code' using errcode = '22023';
  end if;

  v_code_hash := encode(extensions.digest(v_normalized_code, 'sha256'), 'hex');

  select * into v_code
  from public.ninth_access_codes
  where code_hash = v_code_hash
  for update;

  if not found or not v_code.is_active then
    raise exception 'invalid or disabled access code' using errcode = '22023';
  end if;

  if v_code.expires_at is not null and v_code.expires_at <= now() then
    raise exception 'access code expired' using errcode = '22023';
  end if;

  if v_code.uses_count >= v_code.max_uses then
    raise exception 'access code already used' using errcode = '22023';
  end if;

  update public.ninth_access_codes
  set uses_count = uses_count + 1
  where id = v_code.id;

  insert into public.ninth_code_redemptions (code_id)
  values (v_code.id);

  if v_code.scope = 'file' then
    select jsonb_agg(
      jsonb_build_object(
        'id', file.id,
        'title', file.title,
        'drive_url', file.drive_url
      )
    ) into v_files
    from public.ninth_files file
    where file.id = v_code.file_id
      and file.is_published = true;
  else
    select jsonb_agg(
      jsonb_build_object(
        'id', file.id,
        'title', file.title,
        'drive_url', file.drive_url
      ) order by file.sort_order asc, file.created_at desc
    ) into v_files
    from public.ninth_files file
    join public.ninth_subjects subject on subject.id = file.subject_id
    where file.is_published = true and subject.is_active = true;
  end if;

  return jsonb_build_object(
    'scope', v_code.scope,
    'files', coalesce(v_files, '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_list_ninth_subjects()
returns setof public.ninth_subjects
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not (select private.is_ninth_admin()) then
    raise exception 'administrator access required' using errcode = '42501';
  end if;
  return query select * from public.ninth_subjects order by sort_order asc, name asc;
end;
$$;

create or replace function public.admin_list_ninth_files()
returns setof public.ninth_files
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not (select private.is_ninth_admin()) then
    raise exception 'administrator access required' using errcode = '42501';
  end if;
  return query select * from public.ninth_files order by created_at desc;
end;
$$;

create or replace function public.admin_list_ninth_codes()
returns table (
  id uuid,
  scope public.ninth_code_scope,
  file_id uuid,
  is_active boolean,
  max_uses integer,
  uses_count integer,
  expires_at timestamptz,
  note text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not (select private.is_ninth_admin()) then
    raise exception 'administrator access required' using errcode = '42501';
  end if;
  return query
  select code.id, code.scope, code.file_id, code.is_active, code.max_uses,
         code.uses_count, code.expires_at, code.note, code.created_at
  from public.ninth_access_codes code
  order by code.created_at desc;
end;
$$;

create or replace function public.admin_create_ninth_subject(
  p_name text,
  p_slug text,
  p_description text default '',
  p_icon_key text default 'book-open',
  p_color_from text default '#312E81',
  p_color_to text default '#4F46E5',
  p_sort_order integer default 0,
  p_is_active boolean default true
)
returns public.ninth_subjects
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare v_subject public.ninth_subjects;
begin
  if not (select private.is_ninth_admin()) then
    raise exception 'administrator access required' using errcode = '42501';
  end if;
  insert into public.ninth_subjects (
    name, slug, description, icon_key, color_from, color_to, sort_order, is_active
  ) values (
    trim(p_name), lower(trim(p_slug)), trim(coalesce(p_description, '')),
    trim(coalesce(p_icon_key, 'book-open')), trim(coalesce(p_color_from, '#312E81')),
    trim(coalesce(p_color_to, '#4F46E5')), coalesce(p_sort_order, 0), coalesce(p_is_active, true)
  ) returning * into v_subject;
  return v_subject;
end;
$$;

create or replace function public.admin_update_ninth_subject(
  p_id uuid,
  p_name text,
  p_slug text,
  p_description text,
  p_icon_key text,
  p_color_from text,
  p_color_to text,
  p_sort_order integer,
  p_is_active boolean
)
returns public.ninth_subjects
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare v_subject public.ninth_subjects;
begin
  if not (select private.is_ninth_admin()) then
    raise exception 'administrator access required' using errcode = '42501';
  end if;
  update public.ninth_subjects
  set name = trim(p_name), slug = lower(trim(p_slug)), description = trim(coalesce(p_description, '')),
      icon_key = trim(coalesce(p_icon_key, 'book-open')), color_from = trim(coalesce(p_color_from, '#312E81')),
      color_to = trim(coalesce(p_color_to, '#4F46E5')), sort_order = coalesce(p_sort_order, 0),
      is_active = coalesce(p_is_active, true)
  where id = p_id
  returning * into v_subject;
  if not found then raise exception 'subject not found' using errcode = 'P0002'; end if;
  return v_subject;
end;
$$;

create or replace function public.admin_delete_ninth_subject(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not (select private.is_ninth_admin()) then
    raise exception 'administrator access required' using errcode = '42501';
  end if;
  delete from public.ninth_subjects where id = p_id;
end;
$$;

create or replace function public.admin_create_ninth_file(
  p_subject_id uuid,
  p_title text,
  p_description text default '',
  p_cover_url text default null,
  p_drive_url text default '',
  p_price numeric default 0,
  p_whatsapp_phone text default '',
  p_teacher_name text default '',
  p_sort_order integer default 0,
  p_is_published boolean default true
)
returns public.ninth_files
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare v_file public.ninth_files;
begin
  if not (select private.is_ninth_admin()) then
    raise exception 'administrator access required' using errcode = '42501';
  end if;
  insert into public.ninth_files (
    subject_id, title, description, cover_url, drive_url, price, whatsapp_phone,
    teacher_name, sort_order, is_published
  ) values (
    p_subject_id, trim(p_title), trim(coalesce(p_description, '')), nullif(trim(coalesce(p_cover_url, '')), ''),
    trim(p_drive_url), coalesce(p_price, 0), trim(coalesce(p_whatsapp_phone, '')),
    trim(coalesce(p_teacher_name, '')), coalesce(p_sort_order, 0), coalesce(p_is_published, true)
  ) returning * into v_file;
  return v_file;
end;
$$;

create or replace function public.admin_update_ninth_file(
  p_id uuid,
  p_subject_id uuid,
  p_title text,
  p_description text,
  p_cover_url text,
  p_drive_url text,
  p_price numeric,
  p_whatsapp_phone text,
  p_teacher_name text,
  p_sort_order integer,
  p_is_published boolean
)
returns public.ninth_files
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare v_file public.ninth_files;
begin
  if not (select private.is_ninth_admin()) then
    raise exception 'administrator access required' using errcode = '42501';
  end if;
  update public.ninth_files
  set subject_id = p_subject_id, title = trim(p_title), description = trim(coalesce(p_description, '')),
      cover_url = nullif(trim(coalesce(p_cover_url, '')), ''), drive_url = trim(p_drive_url),
      price = coalesce(p_price, 0), whatsapp_phone = trim(coalesce(p_whatsapp_phone, '')),
      teacher_name = trim(coalesce(p_teacher_name, '')), sort_order = coalesce(p_sort_order, 0),
      is_published = coalesce(p_is_published, true)
  where id = p_id
  returning * into v_file;
  if not found then raise exception 'file not found' using errcode = 'P0002'; end if;
  return v_file;
end;
$$;

create or replace function public.admin_delete_ninth_file(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not (select private.is_ninth_admin()) then
    raise exception 'administrator access required' using errcode = '42501';
  end if;
  delete from public.ninth_files where id = p_id;
end;
$$;

create or replace function public.admin_generate_ninth_access_code(
  p_scope public.ninth_code_scope,
  p_file_id uuid default null,
  p_max_uses integer default 1,
  p_expires_at timestamptz default null,
  p_note text default '',
  p_custom_code text default null
)
returns table (
  id uuid,
  code text,
  scope public.ninth_code_scope,
  file_id uuid,
  max_uses integer,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_code text;
  v_hash text;
  v_id uuid;
begin
  if not (select private.is_ninth_admin()) then
    raise exception 'administrator access required' using errcode = '42501';
  end if;
  if p_scope = 'file' and p_file_id is null then
    raise exception 'a file code requires a file id' using errcode = '22023';
  end if;
  if p_scope = 'grade9' and p_file_id is not null then
    raise exception 'a grade code cannot target one file' using errcode = '22023';
  end if;
  if coalesce(p_max_uses, 0) < 1 then
    raise exception 'max uses must be at least one' using errcode = '22023';
  end if;

  v_code := nullif(regexp_replace(upper(trim(coalesce(p_custom_code, ''))), '[^A-Z0-9-]', '', 'g'), '');
  if v_code is null then
    v_code := 'AQB9-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;
  if char_length(v_code) < 6 then
    raise exception 'custom code is too short' using errcode = '22023';
  end if;
  v_hash := encode(extensions.digest(v_code, 'sha256'), 'hex');

  insert into public.ninth_access_codes (
    scope, file_id, code_hash, max_uses, expires_at, note, created_by
  ) values (
    p_scope, p_file_id, v_hash, p_max_uses, p_expires_at, trim(coalesce(p_note, '')), auth.uid()
  ) returning ninth_access_codes.id into v_id;

  return query select v_id, v_code, p_scope, p_file_id, p_max_uses, p_expires_at;
end;
$$;

create or replace function public.admin_set_ninth_code_active(
  p_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not (select private.is_ninth_admin()) then
    raise exception 'administrator access required' using errcode = '42501';
  end if;
  update public.ninth_access_codes set is_active = p_is_active where id = p_id;
end;
$$;

create or replace function public.admin_update_ninth_settings(
  p_global_code_price numeric,
  p_whatsapp_phone text
)
returns public.ninth_settings
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare v_settings public.ninth_settings;
begin
  if not (select private.is_ninth_admin()) then
    raise exception 'administrator access required' using errcode = '42501';
  end if;
  update public.ninth_settings
  set global_code_price = coalesce(p_global_code_price, 0),
      whatsapp_phone = trim(coalesce(p_whatsapp_phone, ''))
  where singleton = true
  returning * into v_settings;
  return v_settings;
end;
$$;

revoke all on table public.ninth_admins, public.ninth_subjects, public.ninth_files,
  public.ninth_settings, public.ninth_access_codes, public.ninth_code_redemptions
from anon, authenticated;

revoke all on function public.get_ninth_settings() from public;
revoke all on function public.list_ninth_subjects() from public;
revoke all on function public.list_ninth_files(uuid) from public;
revoke all on function public.redeem_ninth_access_code(text) from public;
grant execute on function public.get_ninth_settings(), public.list_ninth_subjects(),
  public.list_ninth_files(uuid), public.redeem_ninth_access_code(text)
to anon, authenticated;

revoke all on function public.admin_list_ninth_subjects(), public.admin_list_ninth_files(),
  public.admin_list_ninth_codes(), public.admin_create_ninth_subject(text, text, text, text, text, text, integer, boolean),
  public.admin_update_ninth_subject(uuid, text, text, text, text, text, text, integer, boolean),
  public.admin_delete_ninth_subject(uuid),
  public.admin_create_ninth_file(uuid, text, text, text, text, numeric, text, text, integer, boolean),
  public.admin_update_ninth_file(uuid, uuid, text, text, text, text, numeric, text, text, integer, boolean),
  public.admin_delete_ninth_file(uuid),
  public.admin_generate_ninth_access_code(public.ninth_code_scope, uuid, integer, timestamptz, text, text),
  public.admin_set_ninth_code_active(uuid, boolean),
  public.admin_update_ninth_settings(numeric, text)
from public, anon;

grant execute on function public.admin_list_ninth_subjects(), public.admin_list_ninth_files(),
  public.admin_list_ninth_codes(), public.admin_create_ninth_subject(text, text, text, text, text, text, integer, boolean),
  public.admin_update_ninth_subject(uuid, text, text, text, text, text, text, integer, boolean),
  public.admin_delete_ninth_subject(uuid),
  public.admin_create_ninth_file(uuid, text, text, text, text, numeric, text, text, integer, boolean),
  public.admin_update_ninth_file(uuid, uuid, text, text, text, text, numeric, text, text, integer, boolean),
  public.admin_delete_ninth_file(uuid),
  public.admin_generate_ninth_access_code(public.ninth_code_scope, uuid, integer, timestamptz, text, text),
  public.admin_set_ninth_code_active(uuid, boolean),
  public.admin_update_ninth_settings(numeric, text)
to authenticated;

revoke all on function private.is_ninth_admin(uuid), private.set_ninth_updated_at() from public, anon, authenticated;
