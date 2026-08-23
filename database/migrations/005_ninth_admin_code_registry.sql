-- يبقى تجزئة الكود في جدول الوصول العام؛ النص الخام يحفظ في مخطط private ويعاد للمشرف فقط عبر RPC محمي.
create table if not exists private.ninth_access_code_secrets (
  code_id uuid primary key references public.ninth_access_codes(id) on delete cascade,
  code_text text not null check (char_length(code_text) >= 6),
  created_at timestamptz not null default now()
);

alter table private.ninth_access_code_secrets enable row level security;
revoke all on table private.ninth_access_code_secrets from public, anon, authenticated;

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
set search_path = public, private, extensions, pg_temp
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

  insert into private.ninth_access_code_secrets (code_id, code_text)
  values (v_id, v_code);

  return query select v_id, v_code, p_scope, p_file_id, p_max_uses, p_expires_at;
end;
$$;

create or replace function public.admin_generate_ninth_access_code_batch(
  p_scope public.ninth_code_scope,
  p_file_id uuid default null,
  p_quantity integer default 1,
  p_max_uses integer default 1,
  p_expires_at timestamptz default null,
  p_note text default ''
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
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_code text;
  v_hash text;
  v_id uuid;
  v_index integer;
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
  if coalesce(p_quantity, 0) not between 1 and 100 then
    raise exception 'quantity must be between 1 and 100' using errcode = '22023';
  end if;
  if coalesce(p_max_uses, 0) < 1 then
    raise exception 'max uses must be at least one' using errcode = '22023';
  end if;

  for v_index in 1..p_quantity loop
    loop
      v_code := 'AQB9-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      v_hash := encode(extensions.digest(v_code, 'sha256'), 'hex');
      exit when not exists (
        select 1 from public.ninth_access_codes where code_hash = v_hash
      );
    end loop;

    insert into public.ninth_access_codes (
      scope, file_id, code_hash, max_uses, expires_at, note, created_by
    ) values (
      p_scope, p_file_id, v_hash, p_max_uses, p_expires_at,
      trim(coalesce(p_note, '')), auth.uid()
    ) returning ninth_access_codes.id into v_id;

    insert into private.ninth_access_code_secrets (code_id, code_text)
    values (v_id, v_code);

    id := v_id;
    code := v_code;
    scope := p_scope;
    file_id := p_file_id;
    max_uses := p_max_uses;
    expires_at := p_expires_at;
    return next;
  end loop;
end;
$$;

drop function if exists public.admin_list_ninth_codes();

create function public.admin_list_ninth_codes()
returns table (
  id uuid,
  code text,
  scope public.ninth_code_scope,
  file_id uuid,
  subject_id uuid,
  subject_name text,
  file_title text,
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
set search_path = public, private, extensions, pg_temp
as $$
begin
  if not (select private.is_ninth_admin()) then
    raise exception 'administrator access required' using errcode = '42501';
  end if;
  return query
  select access.id, secret.code_text, access.scope, access.file_id,
         file.subject_id, subject.name, file.title, access.is_active,
         access.max_uses, access.uses_count, access.expires_at,
         access.note, access.created_at
  from public.ninth_access_codes access
  left join private.ninth_access_code_secrets secret on secret.code_id = access.id
  left join public.ninth_files file on file.id = access.file_id
  left join public.ninth_subjects subject on subject.id = file.subject_id
  order by access.created_at desc;
end;
$$;

revoke all on function public.admin_list_ninth_codes() from public, anon;
grant execute on function public.admin_list_ninth_codes() to authenticated;
