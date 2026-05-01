;(function () {
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
  ;['pushState', 'replaceState'].forEach(function (m) {
    var orig = history[m]
    history[m] = function () {
      var result = orig.apply(this, arguments)
      check()
      return result
    }
  })
})()
