# مكتبة الصف التاسع — القسم المميز

واجهة عربية قابلة للنشر على **GitHub Pages** لإدارة وعرض مواد وملفات الصف التاسع. يستخدم المشروع React وTypeScript وSupabase Auth مع واجهة عامة للطالب ومسار إداري مستقل في `/admin`.

## ما تم تنفيذه

| الجزء | السلوك |
| --- | --- |
| واجهة الطالب | تبدأ بالمواد، ثم تعرض ملفات المادة، وسعر كل ملف، ورقم التواصل، وخيار إدخال الكود. |
| الوصول | يتحقق الكود في دالة قاعدة بيانات، ويكشف رابط الملف بعد قبوله فقط. يدعم الكود المفرد والكود الشامل. |
| Google Drive | يحوّل رابط المشاركة إلى رابط تنزيل مباشر قبل تمريره إلى الجسر الأصلي أو المتصفح. |
| لوحة المشرف | المسار `/admin` يتطلب تسجيل الدخول، ولا يعمل إلا لحساب مدرج في `public.ninth_admins`. |
| العمليات الحساسة | إنشاء/تعديل المحتوى، أسعار الملفات، إنشاء الأكواد واستهلاكها موجودة داخل دوال PostgreSQL، لا في واجهة العميل. |

## تهيئة أول مشرف

افتح `/admin` وأنشئ الحساب أو سجل دخوله. بعد وجود المستخدم في Supabase Auth، نفّذ الأمر التالي مرة واحدة من محرر SQL في مشروع Supabase، مع استبدال البريد:

```sql
insert into public.ninth_admins (user_id)
select id from auth.users where email = 'admin@example.com'
limit 1
on conflict (user_id) do nothing;
```

تفعيل البريد الإلكتروني في Supabase Auth موصى به. أضف عنوان نشر GitHub Pages إلى **Authentication → URL Configuration → Redirect URLs** حتى يعمل تأكيد الحساب بعد النشر.

## النشر على GitHub Pages

تُنشر النسخة المبنية داخل المجلد `docs/` من الفرع `main` حتى لا يعتمد النشر على صلاحية إنشاء GitHub Actions. من إعدادات المستودع اختر **Settings → Pages → Build and deployment → Deploy from a branch**، ثم اختر الفرع `main` والمجلد `/docs`. بعد الحفظ سيكون الموقع متاحاً على `https://ahm-0.github.io/aqb_9/`.

## تشغيل محلي

```bash
pnpm install
pnpm dev
```

لا تضع أي مفتاح `service_role` في `.env` أو GitHub Actions أو تطبيق الويب. المفتاح القابل للنشر المستخدم في الواجهة عام عن قصد، بينما تعتمد الحماية على RLS ودوال RPC المقيدة.

## توافق عارض أندرويد

تستدعي الواجهة `window.AppBridge.removeSplashScreen()` المتاح في ملف `ChatWebViewActivity.java` المرفق. وعند فتح PDF، تجرب الواجهة بالترتيب `window.Android.openNativePdfViewer` ثم `window.AppBridge.openNativePdfViewer` ثم `window.AppBridge.openExternalUrl`. بما أن ملف Java المرفق يوفّر `openExternalUrl` ولا يعرّف `openNativePdfViewer`، فالنسخة الحالية تفتح الرابط المباشر في عارض النظام الخارجي كحل متوافق.

إذا كان لديك نشاط PDF أصلي داخل التطبيق، أضف دالة `openNativePdfViewer(url, title, protectedFile)` بنفس الاسم إلى `NativeBridge` ثم مرر إليها رابط التنزيل المباشر. لا يلزم أي تغيير في واجهة الويب بعد ذلك.

## حدود حماية Google Drive

كود الوصول يحدّ من حق الحصول على رابط Drive ويُسجّل عدد الاستخدامات، لكنه لا يوفّر DRM. من يحصل على رابط تنزيل مباشر يستطيع نسخه؛ للملفات شديدة الحساسية استخدم خدمة ملفات تدعم روابط موقعة قصيرة العمر بدلاً من Google Drive.
