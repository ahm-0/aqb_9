/** تصميم مكتبة الطالب المميزة: يُحوّل Drive قبل العارض حتى تستلم أندرويد رابط التنزيل المباشر. */
export function toDirectDriveUrl(rawUrl: string): string {
  const input = rawUrl.trim();
  if (!input) return input;

  try {
    const url = new URL(input);
    const pathId = url.pathname.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([^/?#]+)/)?.[1];
    const queryId = url.searchParams.get("id");
    const id = pathId || queryId;

    if (url.hostname.endsWith("drive.google.com") && id) {
      return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}&confirm=t`;
    }
  } catch {
    return input;
  }

  return input;
}

export function openPdfInPreferredViewer(rawUrl: string, title: string) {
  const directUrl = toDirectDriveUrl(rawUrl);
  const android = window.Android;
  const appBridge = window.AppBridge;

  if (android?.openNativePdfViewer) {
    android.openNativePdfViewer(directUrl, title, true);
    return;
  }

  if (appBridge?.openNativePdfViewer) {
    appBridge.openNativePdfViewer(directUrl, title, true);
    return;
  }

  if (appBridge?.openExternalUrl) {
    appBridge.openExternalUrl(directUrl);
    return;
  }

  window.open(directUrl, "_blank", "noopener,noreferrer");
}
