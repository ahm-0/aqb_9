/* توافق WebView: تتبع الصفحة تلقائياً window.__APP_THEME__ وحدث theme-change من التطبيق الأصلي. */
(() => {
  const root = document.documentElement;
  const colorMeta = document.querySelector('meta[name="theme-color"]');
  const normalize = (value) => String(value || '').toLowerCase() === 'dark' ? 'dark' : 'light';
  const applyTheme = (value) => {
    const theme = normalize(value);
    if (root.dataset.theme !== theme) root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme !== 'dark');
    document.body.classList.toggle('reference-night', theme === 'dark');
    if (colorMeta) colorMeta.content = theme === 'dark' ? '#050506' : '#f2f2f7';
  };
  const initialTheme = () => window.__APP_THEME__ || root.dataset.theme || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initialTheme());
  window.addEventListener('theme-change', (event) => applyTheme(event.detail?.theme));
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'THEME_CHANGE') applyTheme(event.data.theme);
  });
  new MutationObserver(() => applyTheme(root.dataset.theme || initialTheme()))
    .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
})();
