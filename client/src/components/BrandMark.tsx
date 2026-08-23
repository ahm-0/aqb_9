/** تصميم مكتبة الطالب المميزة: العلامة المرئية هي كتاب/مسار تعلّم باللون النيلي، وليست نصاً افتراضياً. */
import { assetUrl } from "@/lib/assets";

type Props = { className?: string; compact?: boolean };

export function BrandMark({ className = "", compact = false }: Props) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark--compact" : ""} ${className}`} aria-label="مكتبة الصف التاسع">
      <img src={assetUrl("aqb9-logo.png")} alt="رمز مكتبة الصف التاسع" />
      {!compact && (
        <span>
          <strong>مكتبة التاسع</strong>
          <small>القسم المميز</small>
        </span>
      )}
    </div>
  );
}
