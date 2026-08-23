/* حماية واجهة الطالب: ردع النسخ والتحديد وقائمة الزر الأيمن مع إبقاء حقول الإدخال قابلة للاستخدام. */
(() => {
  const editableTarget = (target) => target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  const blockOutsideFields = (event) => { if (!editableTarget(event.target)) event.preventDefault(); };
  document.addEventListener("contextmenu", (event) => event.preventDefault(), true);
  document.addEventListener("copy", blockOutsideFields, true);
  document.addEventListener("cut", blockOutsideFields, true);
  document.addEventListener("dragstart", blockOutsideFields, true);
  document.addEventListener("selectstart", blockOutsideFields, true);
  document.addEventListener("keydown", (event) => {
    if (editableTarget(event.target)) return;
    const key = String(event.key || "").toLowerCase();
    if ((event.ctrlKey || event.metaKey) && ["a", "c", "x", "s", "u", "p"].includes(key)) event.preventDefault();
    if (event.key === "F12") event.preventDefault();
  }, true);
})();
