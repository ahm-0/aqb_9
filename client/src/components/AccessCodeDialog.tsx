/** تصميم مكتبة الطالب المميزة: نافذة الوصول تركز على كود واحد وخطوة واحدة بدون تشتيت. */
import { KeyRound, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { assetUrl } from "@/lib/assets";

type Props = {
  open: boolean;
  targetLabel: string;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
};

export function AccessCodeDialog({ open, targetLabel, onClose, onVerify }: Props) {
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setCode("");
      setError("");
      setPending(false);
    }
  }, [open]);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      setError("أدخل كود الوصول أولاً.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await onVerify(code.trim());
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر التحقق من الكود.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="access-dialog" style={{ backgroundImage: `url(${assetUrl("aqb9-pdf-viewer-bg.png")})` }} role="dialog" aria-modal="true" aria-labelledby="access-code-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button dialog-close" onClick={onClose} aria-label="إغلاق نافذة الكود">
          <X size={20} />
        </button>
        <div className="dialog-emblem"><KeyRound size={24} /></div>
        <p className="eyebrow">وصول مميز</p>
        <h2 id="access-code-title">أدخل كودك لفتح {targetLabel}</h2>
        <p className="dialog-copy">يتم التحقق من الكود بأمان، ثم يفتح الملف بالرابط المباشر داخل العارض المتاح.</p>
        <form onSubmit={submit}>
          <label htmlFor="access-code">كود الوصول</label>
          <input id="access-code" autoFocus value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="AQB9-XXXXXXXXXX" autoComplete="off" />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button full-button" type="submit" disabled={pending}>
            {pending ? <><LoaderCircle className="spin" size={18} /> جارٍ التحقق…</> : "فتح المحتوى"}
          </button>
        </form>
      </section>
    </div>
  );
}
