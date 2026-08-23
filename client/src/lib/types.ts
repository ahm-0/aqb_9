/** تصميم مكتبة الطالب المميزة: نماذج الواجهة تتطابق مع دوال RPC الآمنة فقط. */
export type Subject = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_key: string;
  color_from: string;
  color_to: string;
  sort_order: number;
};

export type StudyFile = {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  cover_url: string | null;
  price: number | string;
  whatsapp_phone: string;
  teacher_name: string;
  sort_order: number;
};

export type SiteSettings = {
  global_code_price: number | string;
  whatsapp_phone: string;
};

export type AdminSubject = Subject & {
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminFile = StudyFile & {
  drive_url: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminCode = {
  id: string;
  scope: "file" | "grade9";
  file_id: string | null;
  is_active: boolean;
  max_uses: number;
  uses_count: number;
  expires_at: string | null;
  note: string;
  created_at: string;
};
