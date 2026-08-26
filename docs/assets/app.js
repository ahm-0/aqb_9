/* مكتبة الطالب: تعرض ذاكرة المواد أولاً، تحدث الشبكة في الخلفية، وتحفظ روابط الملفات المصرح بها فقط. */
const AQB9 = {
  url: "https://rnmqnfprakjwhtkmgarz.supabase.co",
  key: "sb_publishable_LN04XTlWghVnp3Y5ov1wmA_7ZcPcukE",
  cacheKey: "aqb9-file-access",
  catalogKey: "aqb9-catalog-v1",
  filesKey: "aqb9-files-v1",
  openedLinksKey: "aqb9-opened-file-links-v1",
  build: "2026.08.23.17"
};

const state = { subjects: [], files: [], subject: null, target: null, settings: { global_code_price: 0, whatsapp_phone: "" }, cache: readCache() };
let codeDialogHistoryOpen = false;
let skipCodeDialogPop = false;
let syncTimer = 0;
const $ = (selector) => document.querySelector(selector);

function readStore(key, fallback = {}) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
function writeStore(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
function readCache() { return readStore(AQB9.cacheKey, {}); }
function saveCache() { writeStore(AQB9.cacheKey, state.cache); }
function saveCatalog() { writeStore(AQB9.catalogKey, { subjects: state.subjects, settings: state.settings, saved_at: new Date().toISOString() }); }
function readCatalog() { return readStore(AQB9.catalogKey, null); }
function saveSubjectFiles(id, files) { const all = readStore(AQB9.filesKey, {}); all[id] = files; writeStore(AQB9.filesKey, all); }
function cachedSubjectFiles(id) { const all = readStore(AQB9.filesKey, {}); return Object.prototype.hasOwnProperty.call(all, id) ? all[id] : null; }
function readOpenedLinks() { return readStore(AQB9.openedLinksKey, {}); }
function rememberOpenedFile(file) { if (!file?.id || !file?.drive_url) return; const links = readOpenedLinks(); links[file.id] = { drive_url: file.drive_url, title: file.title || "ملف", saved_at: new Date().toISOString() }; writeStore(AQB9.openedLinksKey, links); }
function rememberedFile(id) { return readOpenedLinks()[id] || null; }
function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
function icon(key, name) { const lookup = { calculator: "⌗", atom: "⚛", flask: "⚗", leaf: "♧", bookopen: "▤", "book-open": "▤" }; return lookup[String(key || "").toLowerCase()] || (String(name).includes("رياض") ? "◢" : "▤"); }
function featuredPalette(name = "") { const text = String(name); const palette = [[/رياض/, "#3B82F6", "#6366F1"], [/فيز/, "#8B5CF6", "#A855F7"], [/كيمي/, "#10B981", "#059669"], [/أحي/, "#F59E0B", "#D97706"], [/عرب/, "#EF4444", "#DC2626"], [/إنج|انج/, "#0EA5E9", "#0284C7"], [/فلس/, "#A855F7", "#7C3AED"], [/تاريخ/, "#F97316", "#EA580C"], [/جغرا/, "#14B8A6", "#0D9488"]]; const found = palette.find(([pattern]) => pattern.test(text)); return found ? { from: found[1], to: found[2] } : { from: "#6366F1", to: "#7C3AED" }; }
function applyHeroPalette(name) { const colors = featuredPalette(name); $("#reference-hero").style.background = `linear-gradient(135deg, ${colors.from}, ${colors.to})`; }

function setSyncStatus(message, type = "sync", hideAfter = 0) {
  const bar = $("#sync-status");
  if (!bar) return;
  clearTimeout(syncTimer);
  const label = $("#sync-status-label");
  if (label) label.textContent = message;
  bar.hidden = false;
  bar.classList.toggle("is-offline", type === "offline");
  bar.classList.toggle("is-error", type === "error");
  if (hideAfter) syncTimer = window.setTimeout(() => { bar.hidden = true; }, hideAfter);
}
function hideSyncStatus() { clearTimeout(syncTimer); const bar = $("#sync-status"); if (bar) bar.hidden = true; }

function removeSplashAfterDelay() {
  const tryRemove = (retries = 15) => {
    if (window.AppBridge?.removeSplashScreen) { window.AppBridge.removeSplashScreen(); return; }
    if (retries > 0) window.setTimeout(() => tryRemove(retries - 1), 100);
  };
  const schedule = () => window.setTimeout(tryRemove, 1000);
  if (document.readyState === "complete") schedule(); else window.addEventListener("load", schedule, { once: true });
}

function showAndroidId() {
  const badge = $("#android-id-badge"); if (!badge) return;
  let androidId = "";
  try { androidId = String(window.AppBridge?.getAndroidId?.() || "").trim(); } catch {}
  if (!androidId) { badge.hidden = true; return; }
  badge.textContent = `Android ID: ${androidId}`; badge.hidden = false;
}

function registerOfflineSupport() { if (!("serviceWorker" in navigator)) return; navigator.serviceWorker.register(`sw.js?build=${AQB9.build}`, { scope: "./" }).then((registration) => registration.update()).catch(() => {}); }
async function rpc(name, args = {}) { const response = await fetch(`${AQB9.url}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: AQB9.key, Authorization: `Bearer ${AQB9.key}`, "Content-Type": "application/json" }, body: JSON.stringify(args) }); const data = await response.json().catch(() => null); if (!response.ok) throw new Error(data?.message || "تعذر إتمام الطلب."); return data; }

function directDriveUrl(raw) { try { const url = new URL(raw); const id = url.pathname.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([^/?#]+)/)?.[1] || url.searchParams.get("id"); const isGoogleDrive = url.hostname.endsWith("drive.google.com") || url.hostname.endsWith("docs.google.com"); return isGoogleDrive && id ? `https://drive.google.com/uc?id=${encodeURIComponent(id)}&export=download&confirm=t` : raw; } catch { return raw; } }
function safeCoverUrl(raw) { try { const url = new URL(String(raw || "")); return url.protocol === "https:" ? url.href : ""; } catch { return ""; } }
function openViewer(raw, title) { const url = directDriveUrl(raw); if (window.AppBridge?.openPdfViewer) return window.AppBridge.openPdfViewer(url, title, true); if (window.AppBridge?.openExternalUrl) return window.AppBridge.openExternalUrl(url); window.open(url, "_blank", "noopener"); }
function openAuthorizedFile(file) { if (!file?.drive_url) return; rememberOpenedFile(file); openViewer(file.drive_url, file.title); }

function setStatus(message) { $("#app-status").textContent = message; $("#app-status").hidden = false; $("#subjects-list").hidden = true; $("#files-list").hidden = true; }
function setHero(title, subtitle) { $("#hero-title").textContent = title; $("#hero-subtitle").textContent = subtitle; }
function resetToSubjects() { state.subject = null; state.files = []; renderSubjects(); }

function renderSubjects() {
  const root = $("#subjects-list");
  $("#app-status").hidden = true; root.hidden = false; $("#files-list").hidden = true;
  $("#reference-hero").classList.remove("is-files"); $("#open-global-code").classList.remove("hidden"); setHero("الصف التاسع", "اختر المادة لعرض الملفات"); applyHeroPalette();
  if (!state.subjects.length) { root.innerHTML = '<div class="reference-empty">لا توجد مواد منشورة حالياً</div>'; return; }
  root.innerHTML = state.subjects.map((subject) => { const colors = featuredPalette(subject.name); return `<button class="reference-card" style="--from:${colors.from};--to:${colors.to}" data-subject="${subject.id}"><span class="reference-card-icon">${icon(subject.icon_key, subject.name)}</span><span class="reference-card-copy"><b>${escapeHtml(subject.name)}</b><small>ملفات حصرية</small></span><i class="reference-card-arrow">‹</i></button>`; }).join("");
  root.querySelectorAll("[data-subject]").forEach((button) => { button.onclick = () => openSubject(button.dataset.subject); });
}

async function openSubject(id, pushHistory = true) {
  const subject = state.subjects.find((item) => item.id === id); if (!subject) return;
  state.subject = subject;
  if (pushHistory) history.pushState({ aqb9Subject: id }, "", `${location.pathname}${location.search}#subject=${encodeURIComponent(id)}`);
  $("#open-global-code").classList.add("hidden"); setHero(subject.name, "ملفات حصرية متاحة"); applyHeroPalette(subject.name);
  const localFiles = cachedSubjectFiles(id);
  if (localFiles !== null) { state.files = localFiles; renderFiles(); setSyncStatus("جارٍ تحديث ملفات المادة…", "sync", 5000); }
  else setStatus("جارٍ تحميل الملفات…");
  if (!navigator.onLine) {
    if (localFiles !== null) setSyncStatus("تعمل النسخة المحفوظة من ملفات المادة دون إنترنت.", "offline", 4500);
    else { state.files = []; renderFiles(); setSyncStatus("لا توجد نسخة محلية لملفات هذه المادة بعد.", "offline", 4500); }
    return;
  }
  try {
    state.files = await rpc("list_ninth_files", { p_subject_id: id }); saveSubjectFiles(id, state.files); renderFiles(); hideSyncStatus();
  } catch {
    if (localFiles !== null) { state.files = localFiles; renderFiles(); setSyncStatus("تعذر التحديث؛ تظهر آخر ملفات محفوظة.", "error", 4500); }
    else { state.files = []; renderFiles(); setSyncStatus("تعذر تحميل ملفات المادة.", "error", 4500); }
  }
}

function renderFiles() {
  const root = $("#files-list"); const files = state.files;
  $("#app-status").hidden = true; root.hidden = false; $("#subjects-list").hidden = true;
  if (!files.length) { root.innerHTML = '<div class="reference-empty">لا توجد ملفات منشورة لهذه المادة</div>'; return; }
  const colors = featuredPalette(state.subject?.name);
  root.innerHTML = files.map((file) => { const cover = safeCoverUrl(file.cover_url); const media = cover ? `<img src="${escapeHtml(cover)}" alt="معاينة ${escapeHtml(file.title)}" loading="lazy" referrerpolicy="no-referrer">` : `<span class="file-cover-placeholder" aria-hidden="true">▤</span>`; return `<article class="reference-card file-card" style="--from:${colors.from};--to:${colors.to}"><header class="file-card-head"><span class="file-title-row"><b>${escapeHtml(file.title)}</b><em class="vip-badge">VIP</em></span></header><div class="file-cover">${media}</div><footer class="file-card-footer"><button class="file-open-button" type="button" data-file="${file.id}" aria-label="فتح ملف ${escapeHtml(file.title)}">فتح الملف <span aria-hidden="true">←</span></button></footer></article>`; }).join("");
  root.querySelectorAll("[data-file]").forEach((button) => { button.onclick = () => requestAccess(button.dataset.file); });
}

function requestAccess(id) {
  const file = state.files.find((item) => item.id === id); if (!file) return;
  const unlocked = state.cache[id] || rememberedFile(id);
  if (unlocked?.drive_url) { openAuthorizedFile({ id, drive_url: unlocked.drive_url, title: unlocked.title || file.title }); return; }
  state.target = file; showDialog(`كود الوصول إلى ${file.title}`);
}

function formatPrice(value) { const amount = Number(value); return Number.isFinite(amount) && amount > 0 ? `${amount.toLocaleString("ar-SY")} ل.س` : "تواصل عبر واتساب لمعرفة السعر"; }
function phoneNumber(value) { return String(value || "").replace(/\D/g, ""); }
function updateCodeContact() {
  const contact = $("#code-contact"), title = $("#code-contact-title"), price = $("#code-contact-price"); const global = state.target === "global";
  const item = global ? { name: "كود الوصول الشامل", price: state.settings.global_code_price, phone: state.settings.whatsapp_phone } : state.target || {};
  const phone = phoneNumber(item.phone || item.whatsapp_phone); title.textContent = `لشراء ${item.name || "كود الوصول"}`; price.textContent = formatPrice(item.price); contact.hidden = false;
  if (!phone) { contact.href = "#"; contact.target = "_self"; contact.setAttribute("aria-disabled", "true"); contact.onclick = (event) => { event.preventDefault(); toast("رقم واتساب غير مضاف بعد في الإعدادات.", true); }; return; }
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(`مرحباً، أريد شراء ${item.name || "كود الوصول"} للصف التاسع.`)}`;
  contact.href = whatsappUrl; contact.target = "_blank"; contact.removeAttribute("aria-disabled"); contact.onclick = (event) => { event.preventDefault(); if (window.AppBridge?.openExternalUrl) return window.AppBridge.openExternalUrl(whatsappUrl); window.open(whatsappUrl, "_blank", "noopener"); };
}

function closeCodeDialog(fromHistory = false) { const dialog = $("#code-dialog"); if (!dialog.open) return; dialog.close(); if (codeDialogHistoryOpen && !fromHistory) { skipCodeDialogPop = true; codeDialogHistoryOpen = false; history.back(); return; } codeDialogHistoryOpen = false; }
function showDialog(title) {
  const dialog = $("#code-dialog"); const global = state.target === "global";
  $("#code-target").textContent = title; $("#code-dialog-description").textContent = global ? "يفتح جميع ملفات الصف التاسع" : "أدخل الكود لفتح هذا الملف."; $("#verify-code").innerHTML = `${global ? "تفعيل الوصول الشامل" : "تفعيل الوصول"} <span aria-hidden="true">◎</span>`;
  $("#access-code").value = ""; $("#code-error").textContent = ""; updateCodeContact();
  if (!dialog.open) { history.pushState({ ...history.state, aqb9Dialog: "access-code" }, "", `${location.pathname}${location.search}${location.hash}`); codeDialogHistoryOpen = true; dialog.showModal(); }
  $("#close-code-dialog").focus({ preventScroll: true });
}

async function redeem(code) {
  const data = await rpc("redeem_ninth_access_code", { p_code: code }); const files = data?.files || [];
  if (!files.length) throw new Error("لا توجد ملفات متاحة لهذا الكود.");
  files.forEach((file) => { state.cache[file.id] = file; }); saveCache(); closeCodeDialog();
  if (state.target && state.target !== "global") { const active = state.cache[state.target.id]; if (active) openAuthorizedFile(active); }
  else toast(`تم تفعيل ${files.length} ملفاً.`);
  if (state.subject) renderFiles();
}

function toast(message, error = false) { const item = document.createElement("div"); item.className = `toast${error ? " error" : ""}`; item.textContent = message; document.body.append(item); setTimeout(() => item.remove(), 3500); }

async function refreshCatalog() {
  const hadCachedContent = state.subjects.length > 0;
  if (!navigator.onLine) {
    if (hadCachedContent) setSyncStatus("تعمل النسخة المحفوظة دون إنترنت.", "offline", 4500);
    else setStatus("لا توجد نسخة محفوظة بعد. اتصل بالإنترنت مرة واحدة لحفظ المكتبة على الجهاز.");
    return;
  }
  if (hadCachedContent) setSyncStatus("جارٍ تحديث البيانات…", "sync", 5000);
  try {
    const [subjects, settings] = await Promise.all([rpc("list_ninth_subjects"), rpc("get_ninth_settings")]);
    state.subjects = subjects || []; state.settings = settings?.[0] || state.settings; saveCatalog();
    if (state.subject) {
      const subjectId = state.subject.id; const refreshedSubject = state.subjects.find((item) => item.id === subjectId);
      if (refreshedSubject) { state.subject = refreshedSubject; await openSubject(subjectId, false); }
      else resetToSubjects();
    } else renderSubjects();
    if (!state.subject) hideSyncStatus();
  } catch {
    if (hadCachedContent) setSyncStatus("تعذر التحديث؛ تظهر النسخة المحفوظة.", "error", 4500);
    else setStatus("تعذر تحميل المحتوى. اتصل بالإنترنت أولاً لحفظ المكتبة على هذا الجهاز.");
  }
}

function load() {
  if (!history.state?.aqb9Subject) history.replaceState({ aqb9View: "subjects" }, "", `${location.pathname}${location.search}`);
  const catalog = readCatalog();
  if (catalog?.subjects?.length) { state.subjects = catalog.subjects; state.settings = catalog.settings || state.settings; renderSubjects(); setSyncStatus("جارٍ تحديث البيانات…", "sync", 5000); }
  else setStatus("جارٍ تحميل المحتوى…");
  refreshCatalog();
}

$("#open-global-code").onclick = () => { state.target = "global"; showDialog("تفعيل كود الوصول الشامل"); };
$("#close-code-dialog").onclick = () => closeCodeDialog();
$("#code-dialog").addEventListener("cancel", (event) => { event.preventDefault(); closeCodeDialog(); });
$("#code-form").onsubmit = async (event) => { event.preventDefault(); const button = $("#verify-code"); button.disabled = true; $("#code-error").textContent = ""; try { await redeem($("#access-code").value.trim()); } catch (error) { $("#code-error").textContent = error.message || "الكود غير صحيح."; } finally { button.disabled = false; } };
window.addEventListener("popstate", (event) => { if (skipCodeDialogPop) { skipCodeDialogPop = false; return; } if ($("#code-dialog").open) { closeCodeDialog(true); return; } const id = event.state?.aqb9Subject; if (id) openSubject(id, false); else if (state.subject) resetToSubjects(); });
window.addEventListener("online", () => refreshCatalog());
window.addEventListener("offline", () => setSyncStatus("تم الانتقال إلى النسخة المحفوظة دون إنترنت.", "offline", 4500));
showAndroidId(); removeSplashAfterDelay(); registerOfflineSupport(); load();
