// Runs without React so a missing/stale module never leaves an empty root.
(function () {
  function showStartupFailure() {
    const fallback = document.getElementById('startup-fallback');
    if (!fallback) return; // React has already rendered the application.
    fallback.setAttribute('role', 'alert');
    fallback.querySelector('h1').textContent = 'UMBO couldn’t finish loading.';
    fallback.querySelector('[data-startup-message]').textContent = 'The application files could not load. Check that the local server is running, then reload this page.';
    fallback.querySelector('[data-startup-actions]').hidden = false;
  }
  window.addEventListener('error', function (event) {
    if (event.target instanceof HTMLScriptElement && event.target.type === 'module') showStartupFailure();
  }, true);
  window.addEventListener('error', showStartupFailure);
  document.addEventListener('DOMContentLoaded', function () {
    const reload = document.querySelector('[data-startup-reload]');
    if (reload) reload.addEventListener('click', function () { window.location.reload(); });
  });
})();
