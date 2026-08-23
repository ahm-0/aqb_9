/** تصميم مكتبة الطالب المميزة: رحلة هاتفية أولاً من المادة إلى الملف ثم كود الوصول والعارض. */
import { ArrowRight, BadgeDollarSign, ChevronLeft, FileText, GraduationCap, KeyRound, LoaderCircle, MessageCircle, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AccessCodeDialog } from "@/components/AccessCodeDialog";
import { BrandMark } from "@/components/BrandMark";
import { SubjectIcon } from "@/components/SubjectIcon";
import { assetUrl } from "@/lib/assets";
import { openPdfInPreferredViewer } from "@/lib/drive";
import { supabase } from "@/lib/supabase";
import type { SiteSettings, StudyFile, Subject } from "@/lib/types";

type View = "subjects" | "files";
type AccessTarget = StudyFile | "grade9" | null;
type RedeemedFile = { id: string; title: string; drive_url: string };

const DEFAULT_SETTINGS: SiteSettings = { global_code_price: 0, whatsapp_phone: "" };
const ACCESS_CACHE_KEY = "aqb9-direct-file-access";

function formatPrice(value: number | string) {
  const price = Number(value || 0);
  return price > 0 ? `${price.toLocaleString("ar-SA")} $` : "مجاني";
}

function normalizePhone(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}

function readAccessCache() {
  try {
    return JSON.parse(localStorage.getItem(ACCESS_CACHE_KEY) || "{}") as Record<string, RedeemedFile>;
  } catch {
    return {} as Record<string, RedeemedFile>;
  }
}

function saveAccessCache(values: Record<string, RedeemedFile>) {
  localStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify(values));
}

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [files, setFiles] = useState<StudyFile[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [view, setView] = useState<View>("subjects");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [accessTarget, setAccessTarget] = useState<AccessTarget>(null);
  const [accessCache, setAccessCache] = useState<Record<string, RedeemedFile>>(() => readAccessCache());

  const globalPrice = useMemo(() => formatPrice(settings.global_code_price), [settings.global_code_price]);

  useEffect(() => {
    async function loadLanding() {
      setLoading(true);
      const [subjectsResult, settingsResult] = await Promise.all([
        supabase.rpc("list_ninth_subjects"),
        supabase.rpc("get_ninth_settings"),
      ]);

      if (subjectsResult.error) toast.error("تعذر تحميل المواد حالياً.");
      else setSubjects((subjectsResult.data || []) as Subject[]);

      if (!settingsResult.error && settingsResult.data?.[0]) {
        setSettings(settingsResult.data[0] as SiteSettings);
      }

      setLoading(false);
      window.setTimeout(() => window.AppBridge?.removeSplashScreen?.(), 100);
    }
    void loadLanding();
  }, []);

  async function openSubject(subject: Subject) {
    setSelectedSubject(subject);
    setView("files");
    setFilesLoading(true);
    const { data, error } = await supabase.rpc("list_ninth_files", { p_subject_id: subject.id });
    if (error) {
      toast.error("تعذر تحميل ملفات هذه المادة.");
      setFiles([]);
    } else {
      setFiles((data || []) as StudyFile[]);
    }
    setFilesLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToSubjects() {
    setView("subjects");
    setSelectedSubject(null);
    setFiles([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function contactForFile(file: StudyFile) {
    const phone = normalizePhone(file.whatsapp_phone || settings.whatsapp_phone);
    if (!phone) {
      toast.message("لم يُضف رقم تواصل لهذه المادة بعد.");
      return;
    }
    const message = encodeURIComponent(`مرحباً، أرغب بالحصول على ملف «${file.title}» للصف التاسع.`);
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener,noreferrer");
  }

  function requestAccess(file: StudyFile) {
    const cached = accessCache[file.id];
    if (cached?.drive_url) {
      openPdfInPreferredViewer(cached.drive_url, cached.title);
      return;
    }
    setAccessTarget(file);
  }

  async function verifyCode(code: string) {
    const { data, error } = await supabase.rpc("redeem_ninth_access_code", { p_code: code });
    if (error) throw new Error("الكود غير صحيح أو انتهت صلاحيته أو استُخدم بالكامل.");
    const payload = data as { scope?: "file" | "grade9"; files?: RedeemedFile[] } | null;
    const redeemed = payload?.files || [];
    if (!redeemed.length) throw new Error("لا توجد ملفات منشورة متاحة لهذا الكود.");

    const nextCache = { ...accessCache };
    redeemed.forEach((file) => { nextCache[file.id] = file; });
    setAccessCache(nextCache);
    saveAccessCache(nextCache);

    if (accessTarget && accessTarget !== "grade9") {
      const matching = redeemed.find((file) => file.id === accessTarget.id);
      if (matching) {
        toast.success("تم تفعيل الكود وفتح الملف.");
        openPdfInPreferredViewer(matching.drive_url, matching.title);
      } else {
        toast.success(`تم تفعيل الوصول إلى ${redeemed.length} ملفاً.`);
      }
    } else {
      toast.success(`تم تفعيل الوصول الشامل إلى ${redeemed.length} ملفاً.`);
    }
  }

  const targetLabel = accessTarget === "grade9" ? "جميع ملفات الصف التاسع" : accessTarget?.title || "الملف";

  return (
    <main className="student-library" dir="rtl">
      <header className="library-header">
        <BrandMark />
        <div className="header-trust"><ShieldCheck size={17} /> <span>وصول منظّم وآمن</span></div>
      </header>

      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={15} /> القسم المميز للصف التاسع</p>
          <h1>ملفاتك الدراسية،<br /><em>بترتيب يختصر عليك الطريق.</em></h1>
          <p>اختر المادة، تصفح الملفات المتاحة، ثم استخدم كودك للوصول إلى المحتوى مباشرة داخل العارض.</p>
          <button className="hero-code-button" onClick={() => setAccessTarget("grade9")}>
            <KeyRound size={18} /> لدي كود شامل <span>{globalPrice}</span>
          </button>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <img src={assetUrl("aqb9-hero-study.png")} alt="" />
          <div className="hero-stat hero-stat--top"><GraduationCap size={20} /><span>الصف التاسع</span></div>
          <div className="hero-stat hero-stat--bottom"><FileText size={18} /><span>ملفات منتقاة</span></div>
        </div>
      </section>

      <section className="content-shell" aria-live="polite">
        {view === "subjects" ? (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">ابدأ من المادة</p>
                <h2>اختر ما تريد مراجعته اليوم</h2>
              </div>
              <div className="heading-counter">{subjects.length} مادة</div>
            </div>
            {loading ? (
              <div className="loading-area"><LoaderCircle className="spin" size={26} /> نرتّب المواد لك…</div>
            ) : subjects.length ? (
              <div className="subject-list">
                {subjects.map((subject, index) => (
                  <button key={subject.id} className="subject-card" style={{ "--subject-from": subject.color_from, "--subject-to": subject.color_to, animationDelay: `${index * 55}ms` } as React.CSSProperties} onClick={() => void openSubject(subject)}>
                    <span className="subject-icon"><SubjectIcon iconKey={subject.icon_key} /></span>
                    <span className="subject-content"><strong>{subject.name}</strong><small>{subject.description || "ملفات ومراجعات مميزة للمادة"}</small></span>
                    <span className="subject-arrow"><ChevronLeft size={23} /></span>
                  </button>
                ))}
              </div>
            ) : (
              <LibraryPreparingState />
            )}
          </>
        ) : (
          <>
            <button className="back-link" onClick={backToSubjects}><ArrowRight size={18} /> جميع المواد</button>
            <div className="files-title-row">
              <div className="selected-subject-badge" style={{ background: `linear-gradient(135deg, ${selectedSubject?.color_from}, ${selectedSubject?.color_to})` }}><SubjectIcon iconKey={selectedSubject?.icon_key || "book-open"} size={22} /></div>
              <div><p className="eyebrow">ملفات المادة</p><h2>{selectedSubject?.name}</h2></div>
            </div>
            {filesLoading ? (
              <div className="loading-area"><LoaderCircle className="spin" size={26} /> نجهز الملفات المميزة…</div>
            ) : files.length ? (
              <div className="file-list">
                {files.map((file, index) => {
                  const unlocked = Boolean(accessCache[file.id]);
                  return (
                    <article key={file.id} className="file-card" style={{ animationDelay: `${index * 60}ms` }}>
                      <div className="file-document"><FileText size={30} /><span>PDF</span></div>
                      <div className="file-main">
                        <div className="file-title-line"><h3>{file.title}</h3><span className="price-tag"><BadgeDollarSign size={15} /> {formatPrice(file.price)}</span></div>
                        {file.teacher_name && <p className="teacher-line">إعداد: {file.teacher_name}</p>}
                        <p className="file-description">{file.description || "ملف تعليمي منسق للمراجعة والتدريب."}</p>
                        <div className="file-actions">
                          <button className={`primary-button ${unlocked ? "unlocked-button" : ""}`} onClick={() => requestAccess(file)}>
                            {unlocked ? <><FileText size={17} /> فتح في العارض</> : <><KeyRound size={17} /> فتح باستخدام كود</>}
                          </button>
                          <button className="secondary-button" onClick={() => contactForFile(file)}><MessageCircle size={17} /> تواصل للشراء</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="لا توجد ملفات منشورة" copy="عد لاحقاً أو تواصل مع المشرف لمعرفة الملفات القادمة." />
            )}
          </>
        )}
      </section>

      <footer className="library-footer"><BrandMark compact /><span>مكتبة الصف التاسع • محتوى منظم للطالب</span><button onClick={() => window.location.reload()} aria-label="تحديث البيانات"><RefreshCw size={16} /></button></footer>
      <AccessCodeDialog open={Boolean(accessTarget)} targetLabel={targetLabel} onClose={() => setAccessTarget(null)} onVerify={verifyCode} />
    </main>
  );
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><FileText size={30} /><h3>{title}</h3><p>{copy}</p></div>;
}

function LibraryPreparingState() {
  const seals = [
    { icon: "calculator", label: "مسار مواد" },
    { icon: "atom", label: "محتوى منظم" },
    { icon: "book-open", label: "وصول بالكود" },
  ];
  return <section className="library-preparing-state"><div className="preparing-seals">{seals.map((seal, index) => <div className={`preparing-seal preparing-seal--${index + 1}`} key={seal.label}><SubjectIcon iconKey={seal.icon} size={22} /><span>{seal.label}</span></div>)}</div><div className="preparing-copy"><span className="preparing-stamp">المكتبة قيد التجهيز</span><h3>نرتب رفوف المواد المميزة للصف التاسع.</h3><p>ستظهر هنا بطاقات المواد وألوانها، ثم الملفات وأسعارها وأكواد الوصول الخاصة بها فور نشرها من لوحة المشرف.</p></div><div className="paper-grid" aria-hidden="true" /></section>;
}
