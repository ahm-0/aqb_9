/** تصميم مكتبة الطالب المميزة: الأصول تحفظ داخل public للنشر المستقل على GitHub Pages. */
export function assetUrl(filename: string) {
  return `${import.meta.env.BASE_URL}assets/${filename}`;
}
