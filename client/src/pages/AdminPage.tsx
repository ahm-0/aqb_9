/** تصميم مكتبة الطالب المميزة: لوحة مشرف جانبية عملية وآمنة، منفصلة عن رحلة الطالب العامة. */
import { BookOpen, Check, ChevronLeft, CircleDollarSign, FilePlus2, FileText, KeyRound, LayoutDashboard, LoaderCircle, LogOut, Menu, Plus, Save, Settings2, ShieldAlert, ShieldCheck, Trash2, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";
import { SubjectIcon } from "@/components/SubjectIcon";
import { assetUrl } from "@/lib/assets";
import { supabase } from "@/lib/supabase";
import type { AdminCode, AdminFile, AdminSubject, SiteSettings } from "@/lib/types";

type Tab = "overview" | "subjects" | "files" | "codes" | "settings";
const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { id: "subjects", label: "المواد", icon: BookOpen },
  { id: "files", label: "الملفات", icon: FileText },
  { id: "codes", label: "أكواد الوصول", icon: KeyRound },
  { id: "settings", label: "الإعدادات", icon: Settings2 },
];

const emptySubject = { name: "", slug: "", description: "", icon_key: "book-open", color_from: "#312E81", color_to: "#4F46E5", sort_order: 0, is_active: true };
const emptyFile = { subject_id: "", title: "", description: "", cover_url: "", drive_url: "", price: 0, whatsapp_phone: "", teacher_name: "", sort_order: 0, is_published: true };

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [files, setFiles] = useState<AdminFile[]>([]);
  const [codes, setCodes] = useState<AdminCode[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({ global_code_price: 0, whatsapp_phone: "" });
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    void verifyAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function verifyAndLoad() {
    setCheckingAccess(true);
    const { error } = await supabase.rpc("admin_list_ninth_subjects");
    if (error) {
      setIsAdmin(false);
      setCheckingAccess(false);
      return;
    }
    setIsAdmin(true);
    setCheckingAccess(false);
    await loadData();
  }

  async function loadData() {
    setLoadingData(true);
    const [subjectResult, fileResult, codeResult, settingsResult] = await Promise.all([
      supabase.rpc("admin_list_ninth_subjects"),
      supabase.rpc("admin_list_ninth_files"),
      supabase.rpc("admin_list_ninth_codes"),
      supabase.rpc("get_ninth_settings"),
    ]);
    if (subjectResult.error || fileResult.error || codeResult.error) {
      toast.error("تعذر تحميل بعض بيانات الإدارة. تحقق من صلاحية المشرف.");
    } else {
      setSubjects((subjectResult.data || []) as AdminSubject[]);
      setFiles((fileResult.data || []) as AdminFile[]);
      setCodes((codeResult.data || []) as AdminCode[]);
    }
    if (!settingsResult.error && settingsResult.data?.[0]) setSettings(settingsResult.data[0] as SiteSettings);
    setLoadingData(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج.");
  }

  if (authLoading || checkingAccess) return <AdminLoading />;
  if (!session) return <AdminSignIn />;
  if (!isAdmin) return <NotAuthorized email={session.user.email || ""} onSignOut={signOut} />;

  const currentTab = tabs.find((item) => item.id === tab)!;
  const fileCount = files.filter((file) => file.is_published).length;
  const activeCodes = codes.filter((code) => code.is_active && code.uses_count < code.max_uses).length;

  return (
    <main className="admin-app" dir="rtl">
      <aside className={`admin-sidebar ${sidebarOpen ? "admin-sidebar--open" : ""}`}>
        <div className="sidebar-brand"><BrandMark /><button className="icon-button mobile-sidebar-close" onClick={() => setSidebarOpen(false)}><X size={19} /></button></div>
        <p className="sidebar-kicker">إدارة المحتوى</p>
        <nav>{tabs.map((item) => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? "nav-item nav-item--active" : "nav-item"} onClick={() => { setTab(item.id); setSidebarOpen(false); }}><Icon size={19} /><span>{item.label}</span><ChevronLeft size={16} /></button>; })}</nav>
        <div className="sidebar-user"><div className="user-avatar">{(session.user.email || "م").slice(0, 1).toUpperCase()}</div><div><strong>مشرف الصف التاسع</strong><small>{session.user.email}</small></div><button onClick={() => void signOut()} aria-label="تسجيل الخروج"><LogOut size={18} /></button></div>
      </aside>
      {sidebarOpen && <button className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة" />}

      <section className="admin-main">
        <header className="admin-topbar"><button className="icon-button mobile-menu-button" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button><div><p className="eyebrow">لوحة المشرف</p><h1>{currentTab.label}</h1></div><div className="secure-chip"><ShieldCheck size={17} /> محمي بتسجيل الدخول</div></header>
        <div className="admin-content">
          {loadingData ? <div className="loading-area"><LoaderCircle className="spin" size={26} /> نحدّث البيانات…</div> : (
            <>
              {tab === "overview" && <Overview subjects={subjects.length} files={fileCount} codes={activeCodes} onNavigate={setTab} />}
              {tab === "subjects" && <SubjectsPanel subjects={subjects} onChanged={loadData} />}
              {tab === "files" && <FilesPanel subjects={subjects} files={files} onChanged={loadData} />}
              {tab === "codes" && <CodesPanel files={files} codes={codes} onChanged={loadData} />}
              {tab === "settings" && <SettingsPanel settings={settings} onChanged={loadData} />}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function AdminLoading() { return <main className="admin-auth-screen" dir="rtl"><div className="admin-auth-card"><BrandMark /><LoaderCircle className="spin" size={28} /><p>نتحقق من صلاحية الوصول…</p></div></main>; }

function AdminSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("بيانات الدخول غير صحيحة أو لم يتم تفعيل الحساب.");
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.href } });
      if (error) toast.error(error.message);
      else toast.success("تم إنشاء الحساب. راجع بريدك لتأكيده، ثم يحتاج مالك المشروع إلى منحه صلاحية المشرف مرة واحدة.");
    }
    setPending(false);
  }

  return <main className="admin-auth-screen" dir="rtl"><section className="admin-auth-layout"><div className="auth-art"><img src={assetUrl("aqb9-admin-study.png")} alt="أدوات دراسة مرتبة" /><div className="auth-art-library-note"><ShieldCheck size={18} /><span>بوابة إدارة مكتبة الصف التاسع</span></div></div><div className="admin-auth-card"><BrandMark /><div className="auth-system-label"><BookOpen size={15} /> أدوات المواد والملفات والأكواد</div><p className="eyebrow">رابط إدارة خاص</p><h1>{mode === "login" ? "دخول المشرف" : "إنشاء حساب للمشرف"}</h1><p>لن تظهر أدوات إدارة المواد والأكواد إلا بعد التحقق من الحساب وصلاحية المشرف في قاعدة البيانات.</p><form onSubmit={submit}><label>البريد الإلكتروني<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label><label>كلمة المرور<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label><button className="primary-button full-button" disabled={pending} type="submit">{pending ? <LoaderCircle className="spin" size={18} /> : null}{mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}</button></form><button className="text-button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "ليس لديك حساب؟ أنشئ حساباً" : "لديك حساب؟ سجّل الدخول"}</button></div></section></main>;
}

function NotAuthorized({ email, onSignOut }: { email: string; onSignOut: () => Promise<void> }) {
  return <main className="admin-auth-screen" dir="rtl"><section className="access-denied-card"><div className="denied-icon"><ShieldAlert size={31} /></div><p className="eyebrow">تم تسجيل الدخول</p><h1>هذا الحساب ليس مشرفاً بعد</h1><p>الحساب <strong>{email}</strong> موجود، لكن قاعدة البيانات لا تمنحه صلاحية إدارة القسم. أضفه مرة واحدة إلى جدول المشرفين من تعليمات المشروع، ثم أعد المحاولة.</p><button className="secondary-button" onClick={() => void onSignOut()}><LogOut size={17} /> تسجيل الخروج</button></section></main>;
}

function Overview({ subjects, files, codes, onNavigate }: { subjects: number; files: number; codes: number; onNavigate: (tab: Tab) => void }) {
  return <><div className="admin-welcome"><div><p className="eyebrow">إدارة مبسطة</p><h2>أنت تتحكم بتجربة الطالب كاملة.</h2><p>أضف المواد والملفات، حدد الأسعار والتواصل، وأنشئ كوداً منفرداً أو كوداً شاملاً للصف التاسع.</p></div><div className="admin-welcome-orbit"><KeyRound size={38} /></div></div><div className="metric-grid"><Metric icon={BookOpen} label="المواد" value={subjects} accent="violet" /><Metric icon={FileText} label="الملفات المنشورة" value={files} accent="blue" /><Metric icon={KeyRound} label="أكواد فعالة" value={codes} accent="teal" /></div><div className="admin-next-steps"><h3>خطوات سريعة</h3><div><button onClick={() => onNavigate("subjects")}><Plus size={18} /><span><strong>أضف مادة</strong><small>أنشئ لوناً ورمزاً وترتيباً للمادة.</small></span><ChevronLeft size={18} /></button><button onClick={() => onNavigate("files")}><FilePlus2 size={18} /><span><strong>أضف ملفاً</strong><small>اربطه بمادة ورابط Google Drive مباشر.</small></span><ChevronLeft size={18} /></button><button onClick={() => onNavigate("codes")}><KeyRound size={18} /><span><strong>أنشئ كود وصول</strong><small>مفرد لملف أو شامل لكل ملفات التاسع.</small></span><ChevronLeft size={18} /></button></div></div></>;
}

function Metric({ icon: Icon, label, value, accent }: { icon: typeof BookOpen; label: string; value: number; accent: string }) { return <article className={`metric-card metric-card--${accent}`}><span><Icon size={22} /></span><div><strong>{value}</strong><small>{label}</small></div></article>; }

function SubjectsPanel({ subjects, onChanged }: { subjects: AdminSubject[]; onChanged: () => Promise<void> }) {
  const [form, setForm] = useState(emptySubject);
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setPending(true); const { error } = await supabase.rpc("admin_create_ninth_subject", { p_name: form.name, p_slug: form.slug, p_description: form.description, p_icon_key: form.icon_key, p_color_from: form.color_from, p_color_to: form.color_to, p_sort_order: Number(form.sort_order), p_is_active: form.is_active }); if (error) toast.error("تعذر إضافة المادة. تأكد من تميّز الرابط المختصر."); else { toast.success("تمت إضافة المادة."); setForm(emptySubject); await onChanged(); } setPending(false); }
  async function deleteSubject(id: string) { if (!window.confirm("هل تريد حذف المادة؟ لا يمكن حذف مادة مرتبطة بملفات.")) return; const { error } = await supabase.rpc("admin_delete_ninth_subject", { p_id: id }); if (error) toast.error("تعذر الحذف: انقل أو احذف ملفات المادة أولاً."); else { toast.success("حُذفت المادة."); await onChanged(); } }
  return <div className="admin-two-columns"><form className="editor-card" onSubmit={submit}><PanelTitle icon={Plus} title="إضافة مادة" copy="ستظهر المادة مباشرة في قائمة الطالب إذا كانت نشطة." /><Field label="اسم المادة"><input value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: الرياضيات" /></Field><Field label="رابط مختصر بالإنجليزية"><input value={form.slug} required pattern="[a-z0-9-]+" onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="mathematics" /></Field><Field label="وصف قصير"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="ملفات مراجعة وتمارين" /></Field><div className="form-row"><Field label="رمز المادة"><select value={form.icon_key} onChange={(e) => setForm({ ...form, icon_key: e.target.value })}>{["book-open", "calculator", "atom", "flask", "leaf", "book-text", "globe2", "map", "lightbulb"].map((key) => <option key={key}>{key}</option>)}</select></Field><Field label="الترتيب"><input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field></div><div className="form-row"><ColorField label="لون البداية" value={form.color_from} onChange={(value) => setForm({ ...form, color_from: value })} /><ColorField label="لون النهاية" value={form.color_to} onChange={(value) => setForm({ ...form, color_to: value })} /></div><Toggle label="نشر المادة للطلاب" checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} /><button className="primary-button full-button" disabled={pending}>{pending ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} إضافة المادة</button></form><section className="data-card"><PanelTitle icon={BookOpen} title="المواد الحالية" copy={`${subjects.length} مادة محفوظة`} /><div className="manage-list">{subjects.map((subject) => <article className="manage-item" key={subject.id}><span className="manage-subject-icon" style={{ background: `linear-gradient(135deg, ${subject.color_from}, ${subject.color_to})` }}><SubjectIcon iconKey={subject.icon_key} size={19} /></span><div><strong>{subject.name}</strong><small>{subject.slug} · {subject.is_active ? "منشورة" : "مخفية"}</small></div><button className="danger-icon" aria-label={`حذف ${subject.name}`} onClick={() => void deleteSubject(subject.id)}><Trash2 size={17} /></button></article>)}{!subjects.length && <p className="empty-mini">أضف أول مادة من النموذج المجاور.</p>}</div></section></div>;
}

function FilesPanel({ subjects, files, onChanged }: { subjects: AdminSubject[]; files: AdminFile[]; onChanged: () => Promise<void> }) {
  const [form, setForm] = useState({ ...emptyFile, subject_id: subjects[0]?.id || "" });
  const [pending, setPending] = useState(false);
  useEffect(() => { if (!form.subject_id && subjects[0]) setForm((old) => ({ ...old, subject_id: subjects[0].id })); }, [subjects, form.subject_id]);
  async function submit(event: React.FormEvent) { event.preventDefault(); setPending(true); const { error } = await supabase.rpc("admin_create_ninth_file", { p_subject_id: form.subject_id, p_title: form.title, p_description: form.description, p_cover_url: form.cover_url || null, p_drive_url: form.drive_url, p_price: Number(form.price), p_whatsapp_phone: form.whatsapp_phone, p_teacher_name: form.teacher_name, p_sort_order: Number(form.sort_order), p_is_published: form.is_published }); if (error) toast.error("تعذر إضافة الملف. تحقق من المادة والرابط."); else { toast.success("تمت إضافة الملف."); setForm({ ...emptyFile, subject_id: subjects[0]?.id || "" }); await onChanged(); } setPending(false); }
  async function deleteFile(id: string) { if (!window.confirm("هل تريد حذف الملف نهائياً؟")) return; const { error } = await supabase.rpc("admin_delete_ninth_file", { p_id: id }); if (error) toast.error("تعذر حذف الملف."); else { toast.success("حُذف الملف."); await onChanged(); } }
  const subjectName = (id: string) => subjects.find((subject) => subject.id === id)?.name || "مادة محذوفة";
  return <div className="admin-two-columns"><form className="editor-card" onSubmit={submit}><PanelTitle icon={FilePlus2} title="إضافة ملف" copy="لا تخزن الملفات هنا؛ أضف رابط المشاركة من Google Drive." />{!subjects.length ? <p className="form-note">أضف مادة واحدة على الأقل قبل إضافة الملفات.</p> : <><Field label="المادة"><select value={form.subject_id} required onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></Field><Field label="عنوان الملف"><input value={form.title} required onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="ملخص الوحدة الأولى" /></Field><Field label="رابط Google Drive"><input type="url" value={form.drive_url} required onChange={(e) => setForm({ ...form, drive_url: e.target.value })} placeholder="https://drive.google.com/file/d/.../view" /></Field><Field label="وصف للطالب"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="ما الذي يتضمنه الملف؟" /></Field><div className="form-row"><Field label="السعر"><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field><Field label="الترتيب"><input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field></div><Field label="رقم واتساب للتواصل"><input value={form.whatsapp_phone} onChange={(e) => setForm({ ...form, whatsapp_phone: e.target.value })} placeholder="9639XXXXXXXX" /></Field><Field label="اسم المدرس أو المُعد"><input value={form.teacher_name} onChange={(e) => setForm({ ...form, teacher_name: e.target.value })} placeholder="اختياري" /></Field><Field label="رابط صورة الغلاف"><input type="url" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="اختياري" /></Field><Toggle label="نشر الملف للطلاب" checked={form.is_published} onChange={(value) => setForm({ ...form, is_published: value })} /><button className="primary-button full-button" disabled={pending}>{pending ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} إضافة الملف</button></>}</form><section className="data-card"><PanelTitle icon={FileText} title="الملفات الحالية" copy={`${files.length} ملف محفوظ`} /><div className="manage-list">{files.map((file) => <article className="manage-item manage-item--file" key={file.id}><span className="file-mini-icon"><FileText size={18} /></span><div><strong>{file.title}</strong><small>{subjectName(file.subject_id)} · {file.is_published ? "منشور" : "مخفي"} · {Number(file.price) > 0 ? `${file.price} $` : "مجاني"}</small></div><button className="danger-icon" aria-label={`حذف ${file.title}`} onClick={() => void deleteFile(file.id)}><Trash2 size={17} /></button></article>)}{!files.length && <p className="empty-mini">لم تضف ملفاتاً بعد.</p>}</div></section></div>;
}

function CodesPanel({ files, codes, onChanged }: { files: AdminFile[]; codes: AdminCode[]; onChanged: () => Promise<void> }) {
  const [scope, setScope] = useState<"file" | "grade9">("file");
  const [fileId, setFileId] = useState(files[0]?.id || "");
  const [maxUses, setMaxUses] = useState(1);
  const [customCode, setCustomCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [revealedCode, setRevealedCode] = useState("");
  const fileName = useMemo(() => new Map(files.map((file) => [file.id, file.title])), [files]);
  useEffect(() => { if (!fileId && files[0]) setFileId(files[0].id); }, [files, fileId]);
  async function submit(event: React.FormEvent) { event.preventDefault(); if (scope === "file" && !fileId) { toast.error("اختر ملفاً للكود المفرد."); return; } setPending(true); const { data, error } = await supabase.rpc("admin_generate_ninth_access_code", { p_scope: scope, p_file_id: scope === "file" ? fileId : null, p_max_uses: maxUses, p_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null, p_note: note, p_custom_code: customCode || null }); if (error) toast.error("تعذر إنشاء الكود. قد يكون الكود المخصص مستخدماً بالفعل."); else { const generated = Array.isArray(data) ? data[0] : data; setRevealedCode(generated?.code || ""); toast.success("تم إنشاء الكود. انسخه الآن لأنه لا يُعرض مجدداً."); setCustomCode(""); setNote(""); setExpiresAt(""); await onChanged(); } setPending(false); }
  async function toggleCode(code: AdminCode) { const { error } = await supabase.rpc("admin_set_ninth_code_active", { p_id: code.id, p_is_active: !code.is_active }); if (error) toast.error("تعذر تعديل حالة الكود."); else { toast.success(code.is_active ? "تم تعطيل الكود." : "تم تفعيل الكود."); await onChanged(); } }
  return <><div className="admin-two-columns"><form className="editor-card" onSubmit={submit}><PanelTitle icon={KeyRound} title="إنشاء كود وصول" copy="تحفظ قاعدة البيانات تجزئة الكود فقط، ويظهر النص مرة واحدة بعد الإنشاء." /><Field label="نوع الوصول"><select value={scope} onChange={(e) => setScope(e.target.value as "file" | "grade9") }><option value="file">كود لملف واحد</option><option value="grade9">كود شامل لجميع ملفات التاسع</option></select></Field>{scope === "file" && <Field label="الملف المستهدف"><select value={fileId} onChange={(e) => setFileId(e.target.value)}>{files.map((file) => <option key={file.id} value={file.id}>{file.title}</option>)}</select></Field>}<div className="form-row"><Field label="عدد مرات الاستخدام"><input type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} /></Field><Field label="تاريخ انتهاء اختياري"><input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></Field></div><Field label="كود مخصص اختياري"><input value={customCode} onChange={(e) => setCustomCode(e.target.value.toUpperCase())} placeholder="مثال: AQB9-MATH-001" /></Field><Field label="ملاحظة داخلية"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اسم الطالب أو سبب الإنشاء" /></Field><button className="primary-button full-button" disabled={pending}>{pending ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />} إنشاء الكود</button></form><section className="data-card"><PanelTitle icon={UsersRound} title="سجل الأكواد" copy="لا يُعرض نص الكود بعد إنشائه." /><div className="code-list">{codes.map((code) => <article className="code-row" key={code.id}><span className={code.scope === "grade9" ? "code-scope code-scope--global" : "code-scope"}>{code.scope === "grade9" ? "شامل" : "ملف"}</span><div><strong>{code.scope === "grade9" ? "جميع ملفات الصف التاسع" : fileName.get(code.file_id || "") || "ملف محذوف"}</strong><small>{code.uses_count} / {code.max_uses} استخدام · {code.expires_at ? `ينتهي ${new Date(code.expires_at).toLocaleDateString("ar-SA")}` : "دون انتهاء"}</small></div><button className={code.is_active ? "code-state code-state--active" : "code-state"} onClick={() => void toggleCode(code)}>{code.is_active ? <><Check size={15} /> فعّال</> : "معطل"}</button></article>)}{!codes.length && <p className="empty-mini">لا توجد أكواد منشأة بعد.</p>}</div></section></div>{revealedCode && <div className="modal-backdrop"><section className="reveal-code-dialog" role="dialog" aria-modal="true"><p className="eyebrow">انسخ الكود الآن</p><h2>تم إنشاء كود الوصول</h2><div className="revealed-code">{revealedCode}</div><p>يحفظ النظام التجزئة فقط، لذلك لن تتمكن من إظهار النص نفسه مرة أخرى من اللوحة.</p><button className="primary-button full-button" onClick={() => { navigator.clipboard?.writeText(revealedCode); toast.success("تم النسخ."); setRevealedCode(""); }}>نسخ وإغلاق</button></section></div>}</>;
}

function SettingsPanel({ settings, onChanged }: { settings: SiteSettings; onChanged: () => Promise<void> }) {
  const [form, setForm] = useState({ global_code_price: Number(settings.global_code_price), whatsapp_phone: settings.whatsapp_phone });
  const [pending, setPending] = useState(false);
  useEffect(() => setForm({ global_code_price: Number(settings.global_code_price), whatsapp_phone: settings.whatsapp_phone }), [settings]);
  async function submit(event: React.FormEvent) { event.preventDefault(); setPending(true); const { error } = await supabase.rpc("admin_update_ninth_settings", { p_global_code_price: Number(form.global_code_price), p_whatsapp_phone: form.whatsapp_phone }); if (error) toast.error("تعذر حفظ الإعدادات."); else { toast.success("تم حفظ الإعدادات العامة."); await onChanged(); } setPending(false); }
  return <div className="settings-wrap"><form className="editor-card" onSubmit={submit}><PanelTitle icon={Settings2} title="إعدادات الوصول الشامل" copy="تظهر هذه البيانات في واجهة الطالب عند إدخال كود شامل أو عدم وجود رقم مخصص للملف." /><Field label="سعر الكود الشامل"><input type="number" min="0" step="0.01" value={form.global_code_price} onChange={(e) => setForm({ ...form, global_code_price: Number(e.target.value) })} /></Field><Field label="رقم واتساب الافتراضي"><input value={form.whatsapp_phone} onChange={(e) => setForm({ ...form, whatsapp_phone: e.target.value })} placeholder="9639XXXXXXXX" /></Field><button className="primary-button full-button" disabled={pending}>{pending ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />} حفظ الإعدادات</button></form><aside className="settings-note"><CircleDollarSign size={27} /><h3>كيف تستخدم الأسعار؟</h3><p>السعر معلومات ظاهرة للطالب وليست بوابة دفع. ينسّق الطالب الشراء عبر الرقم المخصص للملف أو رقم واتساب العام، ثم تمنحه كوداً من لوحة الأكواد.</p></aside></div>;
}

function PanelTitle({ icon: Icon, title, copy }: { icon: typeof Plus; title: string; copy: string }) { return <header className="panel-title"><span><Icon size={20} /></span><div><h2>{title}</h2><p>{copy}</p></div></header>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field"><span>{label}</span><span className="color-input"><input type="color" value={value} onChange={(e) => onChange(e.target.value)} /><code>{value}</code></span></label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="toggle-field"><span>{label}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><i /></label>; }
