/* سجل أكواد المشرف: يعرض النص المحفوظ في المخطط الخاص للمشرف فقط، مع نسخ وحالة ونطاق واضحين. */
(() => {
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const formatDate = (value) => value ? new Date(value).toLocaleString("ar-SY", { dateStyle: "medium", timeStyle: "short" }) : "دون انتهاء";
  const statusFor = (row) => {
    if (!row.is_active) return { label: "معطّل", className: "off" };
    if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return { label: "منتهي", className: "expired" };
    if (Number(row.uses_count) >= Number(row.max_uses)) return { label: "مكتمل الاستخدام", className: "used" };
    return { label: "فعّال", className: "active" };
  };
  const codeLabel = (row) => row.code ? escapeHtml(row.code) : "كود سابق غير قابل للاستعادة";
  const renderRegistry = () => {
    const grid = document.querySelector("#admin-content .admin-grid");
    if (!grid || !Array.isArray(state?.codes)) return;
    const formDescription = grid.querySelector(".editor-card .panel-title p");
    if (formDescription) formDescription.textContent = "يحفظ النظام النص في سجل المشرف الخاص، ولا يظهر لطلاب الموقع.";
    const legacy = grid.querySelector(".data-card:last-child");
    if (!legacy) return;
    const list = state.codes.map((row) => {
      const status = statusFor(row);
      const scopeLabel = row.scope === "grade9" ? "شامل" : "ملف";
      const subject = row.scope === "grade9" ? "كل مواد الصف التاسع" : (row.subject_name || "مادة محذوفة");
      const file = row.scope === "grade9" ? "جميع الملفات" : (row.file_title || "ملف محذوف");
      const period = `من ${formatDate(row.created_at)}${row.expires_at ? ` إلى ${formatDate(row.expires_at)}` : ""}`;
      const copyDisabled = row.code ? "" : "disabled";
      return `<article class="admin-code-card" data-code-id="${row.id}">
        <div class="admin-code-card-top"><span class="code-scope ${row.scope === "grade9" ? "global" : ""}">${scopeLabel}</span><span class="registry-state ${status.className}">${status.label}</span></div>
        <div class="registry-code" dir="ltr"><code>${codeLabel(row)}</code><button type="button" class="registry-copy" data-code-copy="${escapeHtml(row.code || "")}" ${copyDisabled}>نسخ</button></div>
        <dl class="registry-details"><div><dt>المادة</dt><dd>${escapeHtml(subject)}</dd></div><div><dt>الملف</dt><dd>${escapeHtml(file)}</dd></div><div><dt>الفترة</dt><dd>${escapeHtml(period)}</dd></div><div><dt>الاستخدام</dt><dd>${Number(row.uses_count)} من ${Number(row.max_uses)}</dd></div></dl>
        ${row.note ? `<p class="registry-note">ملاحظة: ${escapeHtml(row.note)}</p>` : ""}
        <button type="button" class="registry-toggle" data-code-toggle="${row.id}" data-next-state="${row.is_active ? "false" : "true"}">${row.is_active ? "تعطيل الكود" : "تفعيل الكود"}</button>
      </article>`;
    }).join("") || "<p class=\"registry-empty\">لا توجد أكواد وصول بعد.</p>";
    legacy.outerHTML = `<section class="data-card code-registry" id="admin-code-registry"><header class="panel-title"><span>⌘</span><div><h2>كل أكواد الوصول</h2><p>${state.codes.length} كوداً متاحاً في السجل</p></div></header><div class="admin-code-list">${list}</div></section>`;
  };
  const copyCode = async (value) => {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); }
    catch { const field = document.createElement("textarea"); field.value = value; field.style.position = "fixed"; field.style.opacity = "0"; document.body.append(field); field.select(); document.execCommand("copy"); field.remove(); }
    toast("تم نسخ الكود.");
  };
  const originalRender = window.render;
  if (typeof originalRender === "function") {
    window.render = (view) => { const output = originalRender(view); if (view === "codes") renderRegistry(); return output; };
  }
  window.renderCodeRegistry = renderRegistry;
  document.addEventListener("click", async (event) => {
    const copy = event.target.closest("[data-code-copy]");
    if (copy) { await copyCode(copy.dataset.codeCopy); return; }
    const toggle = event.target.closest("[data-code-toggle]");
    if (!toggle) return;
    toggle.disabled = true;
    try {
      await rpc("admin_set_ninth_code_active", { p_id: toggle.dataset.codeToggle, p_is_active: toggle.dataset.nextState === "true" });
      await loadData(); renderRegistry(); toast("تم تحديث حالة الكود.");
    } catch (error) { toast(error.message || "تعذر تحديث حالة الكود.", true); }
    finally { toggle.disabled = false; }
  });
})();
