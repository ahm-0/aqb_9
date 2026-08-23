/* إصلاح حفظ المشرف: يرسل قيم النماذج بصيغة RPC الصحيحة، ويمنع تداخل مستمعات النماذج القديمة. */
(() => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const byId = (id) => document.getElementById(id);
  const safeText = (value) => String(value ?? "").trim();
  const slugify = (value) => {
    const normalized = safeText(value).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    return normalized || `subject-${Date.now().toString(36)}`;
  };
  const errorMessage = (error, fallback) => {
    const message = safeText(error?.message || error || fallback);
    if (/duplicate|unique|already exists/i.test(message)) return "رابط المادة مستخدم مسبقاً. غيّره ثم حاول مرة أخرى.";
    if (/administrator|permission|jwt|auth/i.test(message)) return "انتهت جلسة المشرف أو لا توجد صلاحية. سجّل الدخول من جديد.";
    if (/drive|url|https/i.test(message)) return "تحقق من رابط Google Drive: يجب أن يبدأ بـ https://";
    return message || fallback;
  };
  const toggleSaving = (button, busy, label) => {
    if (!button) return;
    if (busy) { button.dataset.label = button.textContent; button.disabled = true; button.textContent = "جارٍ الحفظ…"; }
    else { button.disabled = false; button.textContent = button.dataset.label || label; }
  };
  const refresh = async (view) => {
    await loadData();
    render(view);
    await delay(0);
  };
  const bindSubject = (form) => {
    const name = form.elements.name;
    const slug = form.elements.slug;
    if (name && slug) {
      slug.removeAttribute("pattern");
      slug.required = false;
      name.addEventListener("input", () => { if (!slug.dataset.userEdited) slug.value = slugify(name.value); });
      slug.addEventListener("input", () => { slug.dataset.userEdited = "true"; });
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); event.stopImmediatePropagation();
      const data = new FormData(form); const button = form.querySelector('button[type="submit"], button.primary-button');
      const subjectName = safeText(data.get("name"));
      if (subjectName.length < 2) return toast("اكتب اسم المادة أولاً.", true);
      toggleSaving(button, true, "＋ إضافة المادة");
      try {
        await rpc("admin_create_ninth_subject", {
          p_name: subjectName,
          p_slug: slugify(data.get("slug") || subjectName),
          p_description: safeText(data.get("description")),
          p_icon_key: data.get("icon") || "book-open",
          p_color_from: data.get("from") || "#312e81",
          p_color_to: data.get("to") || "#4f46e5",
          p_sort_order: Number(data.get("sort") || 0),
          p_is_active: data.has("active")
        });
        toast("تمت إضافة المادة بنجاح.");
        await refresh("subjects");
      } catch (error) { toast(errorMessage(error, "تعذر إضافة المادة."), true); }
      finally { toggleSaving(button, false, "＋ إضافة المادة"); }
    }, true);
  };
  const bindFile = (form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); event.stopImmediatePropagation();
      const data = new FormData(form); const button = form.querySelector('button[type="submit"], button.primary-button');
      const title = safeText(data.get("title")); const driveUrl = safeText(data.get("drive"));
      if (!data.get("subject")) return toast("اختر المادة أولاً.", true);
      if (title.length < 2) return toast("اكتب عنوان الملف أولاً.", true);
      if (!/^https:\/\//i.test(driveUrl)) return toast("أضف رابط Google Drive صحيحاً يبدأ بـ https://", true);
      toggleSaving(button, true, "＋ إضافة الملف");
      try {
        await rpc("admin_create_ninth_file", {
          p_subject_id: data.get("subject"), p_title: title, p_description: safeText(data.get("description")),
          p_cover_url: null, p_drive_url: driveUrl, p_price: Number(data.get("price") || 0),
          p_whatsapp_phone: safeText(data.get("phone")), p_teacher_name: safeText(data.get("teacher")),
          p_sort_order: Number(data.get("sort") || 0), p_is_published: data.has("published")
        });
        toast("تمت إضافة الملف بنجاح.");
        await refresh("files");
      } catch (error) { toast(errorMessage(error, "تعذر إضافة الملف."), true); }
      finally { toggleSaving(button, false, "＋ إضافة الملف"); }
    }, true);
  };
  const bindCode = (form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); event.stopImmediatePropagation();
      const data = new FormData(form); const button = form.querySelector('button[type="submit"], button.primary-button');
      const scope = data.get("scope");
      if (scope === "file" && !data.get("file")) return toast("اختر ملفاً أو غيّر النوع إلى كود شامل.", true);
      toggleSaving(button, true, "⌘ إنشاء الكود");
      try {
        const rows = await rpc("admin_generate_ninth_access_code", {
          p_scope: scope, p_file_id: scope === "file" ? data.get("file") : null,
          p_max_uses: Number(data.get("uses") || 1), p_expires_at: data.get("expires") ? new Date(data.get("expires")).toISOString() : null,
          p_note: safeText(data.get("note")), p_custom_code: safeText(data.get("custom")) || null
        });
        const code = Array.isArray(rows) ? rows[0]?.code : rows?.code;
        const result = byId("code-result"); if (result) { result.textContent = code || "تم إنشاء الكود"; result.classList.remove("hidden"); }
        if (code && navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
        toast("تم إنشاء الكود ونسخه. احتفظ به الآن."); await loadData();
      } catch (error) { toast(errorMessage(error, "تعذر إنشاء الكود."), true); }
      finally { toggleSaving(button, false, "⌘ إنشاء الكود"); }
    }, true);
  };
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.dataset.fixed) return;
    if (form.id === "subject-form") { form.dataset.fixed = "true"; bindSubject(form); }
    if (form.id === "file-form") { form.dataset.fixed = "true"; bindFile(form); }
    if (form.id === "code-form") { form.dataset.fixed = "true"; bindCode(form); }
  }, true);
  const observe = new MutationObserver(() => {
    ["subject-form", "file-form", "code-form"].forEach((id) => {
      const form = byId(id); if (!form || form.dataset.fixed) return;
      form.dataset.fixed = "true";
      if (id === "subject-form") bindSubject(form);
      if (id === "file-form") bindFile(form);
      if (id === "code-form") bindCode(form);
    });
  });
  observe.observe(document.body, { childList: true, subtree: true });
})();
