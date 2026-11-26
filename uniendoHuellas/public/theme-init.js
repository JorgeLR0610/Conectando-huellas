// Runs before hydration; the saved preference takes precedence over the OS.
(function () {
  var theme;
  try { theme = localStorage.getItem('huellas_theme'); } catch {}
  document.documentElement.dataset.theme = theme === 'dark' || (
    theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches
  ) ? 'dark' : 'light';
})();
