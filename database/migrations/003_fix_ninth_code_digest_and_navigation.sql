-- يصل pgcrypto في هذا المشروع من مخطط extensions؛ يجب تأهيل digest صراحة داخل الدالة SECURITY DEFINER.
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
set search_path = public, private, pg_temp
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
