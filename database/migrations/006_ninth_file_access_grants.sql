-- جلسة وصول عشوائية تحفظ بعد التحقق من الكود، وتسمح بإعادة جلب أحدث روابط الملفات
-- من دون كشف روابط Drive ضمن الدالة العامة list_ninth_files.

alter table public.ninth_code_redemptions
  add column if not exists grant_token uuid;

update public.ninth_code_redemptions
set grant_token = gen_random_uuid()
where grant_token is null;

alter table public.ninth_code_redemptions
  alter column grant_token set not null;

create unique index if not exists ninth_code_redemptions_grant_token_idx
  on public.ninth_code_redemptions (grant_token);

create or replace function public.redeem_ninth_access_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_normalized_code text;
  v_code_hash text;
  v_code public.ninth_access_codes%rowtype;
  v_grant_token uuid := gen_random_uuid();
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

  insert into public.ninth_code_redemptions (code_id, grant_token)
  values (v_code.id, v_grant_token);

  if v_code.scope = 'file' then
    select jsonb_agg(jsonb_build_object('id', file.id, 'title', file.title, 'drive_url', file.drive_url))
    into v_files
    from public.ninth_files file
    where file.id = v_code.file_id and file.is_published = true;
  else
    select jsonb_agg(jsonb_build_object('id', file.id, 'title', file.title, 'drive_url', file.drive_url)
      order by file.sort_order asc, file.created_at desc)
    into v_files
    from public.ninth_files file
    join public.ninth_subjects subject on subject.id = file.subject_id
    where file.is_published = true and subject.is_active = true;
  end if;

  return jsonb_build_object(
    'scope', v_code.scope,
    'grant_token', v_grant_token,
    'files', coalesce(v_files, '[]'::jsonb)
  );
end;
$$;

create or replace function public.refresh_ninth_access_files(p_grant_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_code public.ninth_access_codes%rowtype;
  v_files jsonb;
begin
  select code.* into v_code
  from public.ninth_code_redemptions redemption
  join public.ninth_access_codes code on code.id = redemption.code_id
  where redemption.grant_token = p_grant_token
  limit 1;

  if not found or not v_code.is_active then
    raise exception 'access grant is invalid' using errcode = '42501';
  end if;
  if v_code.expires_at is not null and v_code.expires_at <= now() then
    raise exception 'access grant has expired' using errcode = '42501';
  end if;

  if v_code.scope = 'file' then
    select jsonb_agg(jsonb_build_object('id', file.id, 'title', file.title, 'drive_url', file.drive_url))
    into v_files
    from public.ninth_files file
    where file.id = v_code.file_id and file.is_published = true;
  else
    select jsonb_agg(jsonb_build_object('id', file.id, 'title', file.title, 'drive_url', file.drive_url)
      order by file.sort_order asc, file.created_at desc)
    into v_files
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

revoke all on function public.refresh_ninth_access_files(uuid) from public;
grant execute on function public.refresh_ninth_access_files(uuid) to anon, authenticated;
