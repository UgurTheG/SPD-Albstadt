// Early, render-blocking bootstrap. Kept as an external same-origin script so
// the Content-Security-Policy can forbid inline scripts entirely.
;(function () {
  // ── Dark-mode FOUC prevention (runs synchronously before paint) ────────────
  try {
    var s = localStorage.getItem('spd-darkmode')
    if (s === 'true' || (s === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    }
  } catch (e) {
    /* storage unavailable — fall back to light */
  }

  // ── Elfsight branding removal (only active on /aktuelles where the widget loads)
  var observer
  function removeElfsightUI() {
    document
      .querySelectorAll(
        'a[href*="elfsight.com"], .eapps-widget-toolbar, [class*="eapps-link"], [class*="eapps-panel"]',
      )
      .forEach(function (el) {
        el.remove()
      })
  }
  function start() {
    if (observer) return
    observer = new MutationObserver(removeElfsightUI)
    observer.observe(document.documentElement, { childList: true, subtree: true })
    removeElfsightUI()
  }
  function stop() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }
  function check() {
    if (location.pathname === '/aktuelles') start()
    else stop()
  }
  check()
  window.addEventListener('popstate', check)
  // Patch pushState/replaceState for SPA navigation detection
  ;['pushState', 'replaceState'].forEach(function (m) {
    var orig = history[m]
    history[m] = function () {
      var result = orig.apply(this, arguments)
      check()
      return result
    }
  })
})()
