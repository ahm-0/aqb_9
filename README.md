# مكتبة التاسع — HTML / CSS / JavaScript

هذه النسخة تستخدم **HTML وCSS وJavaScript خام فقط**؛ لا تحتوي React أو Vite أو Tailwind أو حزمة JavaScript أو عملية بناء. ملفات النشر الفعلية موجودة كاملة في `docs/`، وهو المجلد الذي يختار في GitHub Pages.

## النشر

من المستودع على GitHub اختر **Settings → Pages → Deploy from a branch**، ثم الفرع `main` والمسار `/docs`. سيكون الرابط `https://ahm-0.github.io/aqb_9/`.

## الملفات الرئيسية

| الملف | الوظيفة |
| --- | --- |
| `docs/index.html` | واجهة الطالب والمواد والملفات والأكواد. |
| `docs/admin/index.html` | لوحة المشرف المستقلة. |
| `docs/assets/styles.css` | جميع أنماط الواجهة. |
| `docs/assets/app.js` | عرض المحتوى وفتح PDF والتحقق من الأكواد. |
| `docs/assets/admin.js` | تسجيل الدخول وعمليات الإدارة عبر Supabase RPC. |

المفتاح العام لـ Supabase ظاهر في JavaScript عمداً، أما الأمان الفعلي فيبقى عبر RLS ودوال قاعدة البيانات. لا تضف مفتاح `service_role` إلى الملفات العامة.
