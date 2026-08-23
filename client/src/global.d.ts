/** تصميم مكتبة الطالب المميزة: تعريفات جسر أندرويد الاختيارية دون تعطيل المتصفح العادي. */
export {};

declare global {
  interface Window {
    AppBridge?: {
      removeSplashScreen?: () => void;
      openExternalUrl?: (url: string) => void;
      openNativePdfViewer?: (url: string, title: string, protectedFile: boolean) => void;
    };
    Android?: {
      openNativePdfViewer?: (url: string, title: string, protectedFile: boolean) => void;
    };
  }
}
