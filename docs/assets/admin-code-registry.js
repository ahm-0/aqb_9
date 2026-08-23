/* مستكشف أكواد المشرف: مادة ← ملف ← كود، مع نسخ النص المتاح وحالة واضحة. */
(() => {
  const explorer = { level: "subjects", subjectId: null, fileId: null, global: false };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const statusFor = (row) => {
    if (!row.is_active) return { label: "معطّل", className: "off" };
    if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return { label: "منتهي", className: "expired" };
    if (Number(row.uses_count) >= Number(row.max_uses)) return { label: "مكتمل الاستخدام", className: "used" };
    return { label: "فعّال", className: "active" };
  };
  const codeRows = () => Array.isArray(state?.codes) ? state.codes : [];
  const subjectFor = (id) => state.subjects.find((subject) => subject.id === id);
  const fileFor = (id) => state.files.find((file) => file.id === id);
  const subjectCodes = (subjectId) => codeRows().filter((row) => row.scope === "file" && row.subject_id === subjectId);
  const fileCodes = (fileId) => codeRows().filter((row) => row.scope === "file" && row.file_id === fileId);
  const globalCodes = () => codeRows().filter((row) => row.scope === "grade9");
  const countLabel = (count) => `${count} ${count === 1 ? "كود" : "أكواد"}`;
  const backButton = (to, label) => `<button type="button" class="code-explorer-back" data-code-explorer-back="${to}">→ ${label}</button>`;

  const subjectScreen = () => {
    const cards = state.subjects.map((subject) => {
      const count = subjectCodes(subject.id).length;
      if (!count) return "";
      return `<button type="button" class="code-explorer-card" data-code-subject="${subject.id}"><span class="code-explorer-symbol">▧</span><span><b>${escapeHtml(subject.name)}</b><small>${countLabel(count)} متاح</small></span><i>‹</i></button>`;
    }).filter(Boolean).join("");
    const global = globalCodes().length ? `<button type="button" class="code-explorer-card code-explorer-global" data-code-global="true"><span class="code-explorer-symbol">◎</span><span><b>الوصول الشامل</b><small>${countLabel(globalCodes().length)} لجميع المواد</small></span><i>‹</i></button>` : "";
    return `${global}${cards || "<p class=\"code-explorer-empty\">لا توجد أكواد مرتبطة بمواد حالياً.</p>"}`;
  };

  const fileScreen = () => {
    const subject = subjectFor(explorer.subjectId);
    const fileIds = [...new Set(subjectCodes(explorer.subjectId).map((row) => row.file_id))];
    const cards = fileIds.map((id) => {
      const file = fileFor(id); const count = fileCodes(id).length;
      return `<button type="button" class="code-explorer-card" data-code-file="${id}"><span class="code-explorer-symbol">▤</span><span><b>${escapeHtml(file?.title || "ملف محذوف")}</b><small>${countLabel(count)} متاح</small></span><i>‹</i></button>`;
    }).join("");
    return `${backButton("subjects", "كل المواد")}<div class="code-explorer-context">${escapeHtml(subject?.name || "المادة")}</div>${cards || "<p class=\"code-explorer-empty\">لا توجد أكواد لهذا الموضوع.</p>"}`;
  };

  const codesScreen = (rows, title, backTarget, backLabel) => {
    const cards = rows.map((row) => {
      const status = statusFor(row);
      const hasText = Boolean(row.code);
      return `<article class="explorer-code-row" data-code-id="${row.id}"><div class="explorer-code-meta"><span class="registry-state ${status.className}">${status.label}</span></div><div class="explorer-code-value" dir="ltr"><code>${hasText ? escapeHtml(row.code) : "رمز قديم غير قابل للاستعادة"}</code>${hasText ? `<button type="button" class="registry-copy" data-code-copy="${escapeHtml(row.code)}">نسخ</button>` : `<button type="button" class="registry-reissue" data-code-reissue="${row.id}">إصدار بديل</button>`}</div>${hasText ? "" : "<p class=\"explorer-legacy-note\">حُفظ هذا الكود السابق كتجزئة فقط؛ لا يمكن استخراج نصه. أصدر بديلاً جديداً لنسخه.</p>"}</article>`;
    }).join("") || "<p class=\"code-explorer-empty\">لا توجد أكواد في هذا الملف.</p>";
    return `${backButton(backTarget, backLabel)}<div class="code-explorer-context">${escapeHtml(title)}</div><div class="explorer-code-list">${cards}</div>`;
  };

  const renderRegistry = () => {
    const grid = document.querySelector("#admin-content .admin-grid");
    if (!grid || !Array.isArray(state?.codes)) return;
    const formDescription = grid.querySelector(".editor-card .panel-title p");
    if (formDescription) formDescription.textContent = "أنشئ أكواداً جديدة؛ تظهر نصوصها في مستكشف المشرف فقط.";
    const legacy = grid.querySelector(".data-card:last-child");
    if (!legacy) return;
    let content = subjectScreen(); let copy = "اختر مادة ثم ملفاً لعرض الأكواد المتاحة.";
    if (explorer.level === "files") { content = fileScreen(); copy = "اختر ملفاً لعرض أكواد الوصول الخاصة به."; }
    if (explorer.level === "codes") { const file = fileFor(explorer.fileId); content = codesScreen(fileCodes(explorer.fileId), file?.title || "الملف", "files", explorer.global ? "الوصول الشامل" : "ملفات المادة"); copy = "الكود مع زر النسخ وحالته الحالية فقط."; }
    if (explorer.level === "global") { content = codesScreen(globalCodes(), "الوصول الشامل", "subjects", "كل المواد"); copy = "أكواد تفتح جميع مواد الصف التاسع."; }
    legacy.outerHTML = `<section class="data-card code-registry" id="admin-code-registry"><header class="panel-title"><span>⌘</span><div><h2>مستكشف أكواد الوصول</h2><p>${copy}</p></div></header><div class="code-explorer-list">${content}</div></section>`;
  };

  const copyCode = async (value) => {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); }
    catch { const field = document.createElement("textarea"); field.value = value; field.style.position = "fixed"; field.style.opacity = "0"; document.body.append(field); field.select(); document.execCommand("copy"); field.remove(); }
    toast("تم نسخ الكود.");
  };
  const reissueLegacyCode = async (id) => {
    const old = codeRows().find((row) => row.id === id);
    if (!old) return;
    if (!window.confirm("سيُنشأ كود بديل جديد ويُعطّل الكود السابق غير القابل للنسخ. هل تريد المتابعة؟")) return;
    try {
      const rows = await rpc("admin_generate_ninth_access_code_batch", { p_scope: old.scope, p_file_id: old.file_id, p_quantity: 1, p_max_uses: old.max_uses, p_expires_at: old.expires_at, p_note: `${old.note || ""} — بديل للكود السابق`.trim() });
      const fresh = (Array.isArray(rows) ? rows : [rows])[0];
      await rpc("admin_set_ninth_code_active", { p_id: old.id, p_is_active: false });
      await loadData(); renderRegistry();
      if (fresh?.code) await copyCode(fresh.code);
      toast("تم إصدار كود بديل وتعطيل الكود السابق.");
    } catch (error) { toast(error.message || "تعذر إصدار الكود البديل.", true); }
  };
  const originalRender = window.render;
  if (typeof originalRender === "function") window.render = (view) => { const output = originalRender(view); if (view === "codes") { explorer.level = "subjects"; explorer.subjectId = null; explorer.fileId = null; explorer.global = false; renderRegistry(); } return output; };
  window.renderCodeRegistry = renderRegistry;
  document.addEventListener("click", async (event) => {
    const copy = event.target.closest("[data-code-copy]"); if (copy) { await copyCode(copy.dataset.codeCopy); return; }
    const subject = event.target.closest("[data-code-subject]"); if (subject) { explorer.level = "files"; explorer.subjectId = subject.dataset.codeSubject; explorer.fileId = null; explorer.global = false; renderRegistry(); return; }
    const file = event.target.closest("[data-code-file]"); if (file) { explorer.level = "codes"; explorer.fileId = file.dataset.codeFile; explorer.global = false; renderRegistry(); return; }
    if (event.target.closest("[data-code-global]")) { explorer.level = "global"; explorer.global = true; renderRegistry(); return; }
    const back = event.target.closest("[data-code-explorer-back]"); if (back) { explorer.level = back.dataset.codeExplorerBack; if (explorer.level === "subjects") explorer.subjectId = null; renderRegistry(); return; }
    const reissue = event.target.closest("[data-code-reissue]"); if (reissue) { await reissueLegacyCode(reissue.dataset.codeReissue); }
  });
})();
