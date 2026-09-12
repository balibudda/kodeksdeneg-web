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
