-- الدوال المنشأة قبل هذا الإصلاح تستخدم digest غير المؤهل؛ يضاف مخطط الامتداد إلى مسارها كي تستمر بالعمل.
-- migrations الجديدة تؤهل extensions.digest صراحةً أيضاً، لذلك يبقى هذا متوافقاً مع البيئات الجديدة والقائمة.
alter function public.redeem_ninth_access_code(text)
  set search_path to public, private, extensions, pg_temp;

alter function public.admin_generate_ninth_access_code(
  public.ninth_code_scope, uuid, integer, timestamptz, text, text
)
  set search_path to public, private, extensions, pg_temp;

alter function public.admin_generate_ninth_access_code_batch(
  public.ninth_code_scope, uuid, integer, integer, timestamptz, text
)
  set search_path to public, private, extensions, pg_temp;
