// Мелкие улучшения: меню закрывается по клику вне и по Esc.
(function () {
  var menu = document.getElementById('menu')
  if (menu) {
    document.addEventListener('click', function (e) {
      if (menu.open && !menu.contains(e.target)) menu.open = false
    })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.open) menu.open = false
    })
  }
})()

// Навигация внутри Android-приложения (Capacitor): тот же баг, что был у
// kodeksdetstva (см. его CLAUDE.md) — локальный сервер Capacitor умеет
// гарантированно отдавать только "/" или путь с расширением файла, а у нас
// многостраничный сайт с путями вида /раздел/тема/ без расширения (для них
// сервер иначе отвечает net::ERR_CONNECTION_REFUSED). Дозаписываем
// /index.html на конец внутренних ссылок, только внутри самого приложения.
;(function () {
  var isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
  if (!isNativeApp) return
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a')
    if (!a) return
    var href = a.getAttribute('href')
    if (!href || href === '/' || href.charAt(0) !== '/') return
    if (a.target === '_blank' || /^(mailto|tel):/i.test(href)) return
    if (/\.[a-z0-9]+(?:[?#]|$)/i.test(href)) return // уже есть расширение — сервер отдаст сам
    e.preventDefault()
    location.href = href + (href.charAt(href.length - 1) === '/' ? 'index.html' : '/index.html')
  })
})()

// Бейдж версии в меню — только внутри Android-приложения. window.Capacitor
// есть только там, в обычном браузере блок остаётся hidden.
;(function () {
  var cap = window.Capacitor
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return
  var box = document.getElementById('app-version-box')
  var numEl = document.getElementById('app-version-num')
  var updBox = document.getElementById('app-update-box')
  if (!box || !numEl) return
  var appInfo = cap.Plugins && cap.Plugins.App && cap.Plugins.App.getInfo
  if (!appInfo) return
  cap.Plugins.App.getInfo().then(function (info) {
    numEl.textContent = 'v' + info.version + ' (' + info.build + ')'
    box.hidden = false
    // Сверяем с /app-version.json на живом сайте — он всегда актуален (в
    // отличие от контента внутри самого APK, «замороженного» на дату сборки).
    fetch('https://kodeksdeneg.ru/app-version.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (latest) {
        if (!latest) return
        var myBuild = parseInt(info.build, 10)
        if (latest.versionCode > myBuild && updBox) {
          updBox.hidden = false
          var link = document.getElementById('app-update-link')
          if (link && latest.downloadUrl) link.href = latest.downloadUrl
        }
      })
      .catch(function () {}) // офлайн — тихо не показываем обновление
  }).catch(function () {})
})()
