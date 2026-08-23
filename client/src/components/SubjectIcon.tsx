/** تصميم مكتبة الطالب المميزة: رموز المواد بسيطة وواضحة لتدعم تمييز البطاقات الملونة. */
import { Atom, BookOpen, BookText, Calculator, FlaskConical, Globe2, Leaf, Lightbulb, Map, Microscope, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  math: Calculator,
  calculator: Calculator,
  physics: Atom,
  atom: Atom,
  chemistry: FlaskConical,
  flask: FlaskConical,
  biology: Leaf,
  leaf: Leaf,
  arabic: BookText,
  english: Globe2,
  history: BookOpen,
  geography: Map,
  philosophy: Lightbulb,
  microscope: Microscope,
  "book-open": BookOpen,
};

export function SubjectIcon({ iconKey, size = 26 }: { iconKey: string; size?: number }) {
  const Icon = icons[iconKey.toLowerCase()] || BookOpen;
  return <Icon size={size} strokeWidth={2.1} aria-hidden="true" />;
}
