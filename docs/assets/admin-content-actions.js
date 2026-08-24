/* إدارة المواد والملفات: إضافة أدوات تعديل وحذف فوق دوال RPC الإدارية المحمية الموجودة. */
(() => {
  const byId = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const safeText = (value) => String(value ?? "").trim();
  const currentView = () => document.querySelector("#admin-nav button.active")?.dataset.view;
  const refresh = async (view) => { await loadData(); window.render(view); };

  const ensureDialog = () => {
    if (byId("admin-edit-dialog")) return;
    document.body.insertAdjacentHTML("beforeend", `<dialog class="admin-edit-dialog" id="admin-edit-dialog"><form id="admin-edit-form" method="dialog"><header class="admin-edit-head"><div><p class="eyebrow" id="admin-edit-eyebrow">تعديل</p><h2 id="admin-edit-title"></h2></div><button type="button" class="admin-edit-close" id="admin-edit-close" aria-label="إغلاق">×</button></header><div class="admin-edit-fields" id="admin-edit-fields"></div><small class="form-error" id="admin-edit-error" aria-live="polite"></small><footer class="admin-edit-footer"><button type="button" class="secondary-button" id="admin-edit-cancel">إلغاء</button><button type="submit" class="primary-button" id="admin-edit-save">حفظ التعديل</button></footer></form></dialog>`);
    byId("admin-edit-close").onclick = () => byId("admin-edit-dialog").close();
    byId("admin-edit-cancel").onclick = () => byId("admin-edit-dialog").close();
  };

  const subjectFields = (subject) => `<label>اسم المادة<input name="name" required value="${escapeHtml(subject.name)}"></label><label>الوصف القصير<textarea name="description">${escapeHtml(subject.description || "")}</textarea></label><div class="form-row"><label>رمز المادة<select name="icon"><option value="book-open">book-open</option><option value="calculator">calculator</option><option value="atom">atom</option><option value="flask">flask</option><option value="leaf">leaf</option></select></label><label>الترتيب<input name="sort" type="number" value="${Number(subject.sort_order) || 0}"></label></div><div class="form-row"><label>لون البداية<input name="from" type="color" value="${escapeHtml(subject.color_from || "#312e81")}"></label><label>لون النهاية<input name="to" type="color" value="${escapeHtml(subject.color_to || "#4f46e5")}"></label></div><label class="toggle"><input name="active" type="checkbox" ${subject.is_active ? "checked" : ""}> نشر المادة للطلاب</label>`;
  const fileFields = (file) => `<label>المادة<select name="subject" required>${state.subjects.map((subject) => `<option value="${subject.id}" ${subject.id === file.subject_id ? "selected" : ""}>${escapeHtml(subject.name)}</option>`).join("")}</select></label><label>عنوان الملف<input name="title" required value="${escapeHtml(file.title)}"></label><label>رابط Google Drive<input name="drive" type="url" required value="${escapeHtml(file.drive_url)}"></label><label>وصف الطالب<textarea name="description">${escapeHtml(file.description || "")}</textarea></label><div class="form-row"><label>السعر<input name="price" type="number" min="0" step="0.01" value="${Number(file.price) || 0}"></label><label>الترتيب<input name="sort" type="number" value="${Number(file.sort_order) || 0}"></label></div><label>رقم واتساب<input name="phone" value="${escapeHtml(file.whatsapp_phone || "")}" placeholder="9639XXXXXXXX"></label><label>اسم المدرس أو المُعد<input name="teacher" value="${escapeHtml(file.teacher_name || "")}"></label><label class="toggle"><input name="published" type="checkbox" ${file.is_published ? "checked" : ""}> نشر الملف للطلاب</label>`;

  const openEditor = (type, id) => {
    ensureDialog();
    const record = type === "subject" ? state.subjects.find((item) => item.id === id) : state.files.find((item) => item.id === id);
    if (!record) return toast("تعذر العثور على العنصر المطلوب.", true);
    const dialog = byId("admin-edit-dialog");
    byId("admin-edit-eyebrow").textContent = type === "subject" ? "تعديل مادة" : "تعديل ملف";
    byId("admin-edit-title").textContent = record.name || record.title;
    byId("admin-edit-fields").innerHTML = type === "subject" ? subjectFields(record) : fileFields(record);
    if (type === "file" && !dialog.querySelector('input[name="cover"]')) {
      const driveLabel = dialog.querySelector('input[name="drive"]')?.closest("label");
      if (driveLabel) {
        const coverLabel = document.createElement("label");
        coverLabel.innerHTML = `رابط صورة معاينة الملف <small>اختياري للملفات القديمة</small><input name="cover" type="url" inputmode="url" value="${escapeHtml(record.cover_url || "")}" placeholder="https://example.com/file-preview.jpg">`;
        driveLabel.insertAdjacentElement("beforebegin", coverLabel);
      }
    }
    const iconSelect = dialog.querySelector('select[name="icon"]');
    if (iconSelect) iconSelect.value = record.icon_key || "book-open";
    byId("admin-edit-error").textContent = "";
    const form = byId("admin-edit-form");
    form.onsubmit = async (event) => {
      event.preventDefault();
      const values = new FormData(form); const button = byId("admin-edit-save");
      button.disabled = true; byId("admin-edit-error").textContent = "";
      try {
        if (type === "subject") {
          await rpc("admin_update_ninth_subject", { p_id: record.id, p_name: safeText(values.get("name")), p_slug: record.slug, p_description: safeText(values.get("description")), p_icon_key: values.get("icon"), p_color_from: values.get("from"), p_color_to: values.get("to"), p_sort_order: Number(values.get("sort") || 0), p_is_active: values.has("active") });
        } else {
          const driveUrl = safeText(values.get("drive"));
          const coverUrl = safeText(values.get("cover"));
          if (!/^https:\/\//i.test(driveUrl)) throw new Error("أضف رابط Google Drive صحيحاً يبدأ بـ https://");
          if (coverUrl && !/^https:\/\//i.test(coverUrl)) throw new Error("أضف رابط صورة صحيحاً يبدأ بـ https://");
          await rpc("admin_update_ninth_file", { p_id: record.id, p_subject_id: values.get("subject"), p_title: safeText(values.get("title")), p_description: safeText(values.get("description")), p_cover_url: coverUrl || null, p_drive_url: driveUrl, p_price: Number(values.get("price") || 0), p_whatsapp_phone: safeText(values.get("phone")), p_teacher_name: safeText(values.get("teacher")), p_sort_order: Number(values.get("sort") || 0), p_is_published: values.has("published") });
        }
        dialog.close(); await refresh(type === "subject" ? "subjects" : "files"); toast("تم حفظ التعديل.");
      } catch (error) { byId("admin-edit-error").textContent = error.message || "تعذر حفظ التعديل."; }
      finally { button.disabled = false; }
    };
    dialog.showModal();
  };

  const deleteRecord = async (type, id) => {
    const record = type === "subject" ? state.subjects.find((item) => item.id === id) : state.files.find((item) => item.id === id);
    if (!record) return;
    const title = record.name || record.title;
    const warning = type === "subject" ? "سيُحذف معها كل ملفاتها وأكوادها المرتبطة." : "سيُحذف معه كل كود وصول مرتبط به.";
    if (!window.confirm(`هل تريد حذف «${title}»؟ ${warning} لا يمكن التراجع عن هذا الإجراء.`)) return;
    try {
      await rpc(type === "subject" ? "admin_delete_ninth_subject" : "admin_delete_ninth_file", { p_id: id });
      await refresh(type === "subject" ? "subjects" : "files"); toast("تم الحذف بنجاح.");
    } catch (error) { toast(error.message || "تعذر الحذف.", true); }
  };

  const injectActions = (view) => {
    if (view !== "subjects" && view !== "files") return;
    const records = view === "subjects" ? state.subjects : state.files;
    document.querySelectorAll("#admin-content .manage-item").forEach((item, index) => {
      const record = records[index]; if (!record || item.querySelector(".manage-actions")) return;
      const type = view === "subjects" ? "subject" : "file";
      item.insertAdjacentHTML("beforeend", `<div class="manage-actions"><button type="button" data-edit-${type}="${record.id}">تعديل</button><button type="button" class="manage-delete" data-delete-${type}="${record.id}">حذف</button></div>`);
    });
  };

  const originalRender = window.render;
  if (typeof originalRender === "function") window.render = (view) => { const output = originalRender(view); injectActions(view); return output; };
  document.addEventListener("click", (event) => {
    const editSubject = event.target.closest("[data-edit-subject]"); const editFile = event.target.closest("[data-edit-file]");
    const deleteSubject = event.target.closest("[data-delete-subject]"); const deleteFile = event.target.closest("[data-delete-file]");
    if (editSubject) openEditor("subject", editSubject.dataset.editSubject);
    if (editFile) openEditor("file", editFile.dataset.editFile);
    if (deleteSubject) deleteRecord("subject", deleteSubject.dataset.deleteSubject);
    if (deleteFile) deleteRecord("file", deleteFile.dataset.deleteFile);
  });
  if (currentView()) injectActions(currentView());
})();
